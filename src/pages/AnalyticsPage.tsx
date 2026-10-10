import React, { useMemo, useState } from 'react';
import '../styles/finance-pages.css';
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
import { formatDateBR, formatMonthYearBR, getPreviousMonthRange, todayString } from '../utils/date';
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
    <div className="page-wrapper finance-page analytics-page">
      <header className="finance-page-heading">
        <span className="finance-eyebrow">SEU DINHEIRO EM PERSPECTIVA</span>
        <h1>
          Análises Financeiras
        </h1>
        <p>
          Entenda seus gastos e acompanhe sua evolução.
        </p>
      </header>

      <section className="analytics-overview" aria-label="Resumo realizado do período">
        <div className="analytics-overview-period"><Calendar size={15} /><span>{formatDateBR(periodFilter.startDate)} — {formatDateBR(periodFilter.endDate)}</span></div>
        <div className="analytics-overview-totals">
          <div><span><ArrowDownRight size={16} />Entrou</span><strong>{formatCurrency(currentActual.totalReceived)}</strong></div>
          <div><span><ArrowUpRight size={16} />Saiu</span><strong>{formatCurrency(currentActual.totalPaid)}</strong></div>
        </div>
        <div className="analytics-overview-result"><span>Resultado realizado</span><strong>{formatCurrency(currentActual.totalReceived - currentActual.totalPaid)}</strong></div>
      </section>

      {/* Destaques e Insights Automáticos (Requisito 17) */}
      <details className="analytics-more">
      <summary>Ver mais indicadores</summary>
      <div className="analytics-insights">
        {/* Maior Categoria de Gasto */}
        <div className="card analytics-insight">
          <div className="analytics-insight-label"><PieIcon size={16} />Maior gasto</div>
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
        <div className="card analytics-insight">
          <div className="analytics-insight-label"><TrendingDown size={16} />Variação de gastos</div>
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
        <div className="card analytics-insight analytics-received">
          <div className="analytics-insight-label"><ArrowDownRight size={16} />Receitas do período</div>
          <div style={{ marginTop: 6 }}>
            <div style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--income-color)' }}>
              {formatCurrency(currentActual.totalReceived)} <span className="analytics-expected">recebidos de {formatCurrency(currentExpected.expectedIncome)} previstos</span>
            </div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: 2 }}>
              {currentExpected.expectedIncome > 0
                ? `${((currentActual.totalReceived / currentExpected.expectedIncome) * 100).toFixed(0)}% do previsto já recebido`
                : 'Sem previsões'}
            </div>
          </div>
        </div>
      </div>
      </details>

      {/* Navegação entre Abas de Análise */}
      <div className="finance-segment analytics-tabs" aria-label="Tipo de análise">
        <button
          aria-pressed={activeTab === 'categories'}
          onClick={() => setActiveTab('categories')}
        >
          <PieIcon size={16} />
          <span>Categorias</span>
        </button>
        <button
          aria-pressed={activeTab === 'comparison'}
          onClick={() => setActiveTab('comparison')}
        >
          <BarChart3 size={16} />
          <span>Comparativo</span>
        </button>
        <button
          aria-pressed={activeTab === 'recurrent'}
          onClick={() => setActiveTab('recurrent')}
        >
          <Layers size={16} />
          <span>Recorrência</span>
        </button>
      </div>

      {/* ABA 1: Categorias e Distribuição */}
      {activeTab === 'categories' && (
        <div className="analytics-panel-grid">
          <div className="card">
            <h3 style={{ fontSize: '1.0625rem', fontWeight: 700, marginBottom: 16 }}>
              Para onde foi seu dinheiro
            </h3>

            {categoryExpenses.list.length === 0 ? (
              <div className="finance-empty">
                <PieIcon size={30} />
                <strong>Sem gastos para analisar</strong>
                <p>Suas despesas pagas aparecerão aqui, organizadas por categoria.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {categoryExpenses.list.map((cat, idx) => {
                  const pct = categoryExpenses.total > 0 ? (cat.amount / categoryExpenses.total) * 100 : 0;
                  return (
                    <div key={idx}>
                      <div className="analytics-ranking-row">
                        <div className="analytics-ranking-name">
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
          {categoryExpenses.list.length > 0 && <div className="card analytics-table-card" style={{ padding: 0, overflow: 'hidden' }}>
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
          </div>}
        </div>
      )}

      {/* ABA 2: Comparativo de Períodos */}
      {activeTab === 'comparison' && (
        <div className="card">
          <div style={{ marginBottom: 16 }}>
            <h3 style={{ fontSize: '1.0625rem', fontWeight: 700 }}>
              O que mudou neste período
            </h3>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
              Valores realizados de {formatDateBR(periodFilter.startDate)} a {formatDateBR(periodFilter.endDate)}, comparados com {formatDateBR(previousRange.start)} a {formatDateBR(previousRange.end)}.
            </p>
          </div>

          <div className="analytics-panel-grid">
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
              Fixas ou eventuais?
            </h3>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
              Entenda quanto do seu orçamento está comprometido com contas fixas (aluguel, condomínio, assinaturas) em relação a gastos variáveis.
            </p>
          </div>

          <div className="analytics-panel-grid">
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
