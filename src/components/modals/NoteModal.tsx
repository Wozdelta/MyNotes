import React, { useEffect, useState } from 'react';
import { useFinance } from '../../context/FinanceContext';
import { FinancialNote, NoteType } from '../../types';
import { todayString } from '../../utils/date';
import { CurrencyInput } from '../common/CurrencyInput';
import { Modal } from '../common/Modal';

interface NoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingNote?: FinancialNote | null;
  convertingNote?: FinancialNote | null;
}

export const NoteModal: React.FC<NoteModalProps> = ({
  isOpen,
  onClose,
  editingNote,
  convertingNote
}) => {
  const {
    accounts,
    categories,
    createNote,
    updateNote,
    convertNoteToTransaction,
    isSubmitting
  } = useFinance();

  // Estados para Criação/Edição de Anotação
  const [title, setTitle] = useState('');
  const [type, setType] = useState<NoteType>('possible_expense');
  const [estimatedAmount, setEstimatedAmount] = useState<number>(0);
  const [categoryId, setCategoryId] = useState('');
  const [notes, setNotes] = useState('');

  // Estados adicionais para Conversão em Lançamento
  const [convertAccountId, setConvertAccountId] = useState('');
  const [convertCategoryId, setConvertCategoryId] = useState('');
  const [convertExpectedDate, setConvertExpectedDate] = useState(todayString());
  const [convertAmount, setConvertAmount] = useState<number>(0);
  const [convertDescription, setConvertDescription] = useState('');

  const [errorMsg, setErrorMsg] = useState('');

  const activeAccounts = accounts.filter(a => !a.is_archived);

  useEffect(() => {
    setErrorMsg('');
    if (convertingNote) {
      setConvertDescription(convertingNote.title);
      setConvertAmount(convertingNote.estimated_amount || 0);
      setConvertExpectedDate(todayString());
      if (activeAccounts.length > 0) setConvertAccountId(activeAccounts[0].id);
      if (convertingNote.category_id) {
        setConvertCategoryId(convertingNote.category_id);
      } else {
        const txType = convertingNote.type === 'possible_income' ? 'income' : 'expense';
        const defaultCat = categories.find(c => c.type === txType && !c.is_archived);
        if (defaultCat) setConvertCategoryId(defaultCat.id);
      }
    } else if (editingNote) {
      setTitle(editingNote.title);
      setType(editingNote.type);
      setEstimatedAmount(editingNote.estimated_amount || 0);
      setCategoryId(editingNote.category_id || '');
      setNotes(editingNote.notes || '');
    } else {
      setTitle('');
      setType('possible_expense');
      setEstimatedAmount(0);
      setCategoryId('');
      setNotes('');
    }
  }, [editingNote, convertingNote, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (convertingNote) {
      // Validações de Conversão
      if (!convertAccountId) {
        setErrorMsg('Selecione uma conta para o lançamento.');
        return;
      }
      if (!convertCategoryId) {
        setErrorMsg('Selecione uma categoria para o lançamento.');
        return;
      }
      if (convertAmount <= 0) {
        setErrorMsg('Informe um valor maior que zero.');
        return;
      }
      if (!convertExpectedDate) {
        setErrorMsg('Informe a data prevista.');
        return;
      }

      try {
        await convertNoteToTransaction(convertingNote.id, {
          account_id: convertAccountId,
          category_id: convertCategoryId,
          amount: convertAmount,
          expected_date: convertExpectedDate,
          description: convertDescription.trim(),
          notes: convertingNote.notes
        });
        onClose();
      } catch (err: any) {
        setErrorMsg(err.message || 'Erro ao converter anotação');
      }
      return;
    }

    // Criação / Edição normal de anotação
    if (!title.trim()) {
      setErrorMsg('Informe o título da anotação.');
      return;
    }

    try {
      if (editingNote) {
        await updateNote(editingNote.id, {
          title: title.trim(),
          type,
          estimated_amount: estimatedAmount > 0 ? estimatedAmount : undefined,
          category_id: categoryId || undefined,
          notes: notes.trim() || undefined
        });
      } else {
        await createNote({
          title: title.trim(),
          type,
          estimated_amount: estimatedAmount > 0 ? estimatedAmount : undefined,
          category_id: categoryId || undefined,
          notes: notes.trim() || undefined,
          status: 'open'
        });
      }
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao salvar anotação');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        convertingNote
          ? 'Transformar Anotação em Lançamento Real'
          : editingNote
          ? 'Editar Anotação'
          : 'Nova Anotação ou Possibilidade'
      }
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

        {convertingNote ? (
          /* MODO CONVERSÃO */
          <>
            <div
              style={{
                padding: 12,
                borderRadius: 'var(--radius-md)',
                background: 'var(--income-light)',
                color: 'var(--income-color)',
                fontSize: '0.8125rem',
                marginBottom: 16
              }}
            >
              Esta ação criará um lançamento no extrato e marcará esta anotação como convertida.
            </div>

            <div className="form-group">
              <label className="form-label">Descrição do Lançamento *</label>
              <input
                type="text"
                className="form-input"
                value={convertDescription}
                onChange={e => setConvertDescription(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Valor Confirmado (R$) *</label>
              <CurrencyInput value={convertAmount} onChange={setConvertAmount} required />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label className="form-label">Conta *</label>
                <select
                  className="form-select"
                  value={convertAccountId}
                  onChange={e => setConvertAccountId(e.target.value)}
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
                  value={convertCategoryId}
                  onChange={e => setConvertCategoryId(e.target.value)}
                  required
                >
                  <option value="">Selecione...</option>
                  {categories
                    .filter(c => !c.is_archived)
                    .map(cat => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name} ({cat.type === 'income' ? 'Entrada' : 'Despesa'})
                      </option>
                    ))}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Data Prevista *</label>
              <input
                type="date"
                className="form-input"
                value={convertExpectedDate}
                onChange={e => setConvertExpectedDate(e.target.value)}
                required
              />
            </div>
          </>
        ) : (
          /* MODO CADASTRO / EDIÇÃO DE ANOTAÇÃO */
          <>
            <div className="form-group">
              <label className="form-label">Tipo de Registro *</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                <button
                  type="button"
                  className="btn btn-sm"
                  style={{
                    background: type === 'possible_income' ? 'var(--income-color)' : 'var(--bg-card-hover)',
                    color: type === 'possible_income' ? '#fff' : 'var(--text-muted)'
                  }}
                  onClick={() => setType('possible_income')}
                >
                  Possível Entrada
                </button>
                <button
                  type="button"
                  className="btn btn-sm"
                  style={{
                    background: type === 'possible_expense' ? 'var(--expense-color)' : 'var(--bg-card-hover)',
                    color: type === 'possible_expense' ? '#fff' : 'var(--text-muted)'
                  }}
                  onClick={() => setType('possible_expense')}
                >
                  Possível Gasto
                </button>
                <button
                  type="button"
                  className="btn btn-sm"
                  style={{
                    background: type === 'note' ? 'var(--primary-color)' : 'var(--bg-card-hover)',
                    color: type === 'note' ? '#fff' : 'var(--text-muted)'
                  }}
                  onClick={() => setType('note')}
                >
                  Lembrete
                </button>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Título da Ideia ou Possibilidade *</label>
              <input
                type="text"
                className="form-input"
                placeholder="Ex: Talvez precise trocar os pneus, Proposta freelance..."
                value={title}
                onChange={e => setTitle(e.target.value)}
                required
                autoFocus
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label className="form-label">Valor Estimado (opcional)</label>
                <CurrencyInput value={estimatedAmount} onChange={setEstimatedAmount} />
              </div>

              <div className="form-group">
                <label className="form-label">Categoria (opcional)</label>
                <select
                  className="form-select"
                  value={categoryId}
                  onChange={e => setCategoryId(e.target.value)}
                >
                  <option value="">Nenhuma</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Observações e Detalhes</label>
              <textarea
                className="form-textarea"
                rows={3}
                placeholder="Ex: Aguardando orçamento da oficina, cliente deve responder dia 15..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
              />
            </div>
          </>
        )}

        <div className="modal-footer" style={{ padding: '16px 0 0 0', marginTop: 12 }}>
          <button type="button" className="btn btn-outline" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </button>
          <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
            {isSubmitting
              ? 'Processando...'
              : convertingNote
              ? 'Confirmar e Criar Lançamento'
              : editingNote
              ? 'Atualizar Anotação'
              : 'Salvar Anotação'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
