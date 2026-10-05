import React from 'react';
import {
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  Calendar,
  CheckCircle,
  Clock,
  PieChart as PieChartIcon,
  TrendingDown,
  TrendingUp,
  Wallet
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { formatDateBR, isDateBefore, todayString } from '../utils/date';
import { formatCurrency, isOverdue } from '../utils/finance';

interface DashboardPageProps {
  onNavigateToTransactions: (filterType?: string) => void;
  onOpenNewTransaction: (type: 'income' | 'expense') => void;
  onOpenTransfer: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  onNavigateToTransactions,
  onOpenNewTransaction,
  onOpenTransfer
}) => {
  const { summary, transactions, categories, accounts, periodFilter, completeTransaction } = useFinance();
  const today = todayString();

  // Próximos vencimentos (pendentes ordenados por data prevista)
  const upcomingTransactions = transactions
    .filter(t => t.status === 'pending')
    .sort((a, b) => a.expected_date.localeCompare(b.expected_date))
    .slice(0, 6);

  // Mapeamentos de contas e categorias
  const categoryMap = new Map(categories.map(c => [c.id, c]));
  const accountMap = new Map(accounts.map(a => [a.id, a.name]));

  // Agrupamento de despesas por categoria no período atual (realizadas)
  const expenseByCategoryMap = new Map<string, { name: string; color: string; amount: number }>();
  let totalExpenseInPeriod = 0;

  for (const t of transactions) {
    if (t.type !== 'expense' || t.status !== 'completed' || !t.effective_date) continue;
    if (t.effective_date < periodFilter.startDate || t.effective_date > periodFilter.endDate) continue;

    const cat = categoryMap.get(t.category_id);
    const catName = cat?.name || 'Sem Categoria';
    const catColor = cat?.color || '#94a3b8';

    const current = expenseByCategoryMap.get(t.category_id) || { name: catName, color: catColor, amount: 0 };
    current.amount += t.amount;
    expenseByCategoryMap.set(t.category_id, current);
    totalExpenseInPeriod += t.amount;
  }

  const categoryExpenses = Array.from(expenseByCategoryMap.values()).sort((a, b) => b.amount - a.amount);

  return (
    <div className="page-wrapper">
      {/* Alerta de Pendências Atrasadas, se houver */}
      {summary.overdueCount > 0 && (
        <div
          style={{
            background: 'var(--warning-light)',
            border: '1px solid var(--warning-color)',
            borderRadius: 'var(--radius-md)',
            padding: '12px 18px',
            marginBottom: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            animation: 'fadeIn 0.2s'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <AlertCircle color="var(--warning-dark)" size={22} style={{ flexShrink: 0 }} />
            <div>
              <span style={{ fontWeight: 700, color: 'var(--warning-dark)' }}>
                {summary.overdueCount} pendência{summary.overdueCount > 1 ? 's' : ''} em atraso:
              </span>{' '}
              <span style={{ color: 'var(--text-main)', fontSize: '0.9375rem' }}>
                Total de {formatCurrency(summary.overdueAmount)} com vencimento anterior a hoje.
              </span>
            </div>
          </div>
          <button
            className="btn btn-sm"
            style={{
              background: 'var(--warning-color)',
              color: '#fff',
              flexShrink: 0
            }}
            onClick={() => onNavigateToTransactions('overdue')}
          >
            Ver Atrasadas
          </button>
        </div>
      )}

      {/* Grid Principal de Indicadores Financeiros */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 16,
          marginBottom: 24
        }}
      >
        {/* Card: Saldo Atual */}
        <div
          className="card card-interactive"
          onClick={() => onNavigateToTransactions('all')}
          title="Clique para ver todos os lançamentos"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-muted)' }}>
              SALDO ATUAL TOTAL
            </span>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 'var(--radius-md)',
                background: 'var(--primary-light)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--primary-color)'
              }}
            >
              <Wallet size={18} />
            </div>
          </div>
          <div
            style={{
              fontSize: '1.625rem',
              fontWeight: 800,
              color: summary.currentBalance >= 0 ? 'var(--text-main)' : 'var(--expense-color)',
              letterSpacing: '-0.02em'
            }}
          >
            {formatCurrency(summary.currentBalance)}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', marginTop: 4 }}>
            Disponível somando todas as contas ativas
          </div>
        </div>

        {/* Card: Recebido no Período */}
        <div
          className="card card-interactive"
          onClick={() => onNavigateToTransactions('received')}
          title="Clique para ver entradas recebidas"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--income-dark)' }}>
              TOTAL RECEBIDO
            </span>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 'var(--radius-md)',
                background: 'var(--income-light)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--income-color)'
              }}
            >
              <ArrowDownRight size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.625rem', fontWeight: 800, color: 'var(--income-color)', letterSpacing: '-0.02em' }}>
            +{formatCurrency(summary.totalReceived)}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', marginTop: 4 }}>
            Efetivado neste período
          </div>
        </div>

        {/* Card: Pago no Período */}
        <div
          className="card card-interactive"
          onClick={() => onNavigateToTransactions('paid')}
          title="Clique para ver despesas pagas"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--expense-dark)' }}>
              TOTAL PAGO
            </span>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 'var(--radius-md)',
                background: 'var(--expense-light)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--expense-color)'
              }}
            >
              <ArrowUpRight size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.625rem', fontWeight: 800, color: 'var(--expense-color)', letterSpacing: '-0.02em' }}>
            -{formatCurrency(summary.totalPaid)}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', marginTop: 4 }}>
            Efetivado neste período
          </div>
        </div>

        {/* Card: Resultado Realizado */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-muted)' }}>
              RESULTADO DO PERÍODO
            </span>
            <span
              className={`badge ${
                summary.actualResult > 0 ? 'badge-income' : summary.actualResult < 0 ? 'badge-expense' : 'badge-neutral'
              }`}
            >
              {summary.actualResult > 0 ? 'Superávit' : summary.actualResult < 0 ? 'Déficit' : 'Neutro'}
            </span>
          </div>
          <div
            style={{
              fontSize: '1.625rem',
              fontWeight: 800,
              color:
                summary.actualResult > 0
                  ? 'var(--income-color)'
                  : summary.actualResult < 0
                  ? 'var(--expense-color)'
                  : 'var(--neutral-color)',
              letterSpacing: '-0.02em'
            }}
          >
            {summary.actualResult > 0 ? '+' : ''}
            {formatCurrency(summary.actualResult)}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', marginTop: 4 }}>
            Recebido ({formatCurrency(summary.totalReceived)}) - Pago ({formatCurrency(summary.totalPaid)})
          </div>
        </div>
      </div>

      {/* Grid Secundário: Previsões e Projeção Futura */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 16,
          marginBottom: 28
        }}
      >
        <div
          className="card card-interactive"
          onClick={() => onNavigateToTransactions('to_receive')}
          style={{ borderLeft: '4px solid var(--income-color)' }}
        >
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: 600 }}>A RECEBER (PREVISTO)</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--income-color)', marginTop: 4 }}>
            {formatCurrency(summary.totalToReceive)}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', marginTop: 2 }}>
            Ainda pendentes no período
          </div>
        </div>

        <div
          className="card card-interactive"
          onClick={() => onNavigateToTransactions('to_pay')}
          style={{ borderLeft: '4px solid var(--expense-color)' }}
        >
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: 600 }}>A PAGAR (PREVISTO)</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--expense-color)', marginTop: 4 }}>
            {formatCurrency(summary.totalToPay)}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', marginTop: 2 }}>
            Ainda pendentes no período
          </div>
        </div>

        <div className="card" style={{ borderLeft: '4px solid var(--primary-color)' }}>
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: 600 }}>RESULTADO PREVISTO TOTAL</div>
          <div
            style={{
              fontSize: '1.25rem',
              fontWeight: 700,
              color: summary.expectedResult >= 0 ? 'var(--income-color)' : 'var(--expense-color)',
              marginTop: 4
            }}
          >
            {summary.expectedResult > 0 ? '+' : ''}
            {formatCurrency(summary.expectedResult)}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', marginTop: 2 }}>
            Previsto em toda a agenda do mês
          </div>
        </div>

        <div className="card" style={{ borderLeft: '4px solid #8b5cf6' }}>
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: 600 }}>SALDO PROJETADO AO FIM</div>
          <div
            style={{
              fontSize: '1.25rem',
              fontWeight: 700,
              color: summary.projectedBalanceAtEnd >= 0 ? '#8b5cf6' : 'var(--expense-color)',
              marginTop: 4
            }}
          >
            {formatCurrency(summary.projectedBalanceAtEnd)}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', marginTop: 2 }}>
            Saldo atual + receitas - despesas futuras
          </div>
        </div>
      </div>

      {/* Grid de Gráficos e Próximos Vencimentos */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24 }}>
        {/* Gastos por Categoria (Gráfico em SVG Responsivo e Lista) */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <PieChartIcon size={20} color="var(--primary-color)" />
              <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Gastos por Categoria</h3>
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}>Realizados</span>
          </div>

          {categoryExpenses.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '36px 0', color: 'var(--text-muted)' }}>
              Nenhuma despesa efetivada neste período.
            </div>
          ) : (
            <div>
              {/* Barra de Progresso Segmentada */}
              <div
                style={{
                  height: 12,
                  width: '100%',
                  borderRadius: 'var(--radius-full)',
                  overflow: 'hidden',
                  display: 'flex',
                  background: 'var(--bg-card-hover)',
                  marginBottom: 18
                }}
              >
                {categoryExpenses.map((cat, idx) => {
                  const pct = totalExpenseInPeriod > 0 ? (cat.amount / totalExpenseInPeriod) * 100 : 0;
                  return (
                    <div
                      key={idx}
                      style={{
                        width: `${pct}%`,
                        background: cat.color,
                        height: '100%'
                      }}
                      title={`${cat.name}: ${pct.toFixed(1)}%`}
                    />
                  );
                })}
              </div>

              {/* Lista com valores e percentuais */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {categoryExpenses.slice(0, 5).map((cat, idx) => {
                  const pct = totalExpenseInPeriod > 0 ? (cat.amount / totalExpenseInPeriod) * 100 : 0;
                  return (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div
                          style={{
                            width: 10,
                            height: 10,
                            borderRadius: '50%',
                            background: cat.color,
                            flexShrink: 0
                          }}
                        />
                        <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>{cat.name}</span>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: '0.875rem', fontWeight: 700 }}>{formatCurrency(cat.amount)}</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: 6 }}>
                          ({pct.toFixed(0)}%)
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Próximos Vencimentos */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Clock size={20} color="var(--primary-color)" />
              <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Próximos Vencimentos</h3>
            </div>
            <button
              className="btn btn-outline btn-sm"
              onClick={() => onNavigateToTransactions('pending')}
              style={{ fontSize: '0.75rem', padding: '4px 10px' }}
            >
              Ver Todos
            </button>
          </div>

          {upcomingTransactions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '36px 0', color: 'var(--text-muted)' }}>
              Nenhum lançamento pendente no momento! Tudo em dia.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {upcomingTransactions.map(t => {
                const isLate = isOverdue(t, today);
                const category = categoryMap.get(t.category_id);
                const isIncome = t.type === 'income';

                return (
                  <div
                    key={t.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 12px',
                      background: 'var(--bg-card-hover)',
                      borderRadius: 'var(--radius-md)',
                      gap: 12
                    }}
                  >
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span
                          style={{
                            fontWeight: 600,
                            fontSize: '0.875rem',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}
                        >
                          {t.description}
                        </span>
                        {isLate && (
                          <span className="badge badge-warning" style={{ fontSize: '0.6875rem' }}>
                            Atrasado
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', gap: 8, marginTop: 2 }}>
                        <span>{formatDateBR(t.expected_date)}</span>
                        <span>•</span>
                        <span>{category?.name || 'Geral'}</span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                      <div
                        style={{
                          fontWeight: 700,
                          fontSize: '0.9375rem',
                          color: isIncome ? 'var(--income-color)' : 'var(--expense-color)'
                        }}
                      >
                        {isIncome ? '+' : '-'}
                        {formatCurrency(t.amount)}
                      </div>
                      <button
                        className="btn-icon"
                        title={isIncome ? 'Confirmar recebimento' : 'Confirmar pagamento'}
                        style={{
                          width: 32,
                          height: 32,
                          color: isIncome ? 'var(--income-color)' : 'var(--expense-color)'
                        }}
                        onClick={() => completeTransaction(t.id, today)}
                      >
                        <CheckCircle size={18} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
