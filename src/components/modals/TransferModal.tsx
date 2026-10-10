import React, { useEffect, useState } from 'react';
import { ArrowLeftRight } from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { todayString } from '../../utils/date';
import { CurrencyInput } from '../common/CurrencyInput';
import { Modal } from '../common/Modal';
import { Select } from '../common/Select';
import { DateInput } from '../common/DateInput';

interface TransferModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TransferModal: React.FC<TransferModalProps> = ({ isOpen, onClose }) => {
  const { accounts, createTransfer, isSubmitting } = useFinance();

  const [originId, setOriginId] = useState('');
  const [destId, setDestId] = useState('');
  const [amount, setAmount] = useState<number>(0);
  const [date, setDate] = useState(todayString());
  const [notes, setNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const activeAccounts = accounts.filter(a => !a.is_archived);

  useEffect(() => {
    if (activeAccounts.length >= 2) {
      setOriginId(activeAccounts[0].id);
      setDestId(activeAccounts[1].id);
    } else if (activeAccounts.length === 1) {
      setOriginId(activeAccounts[0].id);
    }
    setAmount(0);
    setDate(todayString());
    setNotes('');
    setErrorMsg('');
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!originId || !destId) {
      setErrorMsg('Selecione as contas de origem e destino.');
      return;
    }
    if (originId === destId) {
      setErrorMsg('A conta de origem e destino não podem ser as mesmas.');
      return;
    }
    if (amount <= 0) {
      setErrorMsg('Informe um valor de transferência maior que zero.');
      return;
    }

    try {
      await createTransfer({
        origin_account_id: originId,
        destination_account_id: destId,
        amount,
        transfer_date: date,
        notes: notes.trim() || undefined
      });
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao realizar transferência');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Transferência entre Contas" maxWidth="480px">
      <form onSubmit={handleSubmit}>
        {errorMsg && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--expense-light)',
              color: 'var(--expense-color)',
              fontSize: '0.875rem',
              marginBottom: 16
            }}
          >
            {errorMsg}
          </div>
        )}

        <div style={{ padding: 12, background: 'var(--primary-light)', borderRadius: 'var(--radius-md)', marginBottom: 16, fontSize: '0.8125rem', color: 'var(--primary-color)' }}>
          Transferências movimentam saldos entre suas contas sem alterar seu resultado financeiro ou total de receitas/despesas.
        </div>

        {/* Origem e Destino */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 8, alignItems: 'center', marginBottom: 16 }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Origem (Sai)</label>
            <Select
              className="form-select"
              value={originId}
              onChange={e => setOriginId(e.target.value)}
              required
            >
              <option value="">Selecione...</option>
              {activeAccounts.map(acc => (
                <option key={acc.id} value={acc.id} disabled={acc.id === destId}>
                  {acc.name}
                </option>
              ))}
            </Select>
          </div>

          <div style={{ marginTop: 22, color: 'var(--text-muted)' }}>
            <ArrowLeftRight size={18} />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Destino (Entra)</label>
            <Select
              className="form-select"
              value={destId}
              onChange={e => setDestId(e.target.value)}
              required
            >
              <option value="">Selecione...</option>
              {activeAccounts.map(acc => (
                <option key={acc.id} value={acc.id} disabled={acc.id === originId}>
                  {acc.name}
                </option>
              ))}
            </Select>
          </div>
        </div>

        {/* Valor */}
        <div className="form-group">
          <label className="form-label">Valor (R$) *</label>
          <CurrencyInput value={amount} onChange={setAmount} required />
        </div>

        {/* Data */}
        <div className="form-group">
          <label className="form-label">Data da Transferência *</label>
          <DateInput
            className="form-input"
            value={date}
            onChange={e => setDate(e.target.value)}
            required
          />
        </div>

        {/* Observações */}
        <div className="form-group">
          <label className="form-label">Observações (opcional)</label>
          <input
            type="text"
            className="form-input"
            placeholder="Ex: Aplicação na reserva, Pix próprio..."
            value={notes}
            onChange={e => setNotes(e.target.value)}
          />
        </div>

        <div className="modal-footer" style={{ padding: '16px 0 0 0', marginTop: 12 }}>
          <button type="button" className="btn btn-outline" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </button>
          <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
            {isSubmitting ? 'Transferindo...' : 'Efetivar Transferência'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
