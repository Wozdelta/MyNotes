import React, { useState } from 'react';
import {
  ArrowRightCircle,
  CheckCircle,
  Clock,
  Edit2,
  FileText,
  Plus,
  Search,
  Sparkles,
  Trash2,
  XCircle
} from 'lucide-react';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { useFinance } from '../context/FinanceContext';
import { FinancialNote, NoteType } from '../types';
import { formatCurrency } from '../utils/finance';

interface NotesPageProps {
  onOpenCreate: () => void;
  onOpenEdit: (note: FinancialNote) => void;
  onOpenConvert: (note: FinancialNote) => void;
}

export const NotesPage: React.FC<NotesPageProps> = ({
  onOpenCreate,
  onOpenEdit,
  onOpenConvert
}) => {
  const { notes, categories, updateNote, deleteNote } = useFinance();

  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('open');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const categoryMap = new Map(categories.map(c => [c.id, c.name]));

  const filteredNotes = notes.filter(n => {
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchTitle = n.title.toLowerCase().includes(q);
      const matchNotes = n.notes?.toLowerCase().includes(q) || false;
      if (!matchTitle && !matchNotes) return false;
    }
    if (filterType !== 'all' && n.type !== filterType) return false;
    if (filterStatus !== 'all' && n.status !== filterStatus) return false;
    return true;
  });

  const handleDiscard = async (note: FinancialNote) => {
    await updateNote(note.id, { status: 'discarded' });
  };

  const handleReopen = async (note: FinancialNote) => {
    await updateNote(note.id, { status: 'open' });
  };

  return (
    <div className="page-wrapper">
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
            Anotações & Possibilidades
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: 2 }}>
            Planeje gastos e receitas que ainda não têm data confirmada (ex: trocas de pneus, manutenções, freelas).
          </p>
        </div>

        <button className="btn btn-primary" onClick={onOpenCreate}>
          <Plus size={18} />
          <span>Nova Anotação</span>
        </button>
      </div>

      {/* Explicação da Regra Financeira */}
      <div
        style={{
          background: 'var(--bg-card-hover)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-md)',
          padding: '12px 16px',
          marginBottom: 20,
          fontSize: '0.8125rem',
          color: 'var(--text-muted)'
        }}
      >
        💡 <strong>Nota de precisão:</strong> As anotações não afetam seu saldo atual ou resultado financeiro principal até que você decida transformá-las em um lançamento real.
      </div>

      {/* Filtros e Busca */}
      <div className="card" style={{ padding: 14, marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: '1 1 200px' }}>
            <Search
              size={16}
              style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-subtle)' }}
            />
            <input
              type="text"
              className="form-input"
              style={{ paddingLeft: 36, minHeight: 38 }}
              placeholder="Buscar anotações ou ideias..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <select
            className="form-select"
            style={{ flex: '1 1 140px', minHeight: 38 }}
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            aria-label="Filtrar por tipo de anotação"
          >
            <option value="all">Todos os tipos</option>
            <option value="possible_income">Possível Entrada</option>
            <option value="possible_expense">Possível Despesa</option>
            <option value="note">Lembrete</option>
          </select>

          <select
            className="form-select"
            style={{ flex: '1 1 140px', minHeight: 38 }}
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            aria-label="Filtrar por status"
          >
            <option value="open">Em Aberto</option>
            <option value="converted">Convertidas em Lançamento</option>
            <option value="discarded">Descartadas</option>
            <option value="all">Todas situações</option>
          </select>
        </div>
      </div>

      {/* Grid de Cards de Anotação */}
      {filteredNotes.length === 0 ? (
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
            <FileText size={26} />
          </div>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: 6 }}>
            Nenhuma anotação nesta categoria
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', maxWidth: 420, margin: '0 auto 20px auto' }}>
            Anote projetos futuros, manutenções previstas ou oportunidades sem data definida para não esquecer.
          </p>
          <button className="btn btn-primary" onClick={onOpenCreate}>
            Criar Primeira Anotação
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
          {filteredNotes.map(n => {
            const isIncome = n.type === 'possible_income';
            const isExpense = n.type === 'possible_expense';
            const catName = n.category_id ? categoryMap.get(n.category_id) : null;

            let badgeClass = 'badge-neutral';
            let badgeText = 'Lembrete';
            if (isIncome) {
              badgeClass = 'badge-income';
              badgeText = 'Possível Entrada';
            } else if (isExpense) {
              badgeClass = 'badge-expense';
              badgeText = 'Possível Gasto';
            }

            return (
              <div
                key={n.id}
                className="card"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  opacity: n.status === 'discarded' ? 0.6 : 1
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                    <span className={`badge ${badgeClass}`}>{badgeText}</span>
                    <span className={`badge ${n.status === 'converted' ? 'badge-income' : n.status === 'discarded' ? 'badge-neutral' : 'badge-warning'}`}>
                      {n.status === 'converted' ? 'Convertida' : n.status === 'discarded' ? 'Descartada' : 'Em Aberto'}
                    </span>
                  </div>

                  <h3 style={{ fontSize: '1.0625rem', fontWeight: 700, marginBottom: 8 }}>
                    {n.title}
                  </h3>

                  {n.estimated_amount !== undefined && n.estimated_amount > 0 && (
                    <div
                      style={{
                        fontSize: '1.25rem',
                        fontWeight: 800,
                        color: isIncome ? 'var(--income-color)' : isExpense ? 'var(--expense-color)' : 'var(--text-main)',
                        marginBottom: 8
                      }}
                    >
                      ~ {formatCurrency(n.estimated_amount)}
                    </div>
                  )}

                  {catName && (
                    <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: 8 }}>
                      Categoria sugerida: <strong>{catName}</strong>
                    </div>
                  )}

                  {n.notes && (
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.5, background: 'var(--bg-card-hover)', padding: '8px 12px', borderRadius: 'var(--radius-sm)' }}>
                      {n.notes}
                    </p>
                  )}
                </div>

                {/* Ações do Card */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginTop: 16,
                    paddingTop: 12,
                    borderTop: '1px solid var(--border-color)'
                  }}
                >
                  {/* Se estiver em aberto: botão de transformar em lançamento real */}
                  {n.status === 'open' ? (
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => onOpenConvert(n)}
                      title="Transformar em lançamento real no extrato"
                    >
                      <Sparkles size={14} />
                      <span>Transformar em Lançamento</span>
                    </button>
                  ) : n.status === 'converted' ? (
                    <span style={{ fontSize: '0.75rem', color: 'var(--income-color)', fontWeight: 600 }}>
                      ✓ Já registrado no extrato
                    </span>
                  ) : (
                    <button className="btn btn-outline btn-sm" onClick={() => handleReopen(n)}>
                      Reabrir
                    </button>
                  )}

                  <div style={{ display: 'flex', gap: 4 }}>
                    {n.status === 'open' && (
                      <button className="btn-icon" title="Editar" onClick={() => onOpenEdit(n)} style={{ width: 32, height: 32 }}>
                        <Edit2 size={15} />
                      </button>
                    )}
                    {n.status === 'open' && (
                      <button className="btn-icon" title="Descartar" onClick={() => handleDiscard(n)} style={{ width: 32, height: 32 }}>
                        <XCircle size={15} />
                      </button>
                    )}
                    <button
                      className="btn-icon"
                      title="Excluir definitivamente"
                      onClick={() => setDeletingId(n.id)}
                      style={{ width: 32, height: 32, color: 'var(--expense-color)' }}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Confirmação de exclusão */}
      <ConfirmDialog
        isOpen={!!deletingId}
        onClose={() => setDeletingId(null)}
        onConfirm={async () => {
          if (deletingId) {
            await deleteNote(deletingId);
            setDeletingId(null);
          }
        }}
        title="Excluir Anotação"
        message="Deseja excluir esta anotação definitivamente?"
        confirmLabel="Excluir"
        isDestructive
      />
    </div>
  );
};
