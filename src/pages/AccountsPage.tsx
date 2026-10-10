import React, { useState } from 'react';
import { BankLogo } from '../components/common/BankLogo';
import { findBankBrand } from '../utils/bankBrand';
import '../styles/accounts.css';
import {
  Archive,
  ArrowLeftRight,
  Edit2,
  Plus,
  RotateCcw,
  Wallet
} from 'lucide-react';
import { CurrencyInput } from '../components/common/CurrencyInput';
import { DateInput } from '../components/common/DateInput';
import { Modal } from '../components/common/Modal';
import { useFinance } from '../context/FinanceContext';
import { Account } from '../types';
import { formatDateBR, todayString } from '../utils/date';
import { calculateAccountBalance, formatCurrency } from '../utils/finance';

interface AccountsPageProps {
  onOpenTransfer: () => void;
}

export const AccountsPage: React.FC<AccountsPageProps> = ({ onOpenTransfer }) => {
  const { accounts, transactions, transfers, createAccount, updateAccount, archiveAccount, isSubmitting } = useFinance();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);

  const [name, setName] = useState('');
  const [initialBalance, setInitialBalance] = useState<number>(0);
  const [refDate, setRefDate] = useState(todayString());
  const [notes, setNotes] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const openCreateModal = () => {
    setEditingAccount(null);
    setName('');
    setInitialBalance(0);
    setRefDate(todayString());
    setNotes('');
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const openEditModal = (acc: Account) => {
    setEditingAccount(acc);
    setName(acc.name);
    setInitialBalance(acc.initial_balance);
    setRefDate(acc.initial_balance_date);
    setNotes(acc.notes || '');
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!name.trim()) {
      setErrorMsg('Informe o nome da conta.');
      return;
    }
    if (!refDate) {
      setErrorMsg('Informe a data de referência do saldo inicial.');
      return;
    }

    try {
      if (editingAccount) {
        await updateAccount(editingAccount.id, {
          name: name.trim(),
          initial_balance: initialBalance,
          initial_balance_date: refDate,
          notes: notes.trim() || undefined
        });
      } else {
        await createAccount({
          name: name.trim(),
          initial_balance: initialBalance,
          initial_balance_date: refDate,
          notes: notes.trim() || undefined,
          is_archived: false
        });
      }
      setIsModalOpen(false);
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao salvar conta');
    }
  };

  const activeAccounts = accounts.filter(a => !a.is_archived);
  const archivedAccounts = accounts.filter(a => a.is_archived);

  return (
    <div className="page-wrapper accounts-page">
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          marginBottom: 20
        }}
      >
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
            Minhas contas
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: 2 }}>
            Cadastre suas contas bancárias, carteiras físicas ou reservas financeiras.
          </p>
        </div>

        <div className="accounts-header-actions">
          <button className="btn btn-outline" onClick={onOpenTransfer}>
            <ArrowLeftRight size={16} />
            <span>Transferir</span>
          </button>
          <button data-guide="account-create" className="btn btn-primary" onClick={openCreateModal}>
            <Plus size={16} />
            <span>Nova Conta</span>
          </button>
        </div>
      </div>

      {activeAccounts.length === 0 && <section className="card accounts-empty"><Wallet size={36} /><h2>Seu dinheiro começa por aqui</h2><p>Adicione seu banco, carteira ou reserva para acompanhar seus saldos em um só lugar.</p><button className="btn btn-primary" onClick={openCreateModal}><Plus size={18} />Criar minha primeira conta</button></section>}
      {/* Grid de Contas Ativas */}
      <div className="accounts-grid">
        {activeAccounts.map(acc => {
          const currentBalance = calculateAccountBalance(acc, transactions, transfers);

          return (
            <div key={acc.id} className="card account-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <BankLogo name={acc.name} />
                  <div>
                    <h3 style={{ fontSize: '1.0625rem', fontWeight: 700 }}>{acc.name}</h3>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Saldo Inicial: {formatCurrency(acc.initial_balance)} em {formatDateBR(acc.initial_balance_date)}
                    </span>
                  </div>
                </div>
              </div>

              <div style={{ margin: '14px 0' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>SALDO ATUAL CALCULADO</div>
                <div
                  style={{
                    fontSize: '1.625rem',
                    fontWeight: 800,
                    color: currentBalance >= 0 ? 'var(--income-color)' : 'var(--expense-color)',
                    letterSpacing: '-0.02em',
                    marginTop: 2
                  }}
                >
                  {formatCurrency(currentBalance)}
                </div>
              </div>

              {acc.notes && (
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-subtle)', marginBottom: 14 }}>
                  {acc.notes}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, borderTop: '1px solid var(--border-color)', paddingTop: 12 }}>
                <button
                  className="btn btn-outline btn-sm"
                  onClick={() => archiveAccount(acc.id, true)}
                  title="Arquivar conta (permanece no histórico)"
                >
                  <Archive size={14} />
                  <span>Arquivar</span>
                </button>
                <button className="btn btn-outline btn-sm" onClick={() => openEditModal(acc)}>
                  <Edit2 size={14} />
                  <span>Editar</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Contas Arquivadas */}
      {archivedAccounts.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <button
            className="btn btn-outline btn-sm"
            onClick={() => setShowArchived(!showArchived)}
            style={{ marginBottom: 14 }}
          >
            <Archive size={14} />
            <span>{showArchived ? 'Ocultar Contas Arquivadas' : `Ver Contas Arquivadas (${archivedAccounts.length})`}</span>
          </button>

          {showArchived && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
              {archivedAccounts.map(acc => (
                <div key={acc.id} className="card" style={{ opacity: 0.6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div className="account-archived-name"><BankLogo name={acc.name} /><h4 style={{ fontWeight: 700 }}>{acc.name} (Arquivada)</h4></div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Saldo: {formatCurrency(calculateAccountBalance(acc, transactions, transfers))}
                      </span>
                    </div>
                    <button
                      className="btn btn-outline btn-sm"
                      onClick={() => archiveAccount(acc.id, false)}
                      title="Desarquivar conta"
                    >
                      <RotateCcw size={14} />
                      <span>Reativar</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal Criar/Editar Conta */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingAccount ? 'Editar conta' : 'Nova conta'}
        variant="action-sheet"
      >
        <form className="account-form" onSubmit={handleSubmit}>
          <p className="account-form-intro">Dê um nome à conta e informe seu saldo de partida.</p>
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

          <div className="form-group">
            <label className="form-label" htmlFor="account-name">Nome da conta *</label>
            <input
              type="text"
              className="form-input"
              id="account-name"
              placeholder="Ex.: Nubank, Itaú ou Carteira"
              value={name}
              onChange={e => setName(e.target.value)}
              required

            />
          </div>

          {findBankBrand(name) && <div className="account-brand-preview" aria-live="polite"><BankLogo name={name} /><div><strong>{findBankBrand(name)?.name}</strong><small>Identificado pelo nome · sem conexão com o banco</small></div></div>}
          <div className="form-group">
            <label className="form-label">Saldo Inicial (R$) *</label>
            <CurrencyInput value={initialBalance} onChange={setInitialBalance} required />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', marginTop: 4 }}>
              O saldo inicial não é considerado receita; é a posição de partida da conta.
            </span>
          </div>

          <div className="form-group">
            <label className="form-label">Data de Referência do Saldo Inicial *</label>
            <DateInput
              className="form-input"
              value={refDate}
              onChange={e => setRefDate(e.target.value)}
              required
            />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', marginTop: 4 }}>
              Apenas movimentações efetivadas a partir desta data impactarão o saldo.
            </span>
          </div>

          <div className="form-group">
            <label className="form-label">Observações (opcional)</label>
            <input
              type="text"
              className="form-input"
              placeholder="Ex: Agência e conta, finalidade..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>

          <div className="modal-footer" style={{ padding: '16px 0 0 0', marginTop: 12 }}>
            <button type="button" className="btn btn-outline" onClick={() => setIsModalOpen(false)} disabled={isSubmitting}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Salvando...' : editingAccount ? 'Salvar' : 'Criar Conta'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
