import React, { useState } from 'react';
import { GuidedSetup } from './components/common/GuidedSetup';
import { ToastContainer } from './components/common/ToastContainer';
import { BottomNav } from './components/layout/BottomNav';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { NoteModal } from './components/modals/NoteModal';
import { RecurrenceModal } from './components/modals/RecurrenceModal';
import { TransactionModal } from './components/modals/TransactionModal';
import { TransferModal } from './components/modals/TransferModal';
import { FinanceProvider, useFinance } from './context/FinanceContext';
import { AccountsPage } from './pages/AccountsPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { AuthPage } from './pages/AuthPage';
import { CalendarPage } from './pages/CalendarPage';
import { CategoriesPage } from './pages/CategoriesPage';
import { DashboardPage } from './pages/DashboardPage';
import { NotesPage } from './pages/NotesPage';
import { RecurrencesPage } from './pages/RecurrencesPage';
import { SettingsPage } from './pages/SettingsPage';
import { TransactionsPage } from './pages/TransactionsPage';
import { FinancialNote, Recurrence, Transaction, TransactionType } from './types';
import { supabaseConfigurationError } from './services/supabase';

const MainApp: React.FC = () => {
  const { user, isAuthenticated, isLoading, isSupabaseOnline, isPasswordRecovery } = useFinance();

  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [transactionFilterPreset, setTransactionFilterPreset] = useState<string | undefined>(undefined);

  // Estados dos Modais
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [txModalType, setTxModalType] = useState<TransactionType>('expense');
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [txDefaultDate, setTxDefaultDate] = useState<string | undefined>(undefined);

  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);

  const [isRecurrenceModalOpen, setIsRecurrenceModalOpen] = useState(false);
  const [editingRecurrence, setEditingRecurrence] = useState<Recurrence | null>(null);

  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<FinancialNote | null>(null);
  const [convertingNote, setConvertingNote] = useState<FinancialNote | null>(null);

  if (isLoading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
          background: 'var(--bg-app)'
        }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            border: '4px solid var(--border-color)',
            borderTopColor: 'var(--primary-color)',
            animation: 'spin 0.8s linear infinite'
          }}
        />
        <div style={{ fontWeight: 600, color: 'var(--text-muted)' }}>Carregando MyNotes...</div>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (!isSupabaseOnline) {
    return (
      <div className="supabase-required-page">
        <div className="card supabase-required-card">
          <div className="supabase-required-icon">!</div>
          <h1>Conecte o Supabase</h1>
          <p>{supabaseConfigurationError}</p>
          <div className="supabase-required-variables">
            <code>VITE_SUPABASE_URL</code>
            <code>VITE_SUPABASE_ANON_KEY</code>
          </div>
          <small>Configure para Production, Preview e Development e depois faça um novo deploy.</small>
        </div>
      </div>
    );
  }

  // Se o usuário não estiver autenticado, exibe tela de login/cadastro
  if (isPasswordRecovery && isAuthenticated) {
    return <AuthPage key="password-recovery" initialMode="reset" />;
  }
  if (!isAuthenticated) {
    return <AuthPage />;
  }

  // Handlers para abrir modais
  const handleOpenNewTransaction = (type: TransactionType = 'expense', date?: string) => {
    setEditingTx(null);
    setTxModalType(type);
    setTxDefaultDate(date);
    setIsTxModalOpen(true);
  };

  const handleOpenEditTransaction = (tx: Transaction) => {
    setEditingTx(tx);
    setTxModalType(tx.type);
    setIsTxModalOpen(true);
  };

  const handleNavigateToTransactions = (filterType?: string) => {
    setTransactionFilterPreset(filterType);
    setCurrentTab('transactions');
  };

  return (
    <div className="app-container">
      {/* Sidebar Desktop */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        onOpenTransfer={() => setIsTransferModalOpen(true)}
      />

      <div className="main-content">
        {/* Header Global */}
        <Header
          onOpenNewTransaction={handleOpenNewTransaction}
          onOpenTransfer={() => setIsTransferModalOpen(true)}
        />

        {/* Telas Dinâmicas */}
        <main>
          {currentTab === 'dashboard' && (
            <DashboardPage
              onNavigateToTransactions={handleNavigateToTransactions}
              onOpenNewTransaction={handleOpenNewTransaction}
              onOpenTransfer={() => setIsTransferModalOpen(true)}
              onOpenCalendar={() => setCurrentTab('calendar')}
            />
          )}

          {currentTab === 'transactions' && (
            <TransactionsPage
              initialFilter={transactionFilterPreset}
              onOpenCreate={handleOpenNewTransaction}
              onOpenEdit={handleOpenEditTransaction}
            />
          )}

          {currentTab === 'calendar' && (
            <CalendarPage
              onOpenCreateWithDate={(d, t) => handleOpenNewTransaction(t || 'expense', d)}
              onOpenEdit={handleOpenEditTransaction}
            />
          )}

          {currentTab === 'recurrences' && (
            <RecurrencesPage
              onOpenCreate={() => {
                setEditingRecurrence(null);
                setIsRecurrenceModalOpen(true);
              }}
              onOpenEdit={rec => {
                setEditingRecurrence(rec);
                setIsRecurrenceModalOpen(true);
              }}
            />
          )}

          {currentTab === 'notes' && (
            <NotesPage
              onOpenCreate={() => {
                setEditingNote(null);
                setConvertingNote(null);
                setIsNoteModalOpen(true);
              }}
              onOpenEdit={n => {
                setEditingNote(n);
                setConvertingNote(null);
                setIsNoteModalOpen(true);
              }}
              onOpenConvert={n => {
                setEditingNote(null);
                setConvertingNote(n);
                setIsNoteModalOpen(true);
              }}
            />
          )}

          {currentTab === 'analytics' && <AnalyticsPage />}

          {currentTab === 'accounts' && (
            <AccountsPage onOpenTransfer={() => setIsTransferModalOpen(true)} />
          )}

          {currentTab === 'categories' && <CategoriesPage />}

          {currentTab === 'settings' && <SettingsPage />}
        </main>
      </div>

      {/* Navegação Mobile Inferior */}
      <BottomNav
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        onOpenNewTransaction={handleOpenNewTransaction}
        onOpenTransfer={() => setIsTransferModalOpen(true)}
      />

      {/* Modais Globais */}
      <TransactionModal
        isOpen={isTxModalOpen}
        onClose={() => setIsTxModalOpen(false)}
        initialType={txModalType}
        editingTransaction={editingTx}
        defaultDate={txDefaultDate}
      />

      <TransferModal
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
      />

      <RecurrenceModal
        isOpen={isRecurrenceModalOpen}
        onClose={() => setIsRecurrenceModalOpen(false)}
        editingRecurrence={editingRecurrence}
      />

      <NoteModal
        isOpen={isNoteModalOpen}
        onClose={() => setIsNoteModalOpen(false)}
        editingNote={editingNote}
        convertingNote={convertingNote}
      />

      <ToastContainer />
      {user && <GuidedSetup key={user.id} onNavigate={setCurrentTab} onCloseForms={() => {
        window.dispatchEvent(new Event('mynotes:close-guide-forms'));
        setIsTxModalOpen(false);
        setIsRecurrenceModalOpen(false);
        setIsNoteModalOpen(false);
        setIsTransferModalOpen(false);
      }} />}
    </div>
  );
};

export default function App() {
  return (
    <FinanceProvider>
      <MainApp />
    </FinanceProvider>
  );
}
