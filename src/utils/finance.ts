import { Account, FinancialSummary, Recurrence, Transaction, Transfer } from '../types';
import { isDateBefore, isDateBetween, todayString } from './date';
import { generateRecurrenceDates } from './recurrenceEngine';

/**
 * Converte valor numérico para centavos inteiros para evitar imprecisões de ponto flutuante.
 */
export function toCents(amount: number): number {
  return Math.round(amount * 100);
}

/**
 * Converte centavos inteiros de volta para float com 2 casas decimais.
 */
export function fromCents(cents: number): number {
  return Number((cents / 100).toFixed(2));
}

/**
 * Formata um valor numérico para a moeda brasileira: R$ 1.234,56
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

/**
 * Converte entrada do usuário (com vírgulas, pontos ou números limpos) para número válido
 */
export function parseCurrencyInput(value: string | number): number {
  if (typeof value === 'number') return isNaN(value) ? 0 : value;
  if (!value) return 0;

  // Remove qualquer caractere que não seja dígito, vírgula ou ponto
  const clean = value.replace(/[^\d.,-]/g, '').trim();
  if (!clean) return 0;

  // Se tiver vírgula e ponto, ex: 1.234,56 -> remove ponto e troca vírgula por ponto
  if (clean.includes('.') && clean.includes(',')) {
    const standardized = clean.replace(/\./g, '').replace(',', '.');
    const num = parseFloat(standardized);
    return isNaN(num) ? 0 : num;
  }

  // Se tiver apenas vírgula: 1234,56 -> 1234.56
  if (clean.includes(',')) {
    const standardized = clean.replace(',', '.');
    const num = parseFloat(standardized);
    return isNaN(num) ? 0 : num;
  }

  const num = parseFloat(clean);
  return isNaN(num) ? 0 : num;
}

/**
 * Verifica se um lançamento está atrasado em relação a uma data de referência (hoje).
 * Um lançamento só é atrasado se estiver pendente e sua data prevista for anterior a hoje.
 */
export function isOverdue(transaction: Transaction, today: string = todayString()): boolean {
  if (transaction.status !== 'pending') return false;
  return isDateBefore(transaction.expected_date, today);
}

/**
 * Calcula o saldo atual de uma conta específica:
 * Saldo inicial da conta + entradas efetivamente recebidas a partir da data de referência
 * - despesas efetivamente pagas a partir da data de referência
 * + transferências de entrada - transferências de saída.
 */
export function calculateAccountBalance(
  account: Account,
  transactions: Transaction[],
  transfers: Transfer[] = []
): number {
  let cents = toCents(account.initial_balance);
  const refDate = account.initial_balance_date;

  // Transações efetivadas da conta
  for (const t of transactions) {
    if (t.account_id !== account.id) continue;
    if (t.status !== 'completed') continue; // Apenas realizadas
    if (!t.effective_date) continue;
    // Movimentações efetivadas a partir da data de referência alteram o saldo
    if (t.effective_date < refDate) continue;

    const tCents = toCents(t.amount);
    if (t.type === 'income') {
      cents += tCents;
    } else if (t.type === 'expense') {
      cents -= tCents;
    }
  }

  // Transferências da conta
  for (const tr of transfers) {
    if (tr.transfer_date < refDate) continue;
    const trCents = toCents(tr.amount);
    if (tr.destination_account_id === account.id) {
      cents += trCents;
    }
    if (tr.origin_account_id === account.id) {
      cents -= trCents;
    }
  }

  return fromCents(cents);
}

/**
 * Calcula o saldo consolidado de todas as contas ativas (ou de todas as contas passadas).
 */
export function calculateTotalCurrentBalance(
  accounts: Account[],
  transactions: Transaction[],
  transfers: Transfer[] = [],
  includeArchived: boolean = false
): number {
  let totalCents = 0;
  for (const acc of accounts) {
    if (!includeArchived && acc.is_archived) continue;
    totalCents += toCents(calculateAccountBalance(acc, transactions, transfers));
  }
  return fromCents(totalCents);
}

/**
 * Calcula o Resultado Realizado do período (usando data efetiva):
 * Entradas recebidas no período menos despesas pagas no período.
 */
export function calculateActualResult(
  transactions: Transaction[],
  startDate: string,
  endDate: string
): { totalReceived: number; totalPaid: number; actualResult: number } {
  let receivedCents = 0;
  let paidCents = 0;

  for (const t of transactions) {
    if (t.status !== 'completed') continue;
    if (!t.effective_date) continue;
    if (!isDateBetween(t.effective_date, startDate, endDate)) continue;

    const tCents = toCents(t.amount);
    if (t.type === 'income') {
      receivedCents += tCents;
    } else if (t.type === 'expense') {
      paidCents += tCents;
    }
  }

  return {
    totalReceived: fromCents(receivedCents),
    totalPaid: fromCents(paidCents),
    actualResult: fromCents(receivedCents - paidCents)
  };
}

/**
 * Calcula o Resultado Previsto do período (usando data prevista):
 * Entradas não canceladas menos despesas não canceladas com data prevista no período.
 * (Inclui tanto pendentes quanto já efetivadas nessa agenda).
 */
export function calculateExpectedResult(
  transactions: Transaction[],
  startDate: string,
  endDate: string
): { expectedIncome: number; expectedExpense: number; expectedResult: number } {
  let incomeCents = 0;
  let expenseCents = 0;

  for (const t of transactions) {
    if (t.status === 'cancelled') continue;
    if (!isDateBetween(t.expected_date, startDate, endDate)) continue;

    const tCents = toCents(t.amount);
    if (t.type === 'income') {
      incomeCents += tCents;
    } else if (t.type === 'expense') {
      expenseCents += tCents;
    }
  }

  return {
    expectedIncome: fromCents(incomeCents),
    expectedExpense: fromCents(expenseCents),
    expectedResult: fromCents(incomeCents - expenseCents)
  };
}

/**
 * Calcula o resumo financeiro completo para um período selecionado
 */
export function calculateFinancialSummary(
  accounts: Account[],
  transactions: Transaction[],
  transfers: Transfer[],
  startDate: string,
  endDate: string,
  today: string = todayString()
): FinancialSummary {
  const currentBalance = calculateTotalCurrentBalance(accounts, transactions, transfers);

  const { totalReceived, totalPaid, actualResult } = calculateActualResult(transactions, startDate, endDate);

  let toReceiveCents = 0;
  let toPayCents = 0;
  let overdueCents = 0;
  let overdueCount = 0;

  for (const t of transactions) {
    if (t.status === 'cancelled') continue;

    // Atrasados: pendentes com data prevista anterior a hoje
    if (isOverdue(t, today)) {
      overdueCents += toCents(t.amount);
      overdueCount++;
    }

    // A receber e a pagar no período selecionado (apenas os ainda pendentes)
    if (t.status === 'pending' && isDateBetween(t.expected_date, startDate, endDate)) {
      const tCents = toCents(t.amount);
      if (t.type === 'income') {
        toReceiveCents += tCents;
      } else if (t.type === 'expense') {
        toPayCents += tCents;
      }
    }
  }

  const { expectedResult } = calculateExpectedResult(transactions, startDate, endDate);

  // Projeção futura até o fim do período:
  // Saldo atual + pendências (entradas a receber - despesas a pagar) previstas de hoje até endDate
  // Se houver pendências atrasadas, também consideramos na projeção a partir de hoje
  let projectedCents = toCents(currentBalance);
  let firstNegativeDate: string | undefined = undefined;

  // Ordena transações pendentes futuras a partir de hoje até endDate
  const futurePending = transactions
    .filter(t => t.status === 'pending' && t.expected_date <= endDate)
    .sort((a, b) => a.expected_date.localeCompare(b.expected_date));

  for (const t of futurePending) {
    const tCents = toCents(t.amount);
    if (t.type === 'income') {
      projectedCents += tCents;
    } else if (t.type === 'expense') {
      projectedCents -= tCents;
    }

    if (projectedCents < 0 && !firstNegativeDate && t.expected_date >= today) {
      firstNegativeDate = t.expected_date;
    }
  }

  return {
    currentBalance,
    totalReceived,
    totalPaid,
    actualResult,
    totalToReceive: fromCents(toReceiveCents),
    totalToPay: fromCents(toPayCents),
    overdueAmount: fromCents(overdueCents),
    overdueCount,
    expectedResult,
    projectedBalanceAtEnd: fromCents(projectedCents),
    firstNegativeDate
  };
}

/**
 * Calcula somente entradas que ainda podem cair no período do painel.
 * Recorrências salariais ficam fora deste indicador e ocorrências já materializadas
 * não são somadas duas vezes.
 */
export function calculateUpcomingNonSalaryIncome(
  transactions: Transaction[],
  recurrences: Recurrence[],
  startDate: string,
  endDate: string,
  today: string = todayString()
): number {
  const salaryRecurrenceIds = new Set(
    recurrences.filter(recurrence => Boolean(recurrence.salary_schedule)).map(recurrence => recurrence.id)
  );
  const existingOccurrenceKeys = new Set(
    transactions
      .filter(transaction => transaction.recurrence_id)
      .map(transaction => `${transaction.recurrence_id}:${transaction.expected_date}`)
  );

  let cents = 0;
  for (const transaction of transactions) {
    const isSalary = Boolean(transaction.salary_schedule) ||
      Boolean(transaction.recurrence_id && salaryRecurrenceIds.has(transaction.recurrence_id));
    if (
      transaction.type === 'income' &&
      transaction.status === 'pending' &&
      !isSalary &&
      transaction.expected_date >= today &&
      isDateBetween(transaction.expected_date, startDate, endDate)
    ) {
      cents += toCents(transaction.amount);
    }
  }

  for (const recurrence of recurrences) {
    if (!recurrence.is_active || recurrence.type !== 'income' || recurrence.salary_schedule) continue;
    const dates = generateRecurrenceDates(recurrence, endDate);
    for (const date of dates) {
      if (date < today || !isDateBetween(date, startDate, endDate)) continue;
      if (existingOccurrenceKeys.has(`${recurrence.id}:${date}`)) continue;
      cents += toCents(recurrence.amount);
    }
  }

  return fromCents(cents);
}

const VIRTUAL_RECURRENCE_PREFIX = 'recurrence-preview:';

export function isVirtualRecurrenceTransaction(transaction: Transaction): boolean {
  return transaction.id.startsWith(VIRTUAL_RECURRENCE_PREFIX);
}

/** Monta as despesas pendentes do período, incluindo recorrências ainda não materializadas. */
export function buildUpcomingExpenseProjection(
  transactions: Transaction[],
  recurrences: Recurrence[],
  startDate: string,
  endDate: string,
  today: string = todayString()
): Transaction[] {
  const existingOccurrenceKeys = new Set(
    transactions
      .filter(transaction => transaction.recurrence_id)
      .map(transaction => `${transaction.recurrence_id}:${transaction.expected_date}`)
  );
  const projected = transactions.filter(transaction =>
    transaction.type === 'expense' &&
    transaction.status === 'pending' &&
    isDateBetween(transaction.expected_date, startDate, endDate)
  );

  for (const recurrence of recurrences) {
    if (!recurrence.is_active || recurrence.type !== 'expense') continue;
    for (const date of generateRecurrenceDates(recurrence, endDate)) {
      if (date < today || !isDateBetween(date, startDate, endDate)) continue;
      if (existingOccurrenceKeys.has(`${recurrence.id}:${date}`)) continue;
      projected.push({
        id: `${VIRTUAL_RECURRENCE_PREFIX}${recurrence.id}:${date}`,
        user_id: recurrence.user_id,
        account_id: recurrence.account_id,
        category_id: recurrence.category_id,
        type: 'expense',
        description: recurrence.description,
        amount: recurrence.amount,
        expected_date: date,
        status: 'pending',
        notes: recurrence.notes,
        recurrence_id: recurrence.id,
        is_recurrent: true,
        created_at: recurrence.created_at,
        updated_at: recurrence.updated_at
      });
    }
  }

  return projected.sort((a, b) => a.expected_date.localeCompare(b.expected_date));
}

/**
 * Compara dois períodos financeiros com proteção contra divisão por zero e bases inválidas.
 */
export function comparePeriods(
  currentVal: number,
  previousVal: number
): { diffAmount: number; percentChange: number | null; label: string } {
  const diffAmount = fromCents(toCents(currentVal) - toCents(previousVal));

  if (previousVal === 0) {
    return {
      diffAmount,
      percentChange: null,
      label: 'Sem base de comparação'
    };
  }

  const change = ((currentVal - previousVal) / Math.abs(previousVal)) * 100;
  const rounded = Number(change.toFixed(1));
  const sign = rounded > 0 ? '+' : '';
  return {
    diffAmount,
    percentChange: rounded,
    label: `${sign}${rounded}% em relação ao período anterior`
  };
}
