import React, { useEffect, useState } from 'react';
import { useFinance } from '../../context/FinanceContext';
import { FinancialNote, NoteType } from '../../types';
import { todayString } from '../../utils/date';
import { CurrencyInput } from '../common/CurrencyInput';
import { Modal } from '../common/Modal';
import { Select } from '../common/Select';
import { DateInput } from '../common/DateInput';
import { TrendingUp, TrendingDown, FileText } from 'lucide-react';
import '../../styles/notes.css';

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
          ? 'Criar lançamento'
          : editingNote
          ? 'Editar Anotação'
          : 'Uma nova ideia'
      }
      variant="action-sheet"
    >
      <form className="note-form" onSubmit={handleSubmit}>
        {!convertingNote && <p className="note-form-intro">Anote agora, decida depois. Seu saldo não muda.</p>}
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

            <div className="note-form-columns">
              <div className="form-group">
                <label className="form-label">Conta *</label>
                <Select
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
                </Select>
              </div>

              <div className="form-group">
                <label className="form-label">Categoria *</label>
                <Select
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
                </Select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Data Prevista *</label>
              <DateInput
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
              <label className="form-label">O que você quer anotar?</label>
              <div className="note-type-options">
                <button
                  type="button"
                  aria-pressed={type === 'possible_income'}
                  className="btn btn-sm"
                  style={{
                    background: type === 'possible_income' ? 'var(--income-color)' : 'var(--bg-card-hover)',
                    color: type === 'possible_income' ? '#fff' : 'var(--text-muted)'
                  }}
                  onClick={() => setType('possible_income')}
                >
                  <TrendingUp size={20} />Entrada
                </button>
                <button
                  type="button"
                  aria-pressed={type === 'possible_expense'}
                  className="btn btn-sm"
                  style={{
                    background: type === 'possible_expense' ? 'var(--expense-color)' : 'var(--bg-card-hover)',
                    color: type === 'possible_expense' ? '#fff' : 'var(--text-muted)'
                  }}
                  onClick={() => setType('possible_expense')}
                >
                  <TrendingDown size={20} />Gasto
                </button>
                <button
                  type="button"
                  aria-pressed={type === 'note'}
                  className="btn btn-sm"
                  style={{
                    background: type === 'note' ? 'var(--primary-color)' : 'var(--bg-card-hover)',
                    color: type === 'note' ? '#fff' : 'var(--text-muted)'
                  }}
                  onClick={() => setType('note')}
                >
                  <FileText size={20} />Lembrete
                </button>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="note-title">Dê um título à sua ideia *</label>
              <input
                type="text"
                id="note-title"
                className="form-input"
                placeholder="Ex.: Trocar os pneus"
                value={title}
                onChange={e => setTitle(e.target.value)}
                required
              />
            </div>

            <div className="note-form-columns">
              <div className="form-group">
                <label className="form-label">Valor Estimado (opcional)</label>
                <CurrencyInput value={estimatedAmount} onChange={setEstimatedAmount} />
              </div>

              <div className="form-group">
                <label className="form-label">Categoria (opcional)</label>
                <Select
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
                </Select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="note-details">Mais detalhes <span className="note-optional">opcional</span></label>
              <textarea
                className="form-textarea"
                id="note-details"
                rows={3}
                placeholder="O que você precisa lembrar?"
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
