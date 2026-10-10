import React, { useState } from 'react';
import '../styles/recurrences.css';
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
import { salaryScheduleLabel } from '../utils/salarySchedule';

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
    if (rec.salary_schedule) return `${salaryScheduleLabel(rec.salary_schedule)}${rec.interval_step > 1 ? ` · A cada ${rec.interval_step} meses` : ''}`;
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
    <div className="page-wrapper recurrences-page">
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
          <span className="recurrence-eyebrow">SUA ROTINA FINANCEIRA</span>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
            Recorrências
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: 2 }}>
            Salário, aluguel e assinaturas. Tudo no seu ritmo.
          </p>
        </div>

        <button className="btn btn-primary" onClick={onOpenCreate}>
          <Plus size={18} />
          <span>Nova Recorrência</span>
        </button>
      </div>

      {/* Caixa Explicativa das Regras de Recorrência */}
      <details className="recurrence-explainer"><summary><Repeat size={18} />Como funciona?</summary><p>Cada repetição vira um lançamento pendente para você acompanhar. Valores já pagos ou recebidos são preservados. Uma ocorrência excluída não deve reaparecer.</p></details>

      {recurrences.length === 0 ? (
        <div className="card recurrence-empty">
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
            Menos repetição. Mais organização.
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', maxWidth: 420, margin: '0 auto 20px auto' }}>
            Comece com uma conta fixa ou um recebimento que se repete. Você pode pausar quando precisar.
          </p>
          <button className="btn btn-primary" onClick={onOpenCreate}>
            Criar minha primeira recorrência
          </button>
        </div>
      ) : (
        <div className="recurrence-grid">
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
