import React from 'react';
import { AlertCircle, CheckCircle, Info, X } from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useFinance();

  if (toasts.length === 0) return null;

  return (
    <div className="toast-container" aria-live="polite">
      {toasts.map(t => {
        let Icon = CheckCircle;
        let iconColor = 'var(--income-color)';

        if (t.type === 'error') {
          Icon = AlertCircle;
          iconColor = 'var(--expense-color)';
        } else if (t.type === 'info') {
          Icon = Info;
          iconColor = 'var(--primary-color)';
        }

        return (
          <div key={t.id} className={`toast toast-${t.type}`} role="alert">
            <Icon size={20} color={iconColor} style={{ flexShrink: 0 }} />
            <div style={{ flex: 1, wordBreak: 'break-word' }}>{t.message}</div>
            <button
              onClick={() => removeToast(t.id)}
              style={{ color: 'var(--text-subtle)', padding: 4 }}
              aria-label="Fechar notificação"
            >
              <X size={16} />
            </button>
          </div>
        );
      })}
    </div>
  );
};
