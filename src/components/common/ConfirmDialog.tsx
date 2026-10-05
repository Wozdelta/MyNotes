import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Modal } from './Modal';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  isLoading?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  isDestructive = false,
  isLoading = false
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="420px">
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', marginBottom: 20 }}>
        {isDestructive && (
          <div
            style={{
              padding: 10,
              background: 'var(--expense-light)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--expense-color)',
              flexShrink: 0
            }}
          >
            <AlertTriangle size={24} />
          </div>
        )}
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9375rem', lineHeight: 1.5 }}>
          {message}
        </p>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
        <button type="button" className="btn btn-outline" onClick={onClose} disabled={isLoading}>
          {cancelLabel}
        </button>
        <button
          type="button"
          className={`btn ${isDestructive ? 'btn-expense' : 'btn-primary'}`}
          onClick={onConfirm}
          disabled={isLoading}
        >
          {isLoading ? 'Processando...' : confirmLabel}
        </button>
      </div>
    </Modal>
  );
};
