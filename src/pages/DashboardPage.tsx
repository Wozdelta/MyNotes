import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowDownToLine,
  ArrowLeftRight,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CreditCard,
  Plus,
  TrendingDown,
  Wallet
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { formatDateBR, getDaysInMonth, padZero, todayString, WEEKDAY_SHORT_NAMES_BR } from '../utils/date';
import { buildUpcomingExpenseProjection, calculatePaymentCoverage, calculateTotalCurrentBalance, calculateUpcomingIncome, formatCurrency, fromCents, isOverdue, isVirtualRecurrenceTransaction, toCents } from '../utils/finance';

interface DashboardPageProps {
  onNavigateToTransactions: (filterType?: string) => void;
  onOpenNewTransaction: (type: 'income' | 'expense') => void;
  onOpenTransfer: () => void;
  onOpenCalendar: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  onNavigateToTransactions,
  onOpenNewTransaction,
  onOpenTransfer,
  onOpenCalendar
}) => {
  const { summary, transactions, recurrences, categories, accounts, transfers, periodFilter, createTransaction, completeTransaction } = useFinance();
  const [showDetails, setShowDetails] = useState(false);
  const today = todayString();

  const monthLabel = useMemo(() => {
    const [year, month] = periodFilter.startDate.split('-').map(Number);
    const formatted = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' })
      .format(new Date(year, month - 1, 1));
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  }, [periodFilter.startDate]);

  const pendingExpenses = useMemo(() => buildUpcomingExpenseProjection(
    transactions,
    recurrences,
    periodFilter.startDate,
    periodFilter.endDate,
    today
  ), [transactions, recurrences, periodFilter, today]);

  const categoryMap = useMemo(() => new Map(categories.map(category => [category.id, category])), [categories]);
  const accountMap = useMemo(() => new Map(accounts.map(account => [account.id, account.name])), [accounts]);
  const nextPayment = pendingExpenses[0];
  const totalToPay = fromCents(pendingExpenses.reduce((total, transaction) => total + toCents(transaction.amount), 0));
  const upcomingIncome = useMemo(() => calculateUpcomingIncome(
    transactions,
    recurrences,
    periodFilter.startDate,
    periodFilter.endDate,
    today
  ), [transactions, recurrences, periodFilter, today]);
  const { amountMissing, amountLeft, balanceAfterPayments: balanceAfterMonth } = calculatePaymentCoverage(
    summary.currentBalance,
    upcomingIncome,
    totalToPay
  );

  const handleCompletePayment = async () => {
    if (!nextPayment) return;
    if (!isVirtualRecurrenceTransaction(nextPayment)) {
      await completeTransaction(nextPayment.id, today);
      return;
    }
    const created = await createTransaction({
      account_id: nextPayment.account_id,
      category_id: nextPayment.category_id,
      type: 'expense',
      description: nextPayment.description,
      amount: nextPayment.amount,
      expected_date: nextPayment.expected_date,
      status: 'pending',
      notes: nextPayment.notes,
      recurrence_id: nextPayment.recurrence_id,
      is_recurrent: true
    });
    await completeTransaction(created.id, today);
  };

  const calendarData = useMemo(() => {
    const [year, month] = periodFilter.startDate.split('-').map(Number);
    const daysInMonth = getDaysInMonth(year, month);
    const firstWeekday = new Date(year, month - 1, 1).getDay();
    const cells: Array<{ day: number; date: string; balance: number | null } | null> = Array(firstWeekday).fill(null);
    for (let day = 1; day <= daysInMonth; day++) {
      const date = `${year}-${padZero(month)}-${padZero(day)}`;
      const isPastOrToday = date <= today;
      const balance = isPastOrToday
        ? calculateTotalCurrentBalance(
          accounts.filter(account => account.initial_balance_date <= date),
          transactions.filter(transaction =>
            transaction.status === 'completed' &&
            Boolean(transaction.effective_date) &&
            transaction.effective_date! <= date
          ),
          transfers.filter(transfer => transfer.transfer_date <= date)
        )
        : null;

      cells.push({ day, date, balance });
    }
    return cells;
  }, [accounts, transactions, transfers, periodFilter.startDate, today]);

  const expenseByCategory = useMemo(() => {
    const totals = new Map<string, number>();
    transactions.forEach(transaction => {
      if (
        transaction.type === 'expense' &&
        transaction.status === 'completed' &&
        transaction.effective_date &&
        transaction.effective_date >= periodFilter.startDate &&
        transaction.effective_date <= periodFilter.endDate
      ) {
        totals.set(transaction.category_id, (totals.get(transaction.category_id) || 0) + transaction.amount);
      }
    });
    return Array.from(totals.entries())
      .map(([id, amount]) => ({ category: categoryMap.get(id), amount }))
      .sort((a, b) => b.amount - a.amount);
  }, [transactions, periodFilter, categoryMap]);

  return (
    <div className="page-wrapper dashboard-home">
      {summary.overdueCount > 0 && (
        <button className="dashboard-overdue" onClick={() => onNavigateToTransactions('overdue')}>
          <AlertTriangle size={18} />
          <span>
            <strong>{summary.overdueCount} pagamento{summary.overdueCount > 1 ? 's' : ''} em atraso</strong>
            {' · '}{formatCurrency(summary.overdueAmount)}
          </span>
          <span className="dashboard-overdue-link">Ver</span>
        </button>
      )}

      <section className="dashboard-situation-card">
        <div className="dashboard-balance-heading">
          <span><Wallet size={18} /> Saldo disponível</span>
          <span className="dashboard-period-label">{monthLabel}</span>
        </div>
        <div className="dashboard-main-balance">
          <strong>{formatCurrency(summary.currentBalance)}</strong>
          <p>Somando suas contas ativas</p>
        </div>

        <div className="dashboard-situation-grid">
          <div className="dashboard-mini-stat is-expense">
            <span><CreditCard size={16} /> Preciso pagar</span>
            <strong>{formatCurrency(totalToPay)}</strong>
          </div>
          <div className={`dashboard-mini-stat ${amountMissing > 0 ? 'is-danger' : 'is-positive'}`}>
            <span><TrendingDown size={16} /> {amountMissing > 0 ? 'Ainda preciso conseguir' : 'Sobra depois de pagar'}</span>
            <strong>{formatCurrency(amountMissing > 0 ? amountMissing : amountLeft)}</strong>
          </div>
          <div className="dashboard-mini-stat is-income">
            <span><ArrowDownToLine size={16} /> Ainda vai cair</span>
            <strong>+{formatCurrency(upcomingIncome)}</strong>
            <small>Até o fim do período</small>
          </div>
        </div>

        <div className={`dashboard-projection ${balanceAfterMonth < 0 ? 'is-negative' : ''}`}>
          <span>Saldo após entradas e pagamentos</span>
          <strong>{formatCurrency(balanceAfterMonth)}</strong>
        </div>
      </section>

      <section className="dashboard-focus-card">
        <div className="dashboard-focus-heading">
          <div className="dashboard-focus-icon"><CreditCard size={20} /></div>
          <div>
            <h2>Pagamentos de {monthLabel}</h2>
            <p>
              {!nextPayment
                ? 'Você não tem pagamentos pendentes neste período.'
                : `${pendingExpenses.length} pagamento${pendingExpenses.length > 1 ? 's' : ''} pendente${pendingExpenses.length > 1 ? 's' : ''} neste período`}
            </p>
          </div>
        </div>

        {nextPayment && (
          <div className="dashboard-payment-list">
            <div className="dashboard-next-label">Próximo pagamento</div>
            <div className={`dashboard-payment-row ${isOverdue(nextPayment, today) ? 'is-late' : ''}`}>
              <div className="dashboard-payment-date">
                <CalendarDays size={16} />
                <span>{formatDateBR(nextPayment.expected_date)}</span>
              </div>
              <div className="dashboard-payment-description">
                <strong>{nextPayment.description}</strong>
                {accountMap.get(nextPayment.account_id) && <small>{accountMap.get(nextPayment.account_id)}</small>}
              </div>
              <strong className="dashboard-payment-value">{formatCurrency(nextPayment.amount)}</strong>
              <button
                className="dashboard-payment-check"
                onClick={() => { handleCompletePayment().catch(() => undefined); }}
                title="Marcar como pago"
                aria-label={`Marcar ${nextPayment.description} como pago`}
              >
                <CheckCircle2 size={18} />
              </button>
            </div>
            {pendingExpenses.length > 1 && (
              <button className="dashboard-more-payments" onClick={() => onNavigateToTransactions('to_pay')}>
                Ver mais {pendingExpenses.length - 1} pagamento{pendingExpenses.length - 1 > 1 ? 's' : ''}
              </button>
            )}
          </div>
        )}

        <div className="dashboard-total-line">
          <span>Total a pagar</span>
          <strong>{formatCurrency(totalToPay)}</strong>
        </div>
      </section>

      <section className="dashboard-balance-calendar">
        <div className="dashboard-calendar-heading">
          <div>
            <span className="dashboard-calendar-eyebrow">{monthLabel}</span>
            <h2>Calendário de saldo</h2>
            <p>Saldo realizado nos dias passados. Hoje em azul, sem projeções.</p>
          </div>
          <div className="dashboard-calendar-legend">
            <span><i className="positive" /> Positivo</span>
            <span><i className="negative" /> Negativo</span>
          </div>
        </div>

        <div className="dashboard-calendar-weekdays">
          {WEEKDAY_SHORT_NAMES_BR.map(day => <span key={day}>{day}</span>)}
        </div>
        <div className="dashboard-calendar-grid">
          {calendarData.map((cell, index) => cell ? (
            <button
              key={cell.date}
              className={`dashboard-calendar-day ${cell.date === today ? 'today' : cell.balance === null ? 'future' : cell.balance < 0 ? 'negative' : cell.balance > 0 ? 'positive' : 'neutral'}`}
              aria-current={cell.date === today ? 'date' : undefined}
              onClick={onOpenCalendar}
              title={cell.balance === null ? formatDateBR(cell.date) : `${formatDateBR(cell.date)}: saldo ${formatCurrency(cell.balance)}`}
              aria-label={cell.balance === null ? formatDateBR(cell.date) : `${formatDateBR(cell.date)}, saldo ${formatCurrency(cell.balance)}`}
            >
              <span className="dashboard-calendar-number">{cell.day}</span>
            </button>
          ) : <div className="dashboard-calendar-empty" key={`empty-${index}`} />)}
        </div>

        <button className="dashboard-calendar-open" onClick={onOpenCalendar}>
          <CalendarDays size={16} /> Abrir agenda completa
        </button>
      </section>

      <div className="dashboard-actions">
        <button className="btn btn-primary btn-sm" onClick={() => onOpenNewTransaction('expense')}>
          <Plus size={17} /> Novo lançamento
        </button>
        <button className="btn btn-outline btn-sm" onClick={onOpenTransfer}>
          <ArrowLeftRight size={17} /> Transferir
        </button>
      </div>

      <button
        className="dashboard-details-toggle"
        onClick={() => setShowDetails(value => !value)}
        aria-expanded={showDetails}
      >
        <span>{showDetails ? 'Ocultar dados detalhados' : 'Mostrar dados detalhados'}</span>
        {showDetails ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
      </button>

      {showDetails && (
        <section className="dashboard-details">
          <div className="dashboard-detail-grid">
            <button className="dashboard-detail-stat" onClick={() => onNavigateToTransactions('received')}>
              <span>Total recebido</span><strong className="income">+{formatCurrency(summary.totalReceived)}</strong>
            </button>
            <button className="dashboard-detail-stat" onClick={() => onNavigateToTransactions('paid')}>
              <span>Total pago</span><strong className="expense">−{formatCurrency(summary.totalPaid)}</strong>
            </button>
            <div className="dashboard-detail-stat">
              <span>Resultado realizado</span><strong>{formatCurrency(summary.actualResult)}</strong>
            </div>
            <div className="dashboard-detail-stat">
              <span>Projeção ao fim</span><strong>{formatCurrency(summary.projectedBalanceAtEnd)}</strong>
            </div>
          </div>

          <div className="dashboard-details-columns">
            <div className="card dashboard-detail-panel">
              <div className="dashboard-panel-heading">
                <h3>Gastos por categoria</h3>
                <span>Pagos no período</span>
              </div>
              {expenseByCategory.length === 0 ? (
                <p className="dashboard-empty">Nenhuma despesa paga neste período.</p>
              ) : expenseByCategory.slice(0, 6).map(item => (
                <div className="dashboard-category-row" key={item.category?.id || 'sem-categoria'}>
                  <span>
                    <i style={{ background: item.category?.color || '#94a3b8' }} />
                    {item.category?.name || 'Sem categoria'}
                  </span>
                  <strong>{formatCurrency(item.amount)}</strong>
                </div>
              ))}
            </div>

            <div className="card dashboard-detail-panel">
              <div className="dashboard-panel-heading">
                <h3>Resumo do período</h3>
                <button onClick={() => onNavigateToTransactions('all')}>Ver extrato</button>
              </div>
              <div className="dashboard-summary-row"><span>Entradas pendentes</span><strong>{formatCurrency(upcomingIncome)}</strong></div>
              <div className="dashboard-summary-row"><span>Despesas pendentes</span><strong>{formatCurrency(totalToPay)}</strong></div>
              <div className="dashboard-summary-row"><span>Resultado previsto</span><strong>{formatCurrency(summary.expectedResult)}</strong></div>
              <div className="dashboard-summary-row"><span>Saldo atual</span><strong>{formatCurrency(summary.currentBalance)}</strong></div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
};
