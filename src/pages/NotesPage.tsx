import React, { useState } from 'react';
import '../styles/notes.css';
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
import { Select } from '../components/common/Select';
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
    <div className="page-wrapper notes-page">
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
          <span className="notes-eyebrow">ESPAÇO PARA SUAS IDEIAS</span>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
            Anotações
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: 2 }}>
            Guarde ideias de hoje. Planeje os próximos passos.
          </p>
        </div>

        <button className="btn btn-primary" onClick={onOpenCreate}>
          <Plus size={18} />
          <span>Nova Anotação</span>
        </button>
      </div>

      {/* Explicação da Regra Financeira */}
      <div className="notes-tip">
        <Sparkles size={20} />
        <div><strong>Planeje sem mexer no saldo</strong><p>Uma ideia só entra nas suas finanças quando você a transforma em lançamento.</p></div>
      </div>

      {/* Filtros e Busca */}
      <div className="card notes-filters">
        <div className="notes-filter-grid">
          <div className="notes-search">
            <Search
              size={16}
              style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-subtle)' }}
            />
            <input
              type="text"
              className="form-input"
              style={{ paddingLeft: 36, minHeight: 38 }}
              placeholder="Buscar uma ideia..."
              aria-label="Buscar anotações"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <Select
            className="form-select"
            style={{ minWidth: 0, minHeight: 44 }}
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            aria-label="Filtrar por tipo de anotação"
          >
            <option value="all">Todos os tipos</option>
            <option value="possible_income">Possível Entrada</option>
            <option value="possible_expense">Possível Despesa</option>
            <option value="note">Lembrete</option>
          </Select>

          <Select
            className="form-select"
            style={{ minWidth: 0, minHeight: 44 }}
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            aria-label="Filtrar por status"
          >
            <option value="open">Em Aberto</option>
            <option value="converted">Convertidas</option>
            <option value="discarded">Descartadas</option>
            <option value="all">Todas situações</option>
          </Select>
        </div>
      </div>

      {/* Grid de Cards de Anotação */}
      {filteredNotes.length === 0 ? (
        <div className="card notes-empty">
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
            {notes.length === 0 ? 'Uma ideia pode ser o começo' : 'Nenhuma ideia por aqui'}
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', maxWidth: 420, margin: '0 auto 20px auto' }}>
            {notes.length === 0 ? 'Uma viagem, um conserto ou uma renda extra. Guarde aqui o que você quer planejar.' : 'Não encontramos anotações com esses filtros. Experimente outra busca.'}
          </p>
          <button className="btn btn-primary" onClick={notes.length === 0 ? onOpenCreate : () => { setSearch(''); setFilterType('all'); setFilterStatus('all'); }}>
            {notes.length === 0 ? 'Anotar minha primeira ideia' : 'Limpar filtros'}
          </button>
        </div>
      ) : (
        <div className="notes-grid">
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
                className={`card note-card ${isIncome ? 'note-income' : isExpense ? 'note-expense' : 'note-reminder'}`}
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
                  className="note-card-actions"
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
                      <span>Criar lançamento</span>
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
