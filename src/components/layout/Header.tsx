import React, { useEffect, useState } from 'react';
import {
  Calendar,
  ChevronDown,
  Database,
  Moon,
  PlusCircle,
  Sun,
  TrendingDown,
  TrendingUp,
  User
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { formatMonthYearBR, todayString } from '../../utils/date';

interface HeaderProps {
  onOpenNewTransaction: (type: 'income' | 'expense') => void;
  onOpenTransfer: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenNewTransaction,
  onOpenTransfer
}) => {
  const {
    user,
    isSupabaseOnline,
    periodFilter,
    setPeriodMode
  } = useFinance();

  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [showPeriodModal, setShowPeriodModal] = useState(false);
  const [customStart, setCustomStart] = useState(periodFilter.startDate);
  const [customEnd, setCustomEnd] = useState(periodFilter.endDate);

  useEffect(() => {
    const savedTheme = (localStorage.getItem('financas_pro_theme') as 'light' | 'dark') || 'light';
    setTheme(savedTheme);
    document.documentElement.setAttribute('data-theme', savedTheme);
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    localStorage.setItem('financas_pro_theme', nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
  };

  const handleApplyCustomPeriod = (e: React.FormEvent) => {
    e.preventDefault();
    if (customStart && customEnd) {
      setPeriodMode('custom', customStart, customEnd);
      setShowPeriodModal(false);
    }
  };

  return (
    <>
      <header className="app-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Seletor de Período */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Calendar size={18} color="var(--primary-color)" />
            <select
              className="form-select"
              value={periodFilter.mode}
              onChange={e => {
                const val = e.target.value as 'current_month' | 'previous_month' | 'custom';
                if (val === 'custom') {
                  setShowPeriodModal(true);
                } else {
                  setPeriodMode(val);
                }
              }}
              style={{
                padding: '6px 12px',
                minHeight: 36,
                fontSize: '0.875rem',
                fontWeight: 600,
                width: 'auto'
              }}
              aria-label="Selecionar período"
            >
              <option value="current_month">Mês Atual</option>
              <option value="previous_month">Mês Anterior</option>
              <option value="custom">Personalizado...</option>
            </select>
          </div>
        </div>

        {/* Lado Direito: Ações rápidas, status Supabase, Tema, Perfil */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Botões rápidos visíveis em telas médias e grandes */}
          <div style={{ display: 'none', gap: 8 }} className="desktop-actions tour-step-new-transaction">
            <button
              className="btn btn-income btn-sm"
              onClick={() => onOpenNewTransaction('income')}
              title="Registrar nova entrada"
            >
              <TrendingUp size={16} />
              <span>Entrada</span>
            </button>
            <button
              className="btn btn-expense btn-sm"
              onClick={() => onOpenNewTransaction('expense')}
              title="Registrar nova despesa"
            >
              <TrendingDown size={16} />
              <span>Despesa</span>
            </button>
          </div>

          <style>{`
            @media (min-width: 640px) {
              .desktop-actions {
                display: flex !important;
              }
            }
          `}</style>

          {/* Badge de Conexão Supabase */}
          <div
            className={`badge ${isSupabaseOnline ? 'badge-income' : 'badge-neutral'}`}
            title={
              isSupabaseOnline
                ? 'Conectado diretamente ao Supabase com RLS e Auth'
                : 'Rodando com armazenamento local seguro (configure o .env com suas chaves do Supabase quando desejar)'
            }
            style={{ fontSize: '0.75rem', cursor: 'default' }}
          >
            <Database size={12} />
            <span style={{ display: 'none' }} className="db-label">
              {isSupabaseOnline ? 'Supabase' : 'Modo Local'}
            </span>
          </div>

          <style>{`
            @media (min-width: 768px) {
              .db-label {
                display: inline !important;
              }
            }
          `}</style>

          {/* Alternar Tema */}
          <button
            className="btn-icon tour-step-theme"
            onClick={toggleTheme}
            aria-label="Alternar tema claro e escuro"
            title={theme === 'light' ? 'Mudar para tema escuro' : 'Mudar para tema claro'}
          >
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>
        </div>
      </header>

      {/* Modal de Intervalo Personalizado */}
      {showPeriodModal && (
        <div className="modal-overlay" onClick={() => setShowPeriodModal(false)}>
          <div
            className="modal-content"
            style={{ maxWidth: '400px' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2 style={{ fontSize: '1rem', fontWeight: 700 }}>Intervalo Personalizado</h2>
              <button
                className="btn-icon"
                onClick={() => setShowPeriodModal(false)}
                style={{ width: 30, height: 30 }}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleApplyCustomPeriod}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Data Inicial</label>
                  <input
                    type="date"
                    className="form-input"
                    value={customStart}
                    onChange={e => setCustomStart(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Data Final</label>
                  <input
                    type="date"
                    className="form-input"
                    value={customEnd}
                    onChange={e => setCustomEnd(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setShowPeriodModal(false)}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  Aplicar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
