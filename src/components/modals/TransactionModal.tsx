import React, { useEffect, useState } from 'react';
import { useFinance } from '../../context/FinanceContext';
import { SalarySchedule, Transaction, TransactionStatus, TransactionType } from '../../types';
import { SalaryScheduleFields } from '../common/SalaryScheduleFields';
import { defaultSalarySchedule, isSalaryCategory, salaryDate } from '../../utils/salarySchedule';
import '../../styles/salary.css';
import { todayString } from '../../utils/date';
import { CurrencyInput } from '../common/CurrencyInput';
import { Modal } from '../common/Modal';
import { Select } from '../common/Select';
import { DateInput } from '../common/DateInput';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialType?: TransactionType;
  editingTransaction?: Transaction | null;
  defaultDate?: string;
}

export const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  onClose,
  initialType = 'expense',
  editingTransaction,
  defaultDate
}) => {
  const {
    accounts,
    categories,
    createTransaction,
    updateTransaction,
    isSubmitting
  } = useFinance();

  const [type, setType] = useState<TransactionType>(initialType);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState<number>(0);
  const [accountId, setAccountId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [expectedDate, setExpectedDate] = useState(defaultDate || todayString());
  const [status, setStatus] = useState<TransactionStatus>('pending');
  const [effectiveDate, setEffectiveDate] = useState('');
  const [notes, setNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [salarySchedule, setSalarySchedule] = useState<SalarySchedule>(defaultSalarySchedule());
  const [salaryMonth, setSalaryMonth] = useState((defaultDate || todayString()).slice(0, 7));
  const salarySelected = type === 'income' && isSalaryCategory(categories.find(c => c.id === categoryId)?.name);
  let calculatedDate = '', salaryError = '';
  if (salarySelected) {
    try { calculatedDate = salaryDate(salaryMonth, salarySchedule); }
    catch (err) { salaryError = err instanceof Error ? err.message : 'Confira a regra de salário.'; }
  }

  // Sincroniza estado com transação em edição ou valores padrões
  useEffect(() => {
    const referenceDate = editingTransaction?.expected_date || defaultDate || todayString();
    setSalarySchedule(editingTransaction?.salary_schedule || defaultSalarySchedule(Number(referenceDate.slice(8))));
    setSalaryMonth(editingTransaction?.salary_month || referenceDate.slice(0, 7));
    if (editingTransaction) {
      setType(editingTransaction.type);
      setDescription(editingTransaction.description);
      setAmount(editingTransaction.amount);
      setAccountId(editingTransaction.account_id);
      setCategoryId(editingTransaction.category_id);
      setExpectedDate(editingTransaction.expected_date);
      setStatus(editingTransaction.status);
      setEffectiveDate(editingTransaction.effective_date || '');
      setNotes(editingTransaction.notes || '');
    } else {
      setType(initialType);
      setDescription('');
      setAmount(0);
      setExpectedDate(defaultDate || todayString());
      setStatus('pending');
      setEffectiveDate('');
      setNotes('');

      // Define conta e categoria padrão se disponíveis
      const activeAccounts = accounts.filter(a => !a.is_archived);
      if (activeAccounts.length > 0) {
        setAccountId(activeAccounts[0].id);
      }
      const matchingCats = categories.filter(c => c.type === initialType && !c.is_archived);
      if (matchingCats.length > 0) {
        setCategoryId(matchingCats[0].id);
      }
    }
    setErrorMsg('');
  }, [editingTransaction, initialType, defaultDate, isOpen]);

  // Se trocar o tipo, atualiza categoria sugerida para aquele tipo
  const handleTypeChange = (newType: TransactionType) => {
    setType(newType);
    const matchingCats = categories.filter(c => c.type === newType && !c.is_archived);
    if (matchingCats.length > 0) {
      setCategoryId(matchingCats[0].id);
    } else {
      setCategoryId('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setErrorMsg('');
    if (salarySelected && salaryError) { setErrorMsg(salaryError); return; }

    if (!description.trim()) {
      setErrorMsg('Por favor, informe a descrição.');
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
    if (!expectedDate) {
      setErrorMsg('Informe a data prevista.');
      return;
    }
    if (status === 'completed' && !effectiveDate) {
      setErrorMsg('Informe a data efetiva do recebimento/pagamento.');
      return;
    }

    try {
      if (editingTransaction) {
        await updateTransaction(editingTransaction.id, {
          type,
          description: description.trim(),
          amount,
          account_id: accountId,
          category_id: categoryId,
          expected_date: salarySelected ? calculatedDate : expectedDate,
          salary_schedule: salarySelected ? salarySchedule : null,
          salary_month: salarySelected ? salaryMonth : null,
          status,
          effective_date: status === 'completed' ? effectiveDate : undefined,
          notes: notes.trim() || undefined
        });
      } else {
        await createTransaction({
          type,
          description: description.trim(),
          amount,
          account_id: accountId,
          category_id: categoryId,
          expected_date: salarySelected ? calculatedDate : expectedDate,
          salary_schedule: salarySelected ? salarySchedule : null,
          salary_month: salarySelected ? salaryMonth : null,
          status,
          effective_date: status === 'completed' ? effectiveDate : undefined,
          notes: notes.trim() || undefined
        });
      }
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao salvar lançamento');
    }
  };

  const filteredCategories = categories.filter(c => c.type === type && !c.is_archived);
  const activeAccounts = accounts.filter(a => !a.is_archived);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingTransaction ? 'Editar Lançamento' : type === 'income' ? 'Nova Entrada' : 'Nova Despesa'}
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

        {/* Alternador de Tipo (Entrada / Despesa) */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <button
            type="button"
            className="btn"
            style={{
              flex: 1,
              background: type === 'income' ? 'var(--income-color)' : 'var(--bg-card-hover)',
              color: type === 'income' ? '#fff' : 'var(--text-muted)',
              border: type === 'income' ? 'none' : '1px solid var(--border-color)'
            }}
            onClick={() => handleTypeChange('income')}
          >
            Entrada (+)
          </button>
          <button
            type="button"
            className="btn"
            style={{
              flex: 1,
              background: type === 'expense' ? 'var(--expense-color)' : 'var(--bg-card-hover)',
              color: type === 'expense' ? '#fff' : 'var(--text-muted)',
              border: type === 'expense' ? 'none' : '1px solid var(--border-color)'
            }}
            onClick={() => handleTypeChange('expense')}
          >
            Despesa (-)
          </button>
        </div>

        {/* Descrição */}
        <div className="form-group">
          <label className="form-label">Descrição *</label>
          <input
            type="text"
            className="form-input"
            placeholder="Ex: Salário, Aluguel, Supermercado..."
            value={description}
            onChange={e => setDescription(e.target.value)}
            required
            autoFocus
          />
        </div>

        {/* Valor */}
        <div className="form-group">
          <label className="form-label">Valor (R$) *</label>
          <CurrencyInput value={amount} onChange={setAmount} required />
        </div>

        {/* Conta e Categoria em 2 colunas */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="form-group">
            <label className="form-label">Conta *</label>
            <Select
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
            </Select>
          </div>

          <div className="form-group">
            <label className="form-label">Categoria *</label>
            <Select
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
            </Select>
          </div>
        </div>

        {salarySelected && <SalaryScheduleFields value={salarySchedule} onChange={setSalarySchedule} month={salaryMonth} onMonthChange={setSalaryMonth} />}

        {/* Data Prevista e Situação */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="form-group">
            <label className="form-label">Data Prevista *</label>
            <DateInput
              className="form-input"
              value={salarySelected ? calculatedDate : expectedDate}
              readOnly={salarySelected}
              onChange={e => setExpectedDate(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Situação *</label>
            <Select
              className="form-select"
              value={status}
              onChange={e => {
                const s = e.target.value as TransactionStatus;
                setStatus(s);
                if (s === 'completed' && !effectiveDate) {
                  setEffectiveDate((salarySelected ? calculatedDate : expectedDate) || todayString());
                }
              }}
              required
            >
              <option value="pending">
                {type === 'income' ? 'Prevista' : 'Pendente'}
              </option>
              <option value="completed">
                {type === 'income' ? 'Recebida' : 'Paga'}
              </option>
              <option value="cancelled">Cancelada</option>
            </Select>
          </div>
        </div>

        {/* Data Efetiva (Apenas se Efetivada/Recebida/Paga) */}
        {status === 'completed' && (
          <div className="form-group" style={{ animation: 'fadeIn 0.2s' }}>
            <label className="form-label">
              Data Efetiva {type === 'income' ? 'do Recebimento' : 'do Pagamento'} *
            </label>
            <DateInput
              className="form-input"
              value={effectiveDate}
              onChange={e => setEffectiveDate(e.target.value)}
              required
            />
          </div>
        )}

        {/* Observações */}
        <div className="form-group">
          <label className="form-label">Observações (opcional)</label>
          <textarea
            className="form-textarea"
            rows={2}
            placeholder="Detalhes adicionais..."
            value={notes}
            onChange={e => setNotes(e.target.value)}
          />
        </div>

        <div className="modal-footer" style={{ padding: '16px 0 0 0', marginTop: 12 }}>
          <button type="button" className="btn btn-outline" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </button>
          <button
            type="submit"
            className={`btn ${type === 'income' ? 'btn-income' : 'btn-expense'}`}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Salvando...' : editingTransaction ? 'Salvar Alterações' : 'Cadastrar'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
