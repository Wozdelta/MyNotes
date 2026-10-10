import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: string;
  variant?: 'default' | 'action-sheet';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = '540px',
  variant = 'default'
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className={`modal-overlay ${variant === 'action-sheet' ? 'action-sheet-overlay' : ''}`} onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div
        className={`modal-content ${variant === 'action-sheet' ? 'action-sheet' : ''}`}
        style={{ maxWidth }}
        onClick={e => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2 id="modal-title" style={{ fontSize: '1.125rem', fontWeight: 700 }}>
            {title}
          </h2>
          <button
            onClick={onClose}
            className="btn-icon"
            aria-label="Fechar"
            style={{ width: 32, height: 32 }}
          >
            <X size={18} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
};
