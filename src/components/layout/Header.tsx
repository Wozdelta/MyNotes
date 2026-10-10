import React, { useEffect, useState } from 'react';
import {
  Calendar,
  ChevronDown,
  Moon,
  PlusCircle,
  Sun,
  TrendingDown,
  TrendingUp,
  User
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { Select } from '../common/Select';
import { DateInput } from '../common/DateInput';
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
            <Select
              className="form-select"
              value={periodFilter.mode}
              onChange={e => {
                const val = e.target.value as 'current_month' | 'previous_month' | 'custom' | 'next_30' | 'next_60' | 'next_120';
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
              <option value="next_30">Próximos 30 dias</option>
              <option value="next_60">Próximos 60 dias</option>
              <option value="next_120">Próximos 120 dias</option>
              <option value="custom">Personalizado...</option>
            </Select>
          </div>
        </div>

        {/* Lado Direito: Ações rápidas e Tema */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Botões rápidos visíveis em telas médias e grandes */}
          <div style={{ display: 'none', gap: 8 }} className="desktop-actions tour-step-new-transaction">
            <button
              className="btn btn-income btn-sm"
              onClick={() => onOpenNewTransaction('income')}
              title="Registrar nova entrada"
              data-guide="income-create"
            >
              <TrendingUp size={16} />
              <span>Entrada</span>
            </button>
            <button
              className="btn btn-expense btn-sm"
              onClick={() => onOpenNewTransaction('expense')}
              title="Registrar nova despesa"
              data-guide="expense-create"
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
                  <DateInput
                    className="form-input"
                    value={customStart}
                    onChange={e => setCustomStart(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Data Final</label>
                  <DateInput
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
