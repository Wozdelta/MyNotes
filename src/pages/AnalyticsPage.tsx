import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Calendar,
  Layers,
  PieChart as PieIcon,
  TrendingDown,
  TrendingUp
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { formatMonthYearBR, getPreviousMonthRange, todayString } from '../utils/date';
import {
  calculateActualResult,
  calculateExpectedResult,
  comparePeriods,
  formatCurrency,
  toCents
} from '../utils/finance';

export const AnalyticsPage: React.FC = () => {
  const { transactions, categories, periodFilter } = useFinance();
  const today = todayString();

  const [activeTab, setActiveTab] = useState<'categories' | 'evolution' | 'comparison' | 'recurrent'>('categories');

  // Mapeamentos
  const categoryMap = new Map(categories.map(c => [c.id, c]));

  // Dados do período selecionado
  const currentActual = useMemo(() => {
    return calculateActualResult(transactions, periodFilter.startDate, periodFilter.endDate);
  }, [transactions, periodFilter]);

  const currentExpected = useMemo(() => {
    return calculateExpectedResult(transactions, periodFilter.startDate, periodFilter.endDate);
  }, [transactions, periodFilter]);

  // Período anterior equivalente para comparação
  const previousRange = useMemo(() => {
    return getPreviousMonthRange(periodFilter.startDate);
  }, [periodFilter.startDate]);

  const previousActual = useMemo(() => {
    return calculateActualResult(transactions, previousRange.start, previousRange.end);
  }, [transactions, previousRange]);

  // Comparações de Período
  const incomeComparison = comparePeriods(currentActual.totalReceived, previousActual.totalReceived);
  const expenseComparison = comparePeriods(currentActual.totalPaid, previousActual.totalPaid);

  // Gastos por Categoria no Período
  const categoryExpenses = useMemo(() => {
    const map = new Map<string, { name: string; color: string; amount: number; count: number }>();
    let total = 0;

    for (const t of transactions) {
      if (t.type !== 'expense' || t.status !== 'completed' || !t.effective_date) continue;
      if (t.effective_date < periodFilter.startDate || t.effective_date > periodFilter.endDate) continue;

      const cat = categoryMap.get(t.category_id);
      const catName = cat?.name || 'Sem Categoria';
      const catColor = cat?.color || '#94a3b8';

      const entry = map.get(t.category_id) || { name: catName, color: catColor, amount: 0, count: 0 };
      entry.amount += t.amount;
      entry.count += 1;
      map.set(t.category_id, entry);
      total += t.amount;
    }

    const list = Array.from(map.values()).sort((a, b) => b.amount - a.amount);
    return { list, total };
  }, [transactions, periodFilter, categoryMap]);

  // Despesas Recorrentes vs Eventuais no Período
  const recurrentVsOccasional = useMemo(() => {
    let recurrentAmount = 0;
    let occasionalAmount = 0;

    for (const t of transactions) {
      if (t.type !== 'expense' || t.status === 'cancelled') continue;
      if (t.expected_date < periodFilter.startDate || t.expected_date > periodFilter.endDate) continue;

      if (t.is_recurrent) {
        recurrentAmount += t.amount;
      } else {
        occasionalAmount += t.amount;
      }
    }

    const total = recurrentAmount + occasionalAmount;
    const recurrentPct = total > 0 ? (recurrentAmount / total) * 100 : 0;
    const occasionalPct = total > 0 ? (occasionalAmount / total) * 100 : 0;

    return {
      recurrentAmount,
      occasionalAmount,
      total,
      recurrentPct,
      occasionalPct
    };
  }, [transactions, periodFilter]);

  // Categoria de maior gasto
  const topExpenseCategory = categoryExpenses.list.length > 0 ? categoryExpenses.list[0] : null;

  return (
    <div className="page-wrapper">
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
          Análises Financeiras
        </h1>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: 2 }}>
          Relatórios detalhados, tendências de despesas e comparações reais de períodos.
        </p>
      </div>

      {/* Destaques e Insights Automáticos (Requisito 17) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 14,
          marginBottom: 24
        }}
      >
        {/* Maior Categoria de Gasto */}
        <div className="card">
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>MAIOR GASTO POR CATEGORIA</div>
          {topExpenseCategory ? (
            <div style={{ marginTop: 6 }}>
              <div style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--expense-color)' }}>
                {topExpenseCategory.name}
              </div>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: 2 }}>
                {formatCurrency(topExpenseCategory.amount)} ({((topExpenseCategory.amount / categoryExpenses.total) * 100).toFixed(0)}% do total)
              </div>
            </div>
          ) : (
            <div style={{ fontSize: '0.875rem', color: 'var(--text-subtle)', marginTop: 6 }}>
              Sem despesas no período
            </div>
          )}
        </div>

        {/* Variação de Despesas com Período Anterior */}
        <div className="card">
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>VARIAÇÃO DE DESPESAS</div>
          <div style={{ marginTop: 6 }}>
            <div style={{ fontSize: '1.125rem', fontWeight: 700, color: expenseComparison.diffAmount > 0 ? 'var(--expense-color)' : 'var(--income-color)' }}>
              {expenseComparison.diffAmount > 0 ? '+' : ''}{formatCurrency(expenseComparison.diffAmount)}
            </div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: 2 }}>
              {expenseComparison.label}
            </div>
          </div>
        </div>

        {/* Realizado vs Previsto */}
        <div className="card">
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>PREVISTO VS REALIZADO (RECEITAS)</div>
          <div style={{ marginTop: 6 }}>
            <div style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--income-color)' }}>
              {formatCurrency(currentActual.totalReceived)} / {formatCurrency(currentExpected.expectedIncome)}
            </div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: 2 }}>
              {currentExpected.expectedIncome > 0
                ? `${((currentActual.totalReceived / currentExpected.expectedIncome) * 100).toFixed(0)}% do previsto já recebido`
                : 'Sem previsões'}
            </div>
          </div>
        </div>
      </div>

      {/* Navegação entre Abas de Análise */}
      <div
        style={{
          display: 'flex',
          gap: 8,
          borderBottom: '1px solid var(--border-color)',
          paddingBottom: 8,
          marginBottom: 20,
          overflowX: 'auto'
        }}
      >
        <button
          className={`btn btn-sm ${activeTab === 'categories' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setActiveTab('categories')}
        >
          <PieIcon size={16} />
          <span>Categorias & Distribuição</span>
        </button>
        <button
          className={`btn btn-sm ${activeTab === 'comparison' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setActiveTab('comparison')}
        >
          <BarChart3 size={16} />
          <span>Comparativo com Mês Anterior</span>
        </button>
        <button
          className={`btn btn-sm ${activeTab === 'recurrent' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setActiveTab('recurrent')}
        >
          <Layers size={16} />
          <span>Recorrentes vs Eventuais</span>
        </button>
      </div>

      {/* ABA 1: Categorias e Distribuição */}
      {activeTab === 'categories' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
          <div className="card">
            <h3 style={{ fontSize: '1.0625rem', fontWeight: 700, marginBottom: 16 }}>
              Ranking de Gastos por Categoria
            </h3>

            {categoryExpenses.list.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '36px 0', color: 'var(--text-muted)' }}>
                Nenhuma despesa efetivada no período selecionado.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {categoryExpenses.list.map((cat, idx) => {
                  const pct = categoryExpenses.total > 0 ? (cat.amount / categoryExpenses.total) * 100 : 0;
                  return (
                    <div key={idx}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontWeight: 700, fontSize: '0.875rem', width: 20, color: 'var(--text-subtle)' }}>
                            #{idx + 1}
                          </span>
                          <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{cat.name}</span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            ({cat.count} lançament{cat.count > 1 ? 'os' : 'o'})
                          </span>
                        </div>
                        <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>
                          {formatCurrency(cat.amount)} ({pct.toFixed(1)}%)
                        </div>
                      </div>

                      {/* Barra de Progresso Individual */}
                      <div
                        style={{
                          height: 8,
                          borderRadius: 'var(--radius-full)',
                          background: 'var(--bg-card-hover)',
                          overflow: 'hidden'
                        }}
                      >
                        <div
                          style={{
                            height: '100%',
                            width: `${pct}%`,
                            background: cat.color || 'var(--expense-color)',
                            borderRadius: 'var(--radius-full)'
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Tabela de Dados Formatados (Requisito 17: visualização também textual/tabela) */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Tabela de Detalhamento</h3>
            </div>
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Categoria</th>
                    <th style={{ textAlign: 'center' }}>Qtd.</th>
                    <th style={{ textAlign: 'right' }}>Valor Total</th>
                    <th style={{ textAlign: 'right' }}>% do Total</th>
                  </tr>
                </thead>
                <tbody>
                  {categoryExpenses.list.map((cat, i) => {
                    const pct = categoryExpenses.total > 0 ? (cat.amount / categoryExpenses.total) * 100 : 0;
                    return (
                      <tr key={i}>
                        <td style={{ fontWeight: 600 }}>{cat.name}</td>
                        <td style={{ textAlign: 'center' }}>{cat.count}</td>
                        <td style={{ textAlign: 'right', fontWeight: 700 }}>{formatCurrency(cat.amount)}</td>
                        <td style={{ textAlign: 'right', color: 'var(--text-muted)' }}>{pct.toFixed(1)}%</td>
                      </tr>
                    );
                  })}
                  {categoryExpenses.list.length > 0 && (
                    <tr style={{ background: 'var(--bg-card-hover)', fontWeight: 800 }}>
                      <td>TOTAL</td>
                      <td style={{ textAlign: 'center' }}>
                        {categoryExpenses.list.reduce((acc, c) => acc + c.count, 0)}
                      </td>
                      <td style={{ textAlign: 'right', color: 'var(--expense-color)' }}>
                        {formatCurrency(categoryExpenses.total)}
                      </td>
                      <td style={{ textAlign: 'right' }}>100.0%</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ABA 2: Comparativo de Períodos */}
      {activeTab === 'comparison' && (
        <div className="card">
          <div style={{ marginBottom: 16 }}>
            <h3 style={{ fontSize: '1.0625rem', fontWeight: 700 }}>
              Comparativo: Período Atual vs Período Anterior
            </h3>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
              Comparando os valores efetivados ({periodFilter.startDate} até {periodFilter.endDate}) com o mês anterior ({previousRange.start} até {previousRange.end}).
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
            {/* Entradas */}
            <div style={{ padding: 16, background: 'var(--bg-card-hover)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--income-color)', marginBottom: 8 }}>
                <TrendingUp size={18} />
                <h4 style={{ fontWeight: 700, fontSize: '0.9375rem' }}>Entradas Realizadas</h4>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Período Atual:</span>
                <span style={{ fontWeight: 700 }}>{formatCurrency(currentActual.totalReceived)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Período Anterior:</span>
                <span style={{ fontWeight: 600 }}>{formatCurrency(previousActual.totalReceived)}</span>
              </div>
              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: 8, fontSize: '0.8125rem', fontWeight: 700 }}>
                {incomeComparison.label}
              </div>
            </div>

            {/* Despesas */}
            <div style={{ padding: 16, background: 'var(--bg-card-hover)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--expense-color)', marginBottom: 8 }}>
                <TrendingDown size={18} />
                <h4 style={{ fontWeight: 700, fontSize: '0.9375rem' }}>Despesas Realizadas</h4>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Período Atual:</span>
                <span style={{ fontWeight: 700 }}>{formatCurrency(currentActual.totalPaid)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Período Anterior:</span>
                <span style={{ fontWeight: 600 }}>{formatCurrency(previousActual.totalPaid)}</span>
              </div>
              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: 8, fontSize: '0.8125rem', fontWeight: 700 }}>
                {expenseComparison.label}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ABA 3: Recorrentes vs Eventuais */}
      {activeTab === 'recurrent' && (
        <div className="card">
          <div style={{ marginBottom: 16 }}>
            <h3 style={{ fontSize: '1.0625rem', fontWeight: 700 }}>
              Despesas Recorrentes vs Despesas Eventuais
            </h3>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
              Entenda quanto do seu orçamento está comprometido com contas fixas (aluguel, condomínio, assinaturas) em relação a gastos variáveis.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
            <div style={{ padding: 18, border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
              <span className="badge badge-primary" style={{ marginBottom: 8 }}>Fixas / Recorrentes</span>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)', marginTop: 6 }}>
                {formatCurrency(recurrentVsOccasional.recurrentAmount)}
              </div>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: 4 }}>
                {recurrentVsOccasional.recurrentPct.toFixed(1)}% do orçamento previsto
              </div>
            </div>

            <div style={{ padding: 18, border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
              <span className="badge badge-warning" style={{ marginBottom: 8 }}>Eventuais / Variáveis</span>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)', marginTop: 6 }}>
                {formatCurrency(recurrentVsOccasional.occasionalAmount)}
              </div>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: 4 }}>
                {recurrentVsOccasional.occasionalPct.toFixed(1)}% do orçamento previsto
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
