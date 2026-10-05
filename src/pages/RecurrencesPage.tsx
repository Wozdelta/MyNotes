import React, { useState } from 'react';
import {
  Calendar,
  CheckCircle2,
  Clock,
  Edit2,
  Pause,
  Play,
  Plus,
  Repeat,
  Trash2
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { Recurrence } from '../types';
import { formatDateBR } from '../utils/date';
import { formatCurrency } from '../utils/finance';

interface RecurrencesPageProps {
  onOpenCreate: () => void;
  onOpenEdit: (recurrence: Recurrence) => void;
}

export const RecurrencesPage: React.FC<RecurrencesPageProps> = ({
  onOpenCreate,
  onOpenEdit
}) => {
  const { recurrences, categories, accounts, updateRecurrence } = useFinance();

  const categoryMap = new Map(categories.map(c => [c.id, c.name]));
  const accountMap = new Map(accounts.map(a => [a.id, a.name]));

  const getFrequencyLabel = (rec: Recurrence) => {
    switch (rec.frequency) {
      case 'daily':
        return rec.interval_step > 1 ? `A cada ${rec.interval_step} dias` : 'Diária';
      case 'weekly':
        return rec.interval_step > 1 ? `A cada ${rec.interval_step} semanas` : 'Semanal';
      case 'monthly':
        return `Mensal (Todo dia ${rec.day_of_month || 'fixo'})`;
      case 'yearly':
        return 'Anual';
      default:
        return 'Recorrente';
    }
  };

  const handleTogglePause = async (rec: Recurrence) => {
    await updateRecurrence(rec.id, { is_active: !rec.is_active });
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
          marginBottom: 20
        }}
      >
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
            Recorrências
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: 2 }}>
            Gerencie suas receitas e despesas automáticas (salários, aluguéis, assinaturas e parcelas).
          </p>
        </div>

        <button className="btn btn-primary" onClick={onOpenCreate}>
          <Plus size={18} />
          <span>Nova Recorrência</span>
        </button>
      </div>

      {/* Caixa Explicativa das Regras de Recorrência */}
      <div
        style={{
          background: 'var(--primary-light)',
          border: '1px solid rgba(2, 132, 199, 0.25)',
          borderRadius: 'var(--radius-md)',
          padding: '14px 18px',
          marginBottom: 20,
          fontSize: '0.875rem',
          color: 'var(--text-main)',
          lineHeight: 1.6
        }}
      >
        <strong>Como funcionam as ocorrências:</strong> Cada repetição gera um lançamento individual que nasce como
        previsto ou pendente. Ocorrências já pagas ou recebidas nunca são sobrescritas. Se você excluir uma ocorrência
        específica, o sistema registra uma proteção para que ela não reapareça ao recarregar a página.
      </div>

      {recurrences.length === 0 ? (
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
            <Repeat size={26} />
          </div>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: 6 }}>
            Nenhuma recorrência cadastrada
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', maxWidth: 420, margin: '0 auto 20px auto' }}>
            Cadastre pagamentos ou recebimentos que acontecem periodicamente para prever seu saldo futuro com exatidão.
          </p>
          <button className="btn btn-primary" onClick={onOpenCreate}>
            Cadastrar Primeira Recorrência
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
          {recurrences.map(rec => {
            const isIncome = rec.type === 'income';
            const catName = categoryMap.get(rec.category_id) || 'Sem Categoria';
            const accName = accountMap.get(rec.account_id) || 'Conta Principal';

            return (
              <div
                key={rec.id}
                className="card"
                style={{
                  borderLeft: `4px solid ${isIncome ? 'var(--income-color)' : 'var(--expense-color)'}`,
                  opacity: rec.is_active ? 1 : 0.65
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <span className={`badge ${isIncome ? 'badge-income' : 'badge-expense'}`}>
                        {isIncome ? 'Receita Recorrente' : 'Despesa Recorrente'}
                      </span>
                      <span className={`badge ${rec.is_active ? 'badge-income' : 'badge-neutral'}`}>
                        {rec.is_active ? 'Ativa' : 'Pausada'}
                      </span>
                    </div>
                    <h3 style={{ fontSize: '1.0625rem', fontWeight: 700 }}>{rec.description}</h3>
                  </div>

                  <div
                    style={{
                      fontSize: '1.25rem',
                      fontWeight: 800,
                      color: isIncome ? 'var(--income-color)' : 'var(--expense-color)'
                    }}
                  >
                    {isIncome ? '+' : '-'}{formatCurrency(rec.amount)}
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Repeat size={14} color="var(--primary-color)" />
                    <span>{getFrequencyLabel(rec)}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Calendar size={14} />
                    <span>Início em {formatDateBR(rec.start_date)} {rec.end_date ? `até ${formatDateBR(rec.end_date)}` : '(indeterminado)'}</span>
                  </div>
                  <div>
                    {catName} • {accName}
                  </div>
                  {rec.notes && <div style={{ fontStyle: 'italic', marginTop: 4 }}>{rec.notes}</div>}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, borderTop: '1px solid var(--border-color)', paddingTop: 12 }}>
                  <button
                    className="btn btn-outline btn-sm"
                    onClick={() => handleTogglePause(rec)}
                    title={rec.is_active ? 'Pausar geração de novas ocorrências' : 'Retomar recorrência'}
                  >
                    {rec.is_active ? <Pause size={14} /> : <Play size={14} />}
                    <span>{rec.is_active ? 'Pausar' : 'Retomar'}</span>
                  </button>

                  <button className="btn btn-outline btn-sm" onClick={() => onOpenEdit(rec)}>
                    <Edit2 size={14} />
                    <span>Editar</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
