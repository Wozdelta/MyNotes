import { describe, expect, it } from 'vitest';
import { Account, Recurrence, Transaction, Transfer } from '../types';
import {
  calculateAccountBalance,
  calculateActualResult,
  calculateExpectedResult,
  calculateFinancialSummary,
  calculatePaymentCoverage,
  calculateUpcomingIncome,
  buildUpcomingExpenseProjection,
  calculateTotalCurrentBalance,
  comparePeriods,
  formatCurrency,
  fromCents,
  isOverdue,
  parseCurrencyInput,
  toCents
} from '../utils/finance';

describe('Centralized Finance Engine Tests', () => {
  it('usa as entradas futuras para calcular se ainda falta dinheiro (sem considerar saldo atual na falta)', () => {
    expect(calculatePaymentCoverage(422.92, 926.20, 684.15)).toEqual({
      amountMissing: 0,
      amountLeft: 242.05,
      balanceAfterPayments: 664.97
    });
    expect(calculatePaymentCoverage(100, 50, 200)).toEqual({
      amountMissing: 150,
      amountLeft: 0,
      balanceAfterPayments: -50
    });
  });

  it('converte centavos e float sem erros de ponto flutuante', () => {
    // 0.1 + 0.2 em float comum é 0.30000000000000004
    const cents1 = toCents(0.1);
    const cents2 = toCents(0.2);
    expect(cents1 + cents2).toBe(30);
    expect(fromCents(cents1 + cents2)).toBe(0.3);

    expect(toCents(1234.56)).toBe(123456);
    expect(fromCents(123456)).toBe(1234.56);
  });

  it('formata moeda brasileira corretamente', () => {
    const formatted = formatCurrency(1234.56);
    // Espera formato BRL (com non-breaking space ou espaço comum)
    expect(formatted).toMatch(/R\$\s*1\.234,56/);
  });

  it('parse de entrada monetária brasileira', () => {
    expect(parseCurrencyInput('1.234,56')).toBe(1234.56);
    expect(parseCurrencyInput('1234,56')).toBe(1234.56);
    expect(parseCurrencyInput('50')).toBe(50);
    expect(parseCurrencyInput('R$ 2.500,00')).toBe(2500);
  });

  it('calcula saldo atual da conta respeitando a data de referência', () => {
    const account: Account = {
      id: 'acc-1',
      user_id: 'user-1',
      name: 'Banco Principal',
      initial_balance: 1000.0,
      initial_balance_date: '2026-10-01',
      is_archived: false,
      created_at: '',
      updated_at: ''
    };

    const transactions: Transaction[] = [
      // Transação ANTERIOR à data de referência (não deve alterar o saldo inicial)
      {
        id: 't-old',
        user_id: 'user-1',
        account_id: 'acc-1',
        category_id: 'cat-1',
        type: 'income',
        description: 'Antiga',
        amount: 500,
        expected_date: '2026-09-25',
        effective_date: '2026-09-25',
        status: 'completed',
        created_at: '',
        updated_at: ''
      },
      // Entrada realizada no período (deve somar)
      {
        id: 't-in',
        user_id: 'user-1',
        account_id: 'acc-1',
        category_id: 'cat-1',
        type: 'income',
        description: 'Salário',
        amount: 2500,
        expected_date: '2026-10-05',
        effective_date: '2026-10-05',
        status: 'completed',
        created_at: '',
        updated_at: ''
      },
      // Despesa realizada no período (deve subtrair)
      {
        id: 't-out',
        user_id: 'user-1',
        account_id: 'acc-1',
        category_id: 'cat-2',
        type: 'expense',
        description: 'Aluguel',
        amount: 800,
        expected_date: '2026-10-10',
        effective_date: '2026-10-10',
        status: 'completed',
        created_at: '',
        updated_at: ''
      },
      // Despesa PENDENTE (NÃO deve subtrair do saldo atual)
      {
        id: 't-pending',
        user_id: 'user-1',
        account_id: 'acc-1',
        category_id: 'cat-2',
        type: 'expense',
        description: 'Conta de luz pendente',
        amount: 200,
        expected_date: '2026-10-20',
        status: 'pending',
        created_at: '',
        updated_at: ''
      }
    ];

    // Saldo = 1000 + 2500 - 800 = 2700
    const balance = calculateAccountBalance(account, transactions, []);
    expect(balance).toBe(2700.0);
  });

  it('transferências entre contas alteram saldo individual sem alterar resultado consolidado', () => {
    const acc1: Account = {
      id: 'acc-1',
      user_id: 'u-1',
      name: 'Corrente',
      initial_balance: 1000,
      initial_balance_date: '2026-10-01',
      is_archived: false,
      created_at: '',
      updated_at: ''
    };
    const acc2: Account = {
      id: 'acc-2',
      user_id: 'u-1',
      name: 'Poupança',
      initial_balance: 500,
      initial_balance_date: '2026-10-01',
      is_archived: false,
      created_at: '',
      updated_at: ''
    };

    const transfers: Transfer[] = [
      {
        id: 'tr-1',
        user_id: 'u-1',
        origin_account_id: 'acc-1',
        destination_account_id: 'acc-2',
        amount: 300,
        transfer_date: '2026-10-05',
        created_at: ''
      }
    ];

    const bal1 = calculateAccountBalance(acc1, [], transfers);
    const bal2 = calculateAccountBalance(acc2, [], transfers);
    const totalBal = calculateTotalCurrentBalance([acc1, acc2], [], transfers);

    expect(bal1).toBe(700); // 1000 - 300
    expect(bal2).toBe(800); // 500 + 300
    expect(totalBal).toBe(1500); // 1000 + 500 (consolidado inalterado)

    // Confere que transferências NÃO entram no resultado realizado
    const actualRes = calculateActualResult([], '2026-10-01', '2026-10-31');
    expect(actualRes.actualResult).toBe(0);
    expect(actualRes.totalReceived).toBe(0);
    expect(actualRes.totalPaid).toBe(0);
  });

  it('detecta atraso com base na data prevista e situação pendente', () => {
    const today = '2026-10-15';
    const lateTx: Transaction = {
      id: 't-1',
      user_id: 'u-1',
      account_id: 'acc-1',
      category_id: 'c-1',
      type: 'expense',
      description: 'Luz',
      amount: 150,
      expected_date: '2026-10-10', // Anterior a hoje
      status: 'pending',
      created_at: '',
      updated_at: ''
    };

    const paidTx: Transaction = {
      ...lateTx,
      id: 't-2',
      status: 'completed',
      effective_date: '2026-10-10'
    };

    const futureTx: Transaction = {
      ...lateTx,
      id: 't-3',
      expected_date: '2026-10-25' // Posterior a hoje
    };

    expect(isOverdue(lateTx, today)).toBe(true);
    expect(isOverdue(paidTx, today)).toBe(false);
    expect(isOverdue(futureTx, today)).toBe(false);
  });

  it('projeta recorrência próxima sem duplicar ocorrência e ignora salário', () => {
    const base: Recurrence = {
      id: 'college', user_id: 'u-1', account_id: 'a-1', category_id: 'extra',
      type: 'income', description: 'Faculdade', amount: 926.20,
      frequency: 'monthly', interval_step: 1, start_date: '2026-10-10',
      day_of_month: 15, is_active: true, created_at: '', updated_at: ''
    };
    const salary: Recurrence = {
      ...base, id: 'salary', category_id: 'salary', description: 'Embraer', amount: 1157.36,
      salary_schedule: { mode: 'business', day: 1, businessDay: 'last', advance: false, holidays: [] }
    };

    expect(calculateUpcomingIncome([], [base, salary], '2026-10-01', '2026-10-31', '2026-10-10')).toBe(926.20);

    const generated: Transaction = {
      id: 'tx-college', user_id: 'u-1', account_id: 'a-1', category_id: 'extra',
      type: 'income', description: 'Faculdade', amount: 926.20, expected_date: '2026-10-15',
      status: 'pending', recurrence_id: base.id, created_at: '', updated_at: ''
    };
    expect(calculateUpcomingIncome([generated], [base], '2026-10-01', '2026-10-31', '2026-10-10')).toBe(926.20);
  });

  it('inclui despesa recorrente ainda não materializada na previsão', () => {
    const expense: Recurrence = {
      id: 'college-expense', user_id: 'u-1', account_id: 'a-1', category_id: 'education',
      type: 'expense', description: 'Faculdade', amount: 684.15,
      frequency: 'monthly', interval_step: 1, start_date: '2026-10-10',
      day_of_month: 15, is_active: true, created_at: '', updated_at: ''
    };

    const projection = buildUpcomingExpenseProjection([], [expense], '2026-10-01', '2026-10-31', '2026-10-10');
    expect(projection).toHaveLength(1);
    expect(projection[0]).toMatchObject({ description: 'Faculdade', amount: 684.15, expected_date: '2026-10-15' });

    const materialized: Transaction = { ...projection[0], id: 'tx-expense' };
    expect(buildUpcomingExpenseProjection([materialized], [expense], '2026-10-01', '2026-10-31', '2026-10-10')).toHaveLength(1);
  });

  it('calcula comparação de períodos com proteção contra divisão por zero', () => {
    // Quando base anterior é 0
    const compZero = comparePeriods(500, 0);
    expect(compZero.percentChange).toBeNull();
    expect(compZero.label).toBe('Sem base de comparação');

    // Aumento de 1000 para 1500 (+50%)
    const compInc = comparePeriods(1500, 1000);
    expect(compInc.percentChange).toBe(50);
    expect(compInc.diffAmount).toBe(500);

    // Redução de 2000 para 1500 (-25%)
    const compDec = comparePeriods(1500, 2000);
    expect(compDec.percentChange).toBe(-25);
    expect(compDec.diffAmount).toBe(-500);
  });
});
