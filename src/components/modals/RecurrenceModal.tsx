import React, { useEffect, useState } from 'react';
import { useFinance } from '../../context/FinanceContext';
import { Recurrence, RecurrenceFrequency, TransactionType } from '../../types';
import { todayString } from '../../utils/date';
import { CurrencyInput } from '../common/CurrencyInput';
import { Modal } from '../common/Modal';

interface RecurrenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingRecurrence?: Recurrence | null;
}

export const RecurrenceModal: React.FC<RecurrenceModalProps> = ({
  isOpen,
  onClose,
  editingRecurrence
}) => {
  const {
    accounts,
    categories,
    createRecurrence,
    updateRecurrence,
    isSubmitting
  } = useFinance();

  const [type, setType] = useState<TransactionType>('expense');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState<number>(0);
  const [accountId, setAccountId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [frequency, setFrequency] = useState<RecurrenceFrequency>('monthly');
  const [intervalStep, setIntervalStep] = useState<number>(1);
  const [startDate, setStartDate] = useState(todayString());
  const [endDate, setEndDate] = useState('');
  const [dayOfMonth, setDayOfMonth] = useState<number>(10);
  const [notes, setNotes] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [isAlways, setIsAlways] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const activeAccounts = accounts.filter(a => !a.is_archived);
  const filteredCategories = categories.filter(c => c.type === type && !c.is_archived);

  useEffect(() => {
    if (editingRecurrence) {
      setType(editingRecurrence.type);
      setDescription(editingRecurrence.description);
      setAmount(editingRecurrence.amount);
      setAccountId(editingRecurrence.account_id);
      setCategoryId(editingRecurrence.category_id);
      setFrequency(editingRecurrence.frequency);
      setIntervalStep(editingRecurrence.interval_step || 1);
      setStartDate(editingRecurrence.start_date);
      setEndDate(editingRecurrence.end_date || '');
      setDayOfMonth(editingRecurrence.day_of_month || parseInt(editingRecurrence.start_date.split('-')[2], 10));
      setNotes(editingRecurrence.notes || '');
      setIsActive(editingRecurrence.is_active);
      setIsAlways(false);
    } else {
      setType('expense');
      setDescription('');
      setAmount(0);
      setFrequency('monthly');
      setIntervalStep(1);
      setStartDate(todayString());
      setEndDate('');
      setDayOfMonth(10);
      setNotes('');
      setIsActive(true);
      setIsAlways(false);

      if (activeAccounts.length > 0) setAccountId(activeAccounts[0].id);
      const defaultCat = categories.find(c => c.type === 'expense' && !c.is_archived);
      if (defaultCat) setCategoryId(defaultCat.id);
    }
    setErrorMsg('');
  }, [editingRecurrence, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!description.trim()) {
      setErrorMsg('Informe a descrição da recorrência.');
      return;
    }
    if (amount <= 0) {
      setErrorMsg('O valor deve ser maior que zero.');
      return;
    }
    if (!accountId) {
      setErrorMsg('Selecione uma conta.');
      return;
    }
    if (!categoryId) {
      setErrorMsg('Selecione uma categoria.');
      return;
    }
    if (!isAlways && !startDate) {
      setErrorMsg('Informe a data inicial.');
      return;
    }

    try {
      if (editingRecurrence) {
        await updateRecurrence(editingRecurrence.id, {
          type,
          description: description.trim(),
          amount,
          account_id: accountId,
          category_id: categoryId,
          frequency,
          interval_step: intervalStep,
          start_date: startDate,
          end_date: endDate || undefined,
          day_of_month: frequency === 'monthly' ? dayOfMonth : undefined,
          notes: notes.trim() || undefined,
          is_active: isActive
        });
      } else {
        await createRecurrence({
          type,
          description: description.trim(),
          amount,
          account_id: accountId,
          category_id: categoryId,
          frequency,
          interval_step: intervalStep,
          start_date: startDate,
          end_date: endDate || undefined,
          day_of_month: frequency === 'monthly' ? dayOfMonth : undefined,
          notes: notes.trim() || undefined,
          is_active: isActive
        });
      }
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao salvar recorrência');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingRecurrence ? 'Editar Recorrência' : 'Cadastrar Recorrência'}
    >
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

        {/* Tipo */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <button
            type="button"
            className="btn"
            style={{
              flex: 1,
              background: type === 'income' ? 'var(--income-color)' : 'var(--bg-card-hover)',
              color: type === 'income' ? '#fff' : 'var(--text-muted)'
            }}
            onClick={() => setType('income')}
          >
            Receita Recorrente (+)
          </button>
          <button
            type="button"
            className="btn"
            style={{
              flex: 1,
              background: type === 'expense' ? 'var(--expense-color)' : 'var(--bg-card-hover)',
              color: type === 'expense' ? '#fff' : 'var(--text-muted)'
            }}
            onClick={() => setType('expense')}
          >
            Despesa Recorrente (-)
          </button>
        </div>

        {/* Descrição */}
        <div className="form-group">
          <label className="form-label">Descrição *</label>
          <input
            type="text"
            className="form-input"
            placeholder="Ex: Salário dia 5, Aluguel, Netflix..."
            value={description}
            onChange={e => setDescription(e.target.value)}
            required
          />
        </div>

        {/* Valor */}
        <div className="form-group">
          <label className="form-label">Valor (R$) *</label>
          <CurrencyInput value={amount} onChange={setAmount} required />
        </div>

        {/* Conta e Categoria */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="form-group">
            <label className="form-label">Conta *</label>
            <select
              className="form-select"
              value={accountId}
              onChange={e => setAccountId(e.target.value)}
              required
            >
              <option value="">Selecione...</option>
              {activeAccounts.map(acc => (
                <option key={acc.id} value={acc.id}>
                  {acc.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Categoria *</label>
            <select
              className="form-select"
              value={categoryId}
              onChange={e => setCategoryId(e.target.value)}
              required
            >
              <option value="">Selecione...</option>
              {filteredCategories.map(cat => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Frequência e Dia */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="form-group">
            <label className="form-label">Frequência *</label>
            <select
              className="form-select"
              value={frequency}
              onChange={e => setFrequency(e.target.value as RecurrenceFrequency)}
              required
            >
              <option value="daily">Diária</option>
              <option value="weekly">Semanal</option>
              <option value="monthly">Mensal</option>
              <option value="yearly">Anual</option>
            </select>
          </div>

          {frequency === 'monthly' ? (
            <div className="form-group">
              <label className="form-label">Dia do Mês (1 a 31) *</label>
              <input
                type="number"
                min={1}
                max={31}
                className="form-input"
                value={dayOfMonth}
                onChange={e => setDayOfMonth(parseInt(e.target.value, 10))}
                required
              />
            </div>
          ) : (
            <div className="form-group">
              <label className="form-label">A cada (intervalo) *</label>
              <input
                type="number"
                min={1}
                max={99}
                className="form-input"
                value={intervalStep}
                onChange={e => setIntervalStep(parseInt(e.target.value, 10))}
                required
              />
            </div>
          )}
        </div>

        {/* Datas Inicial e Final */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="form-group">
            <label className="form-label">Data de Início *</label>
            <input
              type="date"
              className="form-input"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              required={!isAlways}
              disabled={isAlways}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Término (opcional)</label>
            <input
              type="date"
              className="form-input"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              placeholder="Indefinido"
              disabled={isAlways}
            />
          </div>
        </div>

        <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
          <label className="toggle-switch">
            <input
              type="checkbox"
              id="isAlwaysRec"
              checked={isAlways}
              onChange={e => {
                setIsAlways(e.target.checked);
                if (e.target.checked) {
                  setStartDate(todayString());
                  setEndDate('');
                }
              }}
            />
            <span className="toggle-slider"></span>
          </label>
          <label htmlFor="isAlwaysRec" style={{ fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer' }}>
            Sempre
          </label>
        </div>

        {/* Situação */}
        <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
          <label className="toggle-switch">
            <input
              type="checkbox"
              id="isActiveRec"
              checked={isActive}
              onChange={e => setIsActive(e.target.checked)}
            />
            <span className="toggle-slider"></span>
          </label>
          <label htmlFor="isActiveRec" style={{ fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer' }}>
            Recorrência ativa (gerar lançamentos futuros)
          </label>
        </div>

        <div className="modal-footer" style={{ padding: '16px 0 0 0', marginTop: 12 }}>
          <button type="button" className="btn btn-outline" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </button>
          <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
            {isSubmitting ? 'Salvando...' : editingRecurrence ? 'Atualizar' : 'Salvar Recorrência'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
