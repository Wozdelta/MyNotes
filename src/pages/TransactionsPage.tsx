import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Calendar,
  CheckCircle,
  Copy,
  Download,
  Edit2,
  Filter,
  MoreVertical,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  XCircle
} from 'lucide-react';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { useFinance } from '../context/FinanceContext';
import { Transaction, TransactionType } from '../types';
import { exportTransactionsToCSV } from '../utils/csvExport';
import { formatDateBR, isDateBefore, todayString } from '../utils/date';
import { formatCurrency, isOverdue } from '../utils/finance';

interface TransactionsPageProps {
  initialFilter?: string;
  onOpenCreate: (type?: TransactionType) => void;
  onOpenEdit: (transaction: Transaction) => void;
}

export const TransactionsPage: React.FC<TransactionsPageProps> = ({
  initialFilter,
  onOpenCreate,
  onOpenEdit
}) => {
  const {
    transactions,
    accounts,
    categories,
    periodFilter,
    setDateBase,
    deleteTransaction,
    cancelTransaction,
    duplicateTransaction,
    completeTransaction,
    undoCompleteTransaction
  } = useFinance();

  const today = todayString();

  // Estados dos Filtros
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>(
    initialFilter === 'received' ? 'income' : initialFilter === 'paid' ? 'expense' : 'all'
  );
  const [statusFilter, setStatusFilter] = useState<string>(
    initialFilter === 'overdue' ? 'overdue' : initialFilter === 'pending' ? 'pending' : 'all'
  );
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [accountFilter, setAccountFilter] = useState<string>('all');
  const [recurrenceFilter, setRecurrenceFilter] = useState<'all' | 'recurrent' | 'occasional'>('all');
  const [sortBy, setSortBy] = useState<'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc'>('date_desc');
  const [showFiltersMobile, setShowFiltersMobile] = useState(false);

  // Paginação
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  // Modais de confirmação
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [effectiveDateInput, setEffectiveDateInput] = useState(today);

  // Mapeamentos
  const accountMap = new Map(accounts.map(a => [a.id, a.name]));
  const categoryMap = new Map(categories.map(c => [c.id, c]));

  // Lógica de Filtragem
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      // 1. Filtro de Texto
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchDesc = t.description.toLowerCase().includes(q);
        const matchNotes = t.notes?.toLowerCase().includes(q) || false;
        if (!matchDesc && !matchNotes) return false;
      }

      // 2. Filtro de Período (base escolhida: data prevista ou efetiva)
      const targetDate = periodFilter.dateBase === 'effective' && t.effective_date ? t.effective_date : t.expected_date;
      if (targetDate < periodFilter.startDate || targetDate > periodFilter.endDate) {
        return false;
      }

      // 3. Filtro de Tipo
      if (typeFilter !== 'all' && t.type !== typeFilter) return false;

      // 4. Filtro de Situação
      if (statusFilter === 'pending' && t.status !== 'pending') return false;
      if (statusFilter === 'completed' && t.status !== 'completed') return false;
      if (statusFilter === 'cancelled' && t.status !== 'cancelled') return false;
      if (statusFilter === 'overdue' && !isOverdue(t, today)) return false;

      // 5. Filtro de Categoria
      if (categoryFilter !== 'all' && t.category_id !== categoryFilter) return false;

      // 6. Filtro de Conta
      if (accountFilter !== 'all' && t.account_id !== accountFilter) return false;

      // 7. Filtro de Recorrência
      if (recurrenceFilter === 'recurrent' && !t.is_recurrent) return false;
      if (recurrenceFilter === 'occasional' && t.is_recurrent) return false;

      return true;
    }).sort((a, b) => {
      if (sortBy === 'date_desc') {
        const dateA = a.expected_date;
        const dateB = b.expected_date;
        return dateB.localeCompare(dateA);
      }
      if (sortBy === 'date_asc') {
        return a.expected_date.localeCompare(b.expected_date);
      }
      if (sortBy === 'amount_desc') {
        return b.amount - a.amount;
      }
      if (sortBy === 'amount_asc') {
        return a.amount - b.amount;
      }
      return 0;
    });
  }, [
    transactions,
    searchQuery,
    periodFilter,
    typeFilter,
    statusFilter,
    categoryFilter,
    accountFilter,
    recurrenceFilter,
    sortBy,
    today
  ]);

  // Totais do conjunto filtrado (Requisito 11 do prompt)
  const filteredSummary = useMemo(() => {
    let incomeTotal = 0;
    let expenseTotal = 0;
    let pendingCount = 0;

    for (const t of filteredTransactions) {
      if (t.status === 'cancelled') continue;
      if (t.type === 'income') {
        incomeTotal += t.amount;
      } else {
        expenseTotal += t.amount;
      }
      if (t.status === 'pending') {
        pendingCount++;
      }
    }

    return {
      incomeTotal,
      expenseTotal,
      balance: incomeTotal - expenseTotal,
      count: filteredTransactions.length,
      pendingCount
    };
  }, [filteredTransactions]);

  // Itens paginados
  const totalPages = Math.ceil(filteredTransactions.length / pageSize) || 1;
  const paginatedTransactions = filteredTransactions.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const resetFilters = () => {
    setSearchQuery('');
    setTypeFilter('all');
    setStatusFilter('all');
    setCategoryFilter('all');
    setAccountFilter('all');
    setRecurrenceFilter('all');
    setSortBy('date_desc');
    setCurrentPage(1);
  };

  const handleExportCSV = () => {
    exportTransactionsToCSV(
      filteredTransactions,
      accounts,
      categories,
      `extrato_${periodFilter.startDate}_a_${periodFilter.endDate}.csv`
    );
  };

  return (
    <div className="page-wrapper">
      {/* Topo: Título, Filtro de Base de Data e Botões de Ação */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          marginBottom: 16
        }}
      >
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
            Lançamentos
          </h1>
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>Base de data do período:</span>
            <button
              onClick={() => setDateBase(periodFilter.dateBase === 'expected' ? 'effective' : 'expected')}
              className="badge"
              style={{
                cursor: 'pointer',
                background: 'var(--bg-card-hover)',
                color: 'var(--primary-color)',
                border: '1px solid var(--border-color)',
                fontWeight: 700
              }}
              title="Clique para alternar se o filtro de período considera a data prevista ou a data efetiva"
            >
              {periodFilter.dateBase === 'expected' ? 'Por Data Prevista' : 'Por Data Efetiva'} ⇄
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            className="btn btn-outline btn-sm"
            onClick={handleExportCSV}
            title="Exportar registros filtrados para CSV (compatível com Excel)"
          >
            <Download size={16} />
            <span style={{ display: 'none' }} className="btn-label-desktop">Exportar CSV</span>
          </button>

          <button className="btn btn-income btn-sm" onClick={() => onOpenCreate('income')}>
            <Plus size={16} />
            <span>Entrada</span>
          </button>

          <button className="btn btn-expense btn-sm" onClick={() => onOpenCreate('expense')}>
            <Plus size={16} />
            <span>Despesa</span>
          </button>
        </div>
      </div>

      <style>{`
        @media (min-width: 640px) {
          .btn-label-desktop {
            display: inline !important;
          }
        }
      `}</style>

      {/* Barra de Totais do Conjunto Filtrado (Requisito 11) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: 12,
          padding: '14px 18px',
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-md)',
          marginBottom: 16
        }}
      >
        <div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>ENTRADAS FILTRADAS</div>
          <div style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--income-color)' }}>
            +{formatCurrency(filteredSummary.incomeTotal)}
          </div>
        </div>
        <div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>DESPESAS FILTRADAS</div>
          <div style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--expense-color)' }}>
            -{formatCurrency(filteredSummary.expenseTotal)}
          </div>
        </div>
        <div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>BALANÇO DO FILTRO</div>
          <div
            style={{
              fontSize: '1.125rem',
              fontWeight: 800,
              color: filteredSummary.balance >= 0 ? 'var(--income-color)' : 'var(--expense-color)'
            }}
          >
            {filteredSummary.balance > 0 ? '+' : ''}
            {formatCurrency(filteredSummary.balance)}
          </div>
        </div>
        <div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>TOTAL DE ITENS</div>
          <div style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--text-main)' }}>
            {filteredSummary.count} <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-subtle)' }}>({filteredSummary.pendingCount} pendentes)</span>
          </div>
        </div>
      </div>

      {/* Caixa de Busca e Filtros Rápidos */}
      <div className="card" style={{ padding: '16px', marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Busca por texto */}
          <div style={{ position: 'relative', flex: '1 1 200px' }}>
            <Search
              size={16}
              style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-subtle)' }}
            />
            <input
              type="text"
              className="form-input"
              style={{ paddingLeft: 36, minHeight: 38 }}
              placeholder="Buscar por descrição ou observações..."
              value={searchQuery}
              onChange={e => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>

          {/* Tipo */}
          <select
            className="form-select"
            style={{ flex: '1 1 120px', minHeight: 38 }}
            value={typeFilter}
            onChange={e => {
              setTypeFilter(e.target.value as any);
              setCurrentPage(1);
            }}
            aria-label="Filtrar por tipo"
          >
            <option value="all">Todos os tipos</option>
            <option value="income">Apenas Entradas</option>
            <option value="expense">Apenas Despesas</option>
          </select>

          {/* Situação */}
          <select
            className="form-select"
            style={{ flex: '1 1 140px', minHeight: 38 }}
            value={statusFilter}
            onChange={e => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            aria-label="Filtrar por situação"
          >
            <option value="all">Todas situações</option>
            <option value="pending">Pendentes</option>
            <option value="completed">Efetivadas (Pagas/Rec.)</option>
            <option value="overdue">Atrasadas</option>
            <option value="cancelled">Canceladas</option>
          </select>

          {/* Botão de Mais Filtros no Mobile */}
          <button
            className="btn btn-outline btn-sm"
            onClick={() => setShowFiltersMobile(!showFiltersMobile)}
            style={{ minHeight: 38 }}
          >
            <Filter size={16} />
            <span>Filtros</span>
          </button>

          {(searchQuery || typeFilter !== 'all' || statusFilter !== 'all' || categoryFilter !== 'all' || accountFilter !== 'all' || recurrenceFilter !== 'all') && (
            <button className="btn btn-sm btn-outline" onClick={resetFilters} style={{ minHeight: 38 }} title="Limpar todos os filtros">
              Limpar
            </button>
          )}
        </div>

        {/* Filtros Expandidos (Desktop e Mobile Toggle) */}
        <div
          style={{
            display: showFiltersMobile ? 'grid' : 'none',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 12,
            marginTop: 12,
            paddingTop: 12,
            borderTop: '1px solid var(--border-color)'
          }}
          className="filters-expanded"
        >
          {/* Categoria */}
          <div>
            <label className="form-label" style={{ fontSize: '0.75rem' }}>Categoria</label>
            <select
              className="form-select"
              value={categoryFilter}
              onChange={e => { setCategoryFilter(e.target.value); setCurrentPage(1); }}
            >
              <option value="all">Todas as categorias</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Conta */}
          <div>
            <label className="form-label" style={{ fontSize: '0.75rem' }}>Conta</label>
            <select
              className="form-select"
              value={accountFilter}
              onChange={e => { setAccountFilter(e.target.value); setCurrentPage(1); }}
            >
              <option value="all">Todas as contas</option>
              {accounts.map(a => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>

          {/* Recorrência */}
          <div>
            <label className="form-label" style={{ fontSize: '0.75rem' }}>Frequência</label>
            <select
              className="form-select"
              value={recurrenceFilter}
              onChange={e => { setRecurrenceFilter(e.target.value as any); setCurrentPage(1); }}
            >
              <option value="all">Todas as origens</option>
              <option value="recurrent">Apenas Recorrentes</option>
              <option value="occasional">Apenas Eventuais</option>
            </select>
          </div>

          {/* Ordenação */}
          <div>
            <label className="form-label" style={{ fontSize: '0.75rem' }}>Ordenar por</label>
            <select
              className="form-select"
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
            >
              <option value="date_desc">Data (Mais recente)</option>
              <option value="date_asc">Data (Mais antiga)</option>
              <option value="amount_desc">Valor (Maior)</option>
              <option value="amount_asc">Valor (Menor)</option>
            </select>
          </div>
        </div>
      </div>

      <style>{`
        @media (min-width: 1024px) {
          .filters-expanded {
            display: grid !important;
          }
        }
      `}</style>

      {/* Listagem de Lançamentos */}
      {filteredTransactions.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '48px 20px' }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              background: 'var(--bg-card-hover)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px auto',
              color: 'var(--text-muted)'
            }}
          >
            <Search size={26} />
          </div>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: 6 }}>
            Nenhum lançamento encontrado
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', maxWidth: 420, margin: '0 auto 20px auto' }}>
            Não encontramos nenhum registro com os filtros aplicados neste período. Tente alterar os filtros ou cadastre um novo lançamento.
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <button className="btn btn-outline" onClick={resetFilters}>
              Limpar Filtros
            </button>
            <button className="btn btn-primary" onClick={() => onOpenCreate('expense')}>
              Novo Lançamento
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* VISÃO DESKTOP: Tabela Rica */}
          <div className="card" style={{ padding: 0, overflow: 'hidden', display: 'none' }} id="desktop-table-container">
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Situação</th>
                    <th>Data Prevista</th>
                    <th>Descrição</th>
                    <th>Categoria</th>
                    <th>Conta</th>
                    <th style={{ textAlign: 'right' }}>Valor</th>
                    <th style={{ textAlign: 'center' }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedTransactions.map(t => {
                    const isLate = isOverdue(t, today);
                    const cat = categoryMap.get(t.category_id);
                    const accName = accountMap.get(t.account_id) || 'Conta';
                    const isIncome = t.type === 'income';

                    let badgeClass = 'badge-neutral';
                    let badgeLabel = 'Pendente';
                    if (t.status === 'completed') {
                      badgeClass = isIncome ? 'badge-income' : 'badge-expense';
                      badgeLabel = isIncome ? 'Recebida' : 'Paga';
                    } else if (t.status === 'cancelled') {
                      badgeClass = 'badge-neutral';
                      badgeLabel = 'Cancelada';
                    } else if (isLate) {
                      badgeClass = 'badge-warning';
                      badgeLabel = 'Atrasada';
                    }

                    return (
                      <tr key={t.id} style={{ opacity: t.status === 'cancelled' ? 0.5 : 1 }}>
                        <td>
                          <span className={`badge ${badgeClass}`}>{badgeLabel}</span>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{formatDateBR(t.expected_date)}</div>
                          {t.effective_date && (
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}>
                              Efetivado: {formatDateBR(t.effective_date)}
                            </div>
                          )}
                        </td>
                        <td>
                          <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{t.description}</div>
                          {t.notes && (
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t.notes}</div>
                          )}
                        </td>
                        <td>
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '2px 8px',
                              borderRadius: 'var(--radius-sm)',
                              background: cat?.color ? `${cat.color}20` : 'var(--bg-card-hover)',
                              color: cat?.color || 'var(--text-main)',
                              fontSize: '0.8125rem',
                              fontWeight: 600
                            }}
                          >
                            {cat?.name || 'Sem Categoria'}
                          </span>
                        </td>
                        <td style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>{accName}</td>
                        <td style={{ textAlign: 'right', fontWeight: 800, color: isIncome ? 'var(--income-color)' : 'var(--expense-color)' }}>
                          {isIncome ? '+' : '-'}{formatCurrency(t.amount)}
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                            {/* Efetivar / Desfazer */}
                            {t.status === 'pending' && (
                              <button
                                className="btn-icon"
                                title={isIncome ? 'Marcar como Recebido' : 'Marcar como Pago'}
                                onClick={() => {
                                  setCompletingId(t.id);
                                  setEffectiveDateInput(t.expected_date || today);
                                }}
                                style={{ color: isIncome ? 'var(--income-color)' : 'var(--expense-color)' }}
                              >
                                <CheckCircle size={16} />
                              </button>
                            )}
                            {t.status === 'completed' && (
                              <button
                                className="btn-icon"
                                title="Desfazer efetivação"
                                onClick={() => undoCompleteTransaction(t.id)}
                              >
                                <RotateCcw size={16} />
                              </button>
                            )}

                            {/* Editar */}
                            <button
                              className="btn-icon"
                              title="Editar"
                              onClick={() => onOpenEdit(t)}
                            >
                              <Edit2 size={16} />
                            </button>

                            {/* Duplicar */}
                            <button
                              className="btn-icon"
                              title="Duplicar lançamento"
                              onClick={() => duplicateTransaction(t.id)}
                            >
                              <Copy size={16} />
                            </button>

                            {/* Cancelar */}
                            {t.status !== 'cancelled' && (
                              <button
                                className="btn-icon"
                                title="Cancelar"
                                onClick={() => cancelTransaction(t.id)}
                              >
                                <XCircle size={16} />
                              </button>
                            )}

                            {/* Excluir */}
                            <button
                              className="btn-icon"
                              title="Excluir"
                              onClick={() => setDeletingId(t.id)}
                              style={{ color: 'var(--expense-color)' }}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <style>{`
            @media (min-width: 900px) {
              #desktop-table-container {
                display: block !important;
              }
              #mobile-cards-container {
                display: none !important;
              }
            }
          `}</style>

          {/* VISÃO MOBILE: Cards Otimizados para Toque */}
          <div id="mobile-cards-container" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {paginatedTransactions.map(t => {
              const isLate = isOverdue(t, today);
              const cat = categoryMap.get(t.category_id);
              const accName = accountMap.get(t.account_id) || 'Conta';
              const isIncome = t.type === 'income';

              let badgeClass = 'badge-neutral';
              let badgeLabel = 'Pendente';
              if (t.status === 'completed') {
                badgeClass = isIncome ? 'badge-income' : 'badge-expense';
                badgeLabel = isIncome ? 'Recebida' : 'Paga';
              } else if (t.status === 'cancelled') {
                badgeClass = 'badge-neutral';
                badgeLabel = 'Cancelada';
              } else if (isLate) {
                badgeClass = 'badge-warning';
                badgeLabel = 'Atrasada';
              }

              return (
                <div key={t.id} className="card" style={{ padding: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 4 }}>
                        <span className={`badge ${badgeClass}`}>{badgeLabel}</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}>
                          {formatDateBR(t.expected_date)}
                        </span>
                      </div>
                      <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-main)' }}>
                        {t.description}
                      </div>
                    </div>
                    <div
                      style={{
                        fontWeight: 800,
                        fontSize: '1.125rem',
                        color: isIncome ? 'var(--income-color)' : 'var(--expense-color)',
                        flexShrink: 0,
                        marginLeft: 10
                      }}
                    >
                      {isIncome ? '+' : '-'}{formatCurrency(t.amount)}
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: 12 }}>
                    <span>{cat?.name || 'Geral'}</span>
                    <span>{accName}</span>
                  </div>

                  {t.notes && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', marginBottom: 12, background: 'var(--bg-card-hover)', padding: '6px 10px', borderRadius: 'var(--radius-sm)' }}>
                      {t.notes}
                    </div>
                  )}

                  {/* Ações Mobile */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6, borderTop: '1px solid var(--border-color)', paddingTop: 10 }}>
                    {t.status === 'pending' && (
                      <button
                        className="btn btn-sm btn-outline"
                        style={{ color: isIncome ? 'var(--income-color)' : 'var(--expense-color)' }}
                        onClick={() => {
                          setCompletingId(t.id);
                          setEffectiveDateInput(t.expected_date || today);
                        }}
                      >
                        <CheckCircle size={14} />
                        <span>{isIncome ? 'Receber' : 'Pagar'}</span>
                      </button>
                    )}
                    {t.status === 'completed' && (
                      <button className="btn btn-sm btn-outline" onClick={() => undoCompleteTransaction(t.id)}>
                        <RotateCcw size={14} />
                        <span>Desfazer</span>
                      </button>
                    )}
                    <button className="btn btn-sm btn-outline" onClick={() => onOpenEdit(t)}>
                      <Edit2 size={14} />
                    </button>
                    <button className="btn btn-sm btn-outline" onClick={() => duplicateTransaction(t.id)}>
                      <Copy size={14} />
                    </button>
                    <button
                      className="btn btn-sm btn-danger-outline"
                      onClick={() => setDeletingId(t.id)}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Paginação */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 24 }}>
              <button
                className="btn btn-outline btn-sm"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              >
                Anterior
              </button>
              <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                Página {currentPage} de {totalPages}
              </span>
              <button
                className="btn btn-outline btn-sm"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              >
                Próxima
              </button>
            </div>
          )}
        </>
      )}

      {/* Modal de Confirmação de Exclusão */}
      <ConfirmDialog
        isOpen={!!deletingId}
        onClose={() => setDeletingId(null)}
        onConfirm={async () => {
          if (deletingId) {
            await deleteTransaction(deletingId);
            setDeletingId(null);
          }
        }}
        title="Excluir Lançamento"
        message="Tem certeza que deseja excluir este lançamento? Esta ação não pode ser desfeita. Se o lançamento for proveniente de uma recorrência, esta ocorrência não será mais recriada."
        confirmLabel="Excluir Definitivamente"
        isDestructive
      />

      {/* Modal de Confirmação de Data Efetiva (Recebimento/Pagamento) */}
      {completingId && (
        <div className="modal-overlay" onClick={() => setCompletingId(null)}>
          <div className="modal-content" style={{ maxWidth: '400px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.0625rem', fontWeight: 700 }}>Confirmar Efetivação</h3>
              <button className="btn-icon" onClick={() => setCompletingId(null)}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: 14 }}>
                Confirme a data em que o valor foi efetivamente recebido ou debitado:
              </p>
              <div className="form-group">
                <label className="form-label">Data Efetiva *</label>
                <input
                  type="date"
                  className="form-input"
                  value={effectiveDateInput}
                  onChange={e => setEffectiveDateInput(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setCompletingId(null)}>
                Cancelar
              </button>
              <button
                className="btn btn-primary"
                onClick={async () => {
                  if (completingId && effectiveDateInput) {
                    await completeTransaction(completingId, effectiveDateInput);
                    setCompletingId(null);
                  }
                }}
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
