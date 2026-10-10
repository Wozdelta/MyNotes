import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { DataRepository } from '../services/dataRepository';
import { hasRecoveryRedirect, isSupabaseConfigured, supabase, supabaseConfigurationError } from '../services/supabase';
import {
  Account,
  Category,
  FinancialNote,
  FinancialSummary,
  PeriodFilter,
  Recurrence,
  Transaction,
  Transfer,
  UserProfile
} from '../types';
import { addDays, getEndOfMonth, getPreviousMonthRange, getStartOfMonth, todayString } from '../utils/date';
import { calculateFinancialSummary } from '../utils/finance';

interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

interface FinanceContextType {
  // Auth
  user: UserProfile | null;
  isAuthenticated: boolean;
  isSupabaseOnline: boolean;
  isLoading: boolean;
  isSubmitting: boolean;
  isPasswordRecovery: boolean;
  verifyRecoveryCode: (email: string, code: string) => Promise<void>;
  login: (email: string, pass: string) => Promise<void>;
  signup: (email: string, pass: string, name?: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (currentPass: string, newPass: string) => Promise<void>;
  completePasswordReset: (newPass: string) => Promise<void>;

  // Data
  accounts: Account[];
  categories: Category[];
  transactions: Transaction[];
  recurrences: Recurrence[];
  transfers: Transfer[];
  notes: FinancialNote[];

  // Periods & Summary
  periodFilter: PeriodFilter;
  setPeriodMode: (mode: 'current_month' | 'previous_month' | 'custom' | 'next_30' | 'next_60' | 'next_120', customStart?: string, customEnd?: string) => void;
  setDateBase: (dateBase: 'expected' | 'effective') => void;
  summary: FinancialSummary;

  // Actions
  refreshData: () => Promise<void>;
  createTransaction: (data: Parameters<DataRepository['createTransaction']>[0]) => Promise<Transaction>;
  updateTransaction: (id: string, updates: Partial<Transaction>) => Promise<Transaction>;
  deleteTransaction: (id: string) => Promise<void>;
  cancelTransaction: (id: string) => Promise<Transaction>;
  duplicateTransaction: (id: string) => Promise<Transaction>;
  completeTransaction: (id: string, effectiveDate: string) => Promise<Transaction>;
  undoCompleteTransaction: (id: string) => Promise<Transaction>;

  // Recurrences
  createRecurrence: (data: Parameters<DataRepository['createRecurrence']>[0]) => Promise<Recurrence>;
  updateRecurrence: (id: string, updates: Partial<Recurrence>) => Promise<Recurrence>;

  // Accounts
  createAccount: (data: Parameters<DataRepository['createAccount']>[0]) => Promise<Account>;
  updateAccount: (id: string, updates: Partial<Account>) => Promise<Account>;
  archiveAccount: (id: string, archived: boolean) => Promise<Account>;

  // Transfers
  createTransfer: (data: Parameters<DataRepository['createTransfer']>[0]) => Promise<Transfer>;

  // Categories
  createCategory: (data: Parameters<DataRepository['createCategory']>[0]) => Promise<Category>;
  updateCategory: (id: string, updates: Partial<Category>) => Promise<Category>;

  // Notes
  createNote: (data: Parameters<DataRepository['createNote']>[0]) => Promise<FinancialNote>;
  updateNote: (id: string, updates: Partial<FinancialNote>) => Promise<FinancialNote>;
  deleteNote: (id: string) => Promise<void>;
  convertNoteToTransaction: (noteId: string, params: Parameters<DataRepository['convertNoteToTransaction']>[1]) => Promise<void>;

  // Feedback Toasts
  toasts: ToastMessage[];
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  removeToast: (id: string) => void;
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

export const FinanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(() => hasRecoveryRedirect || sessionStorage.getItem('passwordRecovery') === 'true');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Dados do app
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [recurrences, setRecurrences] = useState<Recurrence[]>([]);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [notes, setNotes] = useState<FinancialNote[]>([]);

  // Filtro de período inicial: mês atual
  const today = todayString();
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>({
    mode: 'current_month',
    startDate: getStartOfMonth(today),
    endDate: getEndOfMonth(today),
    dateBase: 'expected'
  });

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => {
      removeToast(id);
    }, 4500);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Instância do repositório para o usuário atual
  const repository = useMemo(() => {
    const uid = user?.id || 'demo_user_01';
    return new DataRepository(uid);
  }, [user]);

  // Carregamento de dados inicial e após alterações
  const loadUserData = async () => {
    try {
      const [accs, cats, txs, recs, trs, nts] = await Promise.all([
        repository.getAccounts(),
        repository.getCategories(),
        repository.getTransactions(),
        repository.getRecurrences(),
        repository.getTransfers(),
        repository.getNotes()
      ]);
      const synchronizedTransactions = await repository.synchronizePendingSalaryOccurrences(recs, txs);
      setAccounts(accs);
      setCategories(cats);
      setTransactions(synchronizedTransactions);
      setRecurrences(recs);
      setTransfers(trs);
      setNotes(nts);
    } catch (err: any) {
      console.error('Erro ao carregar dados:', err);
      showToast('Erro ao atualizar dados: ' + (err.message || 'Falha de comunicação'), 'error');
    }
  };

  // Inicialização de Auth
  useEffect(() => {
    let mounted = true;

    async function initAuth() {
      if (isSupabaseConfigured && supabase) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user && mounted) {
            setUser({
              id: session.user.id,
              email: session.user.email || '',
              full_name: session.user.user_metadata?.full_name || ''
            });
          } else if (mounted) {
            // Se Supabase está configurado mas não tem sessão, aguarda login
            setUser(null);
          }
        } catch (e) {
          console.error(e);
        }
      } else if (mounted) {
        setUser(null);
      }

      if (mounted) {
        setIsLoading(false);
      }
    }

    initAuth();

    // Listener de Auth do Supabase
    if (isSupabaseConfigured && supabase) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        if (_event === 'PASSWORD_RECOVERY') {
          sessionStorage.setItem('passwordRecovery', 'true');
          setIsPasswordRecovery(true);
        }
        if (_event === 'SIGNED_OUT') {
          sessionStorage.removeItem('passwordRecovery');
          setIsPasswordRecovery(false);
        }
        if (session?.user) {
          setUser({
            id: session.user.id,
            email: session.user.email || '',
            full_name: session.user.user_metadata?.full_name || ''
          });
        } else {
          setUser(null);
        }
      });
      return () => {
        subscription.unsubscribe();
      };
    }
  }, []);

  // Sempre que o usuário mudar, carrega seus dados
  useEffect(() => {
    if (user) {
      loadUserData();
    }
  }, [user]);

  // Auth actions
  const login = async (email: string, pass: string) => {
    setIsSubmitting(true);
    try {
      if (supabase) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password: pass });
        if (error) throw error;
        if (data.user) {
          setUser({
            id: data.user.id,
            email: data.user.email || '',
            full_name: data.user.user_metadata?.full_name || ''
          });
          showToast('Login realizado com sucesso!');
        }
      } else throw new Error(supabaseConfigurationError || 'Supabase indisponível.');
    } catch (err: any) {
      showToast(err.message || 'Falha ao autenticar', 'error');
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  const signup = async (email: string, pass: string, name?: string) => {
    setIsSubmitting(true);
    try {
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password: pass,
          options: { data: { full_name: name, onboarding_status: 'pending' } }
        });
        if (error) throw error;
        showToast('Cadastro realizado! Verifique seu e-mail caso a confirmação esteja ativada.');
      } else throw new Error(supabaseConfigurationError || 'Supabase indisponível.');
    } catch (err: any) {
      showToast(err.message || 'Falha ao cadastrar', 'error');
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  const logout = async () => {
    if (!supabase) throw new Error(supabaseConfigurationError || 'Supabase indisponível.');
    await supabase.auth.signOut();
    setUser(null);
    showToast('Você saiu com segurança.');
  };

  const resetPassword = async (email: string) => {
    if (!supabase) throw new Error(supabaseConfigurationError || 'Supabase indisponível.');
    setIsSubmitting(true);
    try {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/`
      });
      if (error) throw error;
    }
    showToast('Instruções para redefinição enviadas para o e-mail informado.');
    } finally { setIsSubmitting(false); }
  };

  const verifyRecoveryCode = async (email: string, code: string) => {
    if (!supabase) throw new Error(supabaseConfigurationError || 'Supabase indisponível.');
    if (!/^\d{6,10}$/.test(code)) throw new Error('Informe o código completo recebido por e-mail.');
    setIsSubmitting(true);
    try {
      const { error } = await supabase.auth.verifyOtp({ email: email.trim(), token: code, type: 'recovery' });
      if (error) throw new Error('Código inválido ou expirado. Solicite outro código e tente novamente.');
      sessionStorage.setItem('passwordRecovery', 'true');
      setIsPasswordRecovery(true);
    } finally { setIsSubmitting(false); }
  };

  const updatePassword = async (currentPass: string, newPass: string) => {
    try {
      if (!currentPass) {
        throw new Error('Informe sua senha atual');
      }
      if (newPass === currentPass) {
        throw new Error('A nova senha deve ser diferente da senha atual');
      }

      if (supabase) {
        const { data: { user: authUser }, error: userError } = await supabase.auth.getUser();
        if (userError || !authUser?.email) {
          throw new Error('Não foi possível confirmar o usuário conectado');
        }

        const { error: reauthError } = await supabase.auth.signInWithPassword({
          email: authUser.email,
          password: currentPass
        });
        if (reauthError) {
          throw new Error('A senha atual está incorreta');
        }

        const { error: updateError } = await supabase.auth.updateUser({ password: newPass });
        if (updateError) throw updateError;
      } else throw new Error(supabaseConfigurationError || 'Supabase indisponível.');

      showToast('Senha atualizada com sucesso!');
    } catch (err: any) {
      showToast(err.message || 'Não foi possível atualizar a senha', 'error');
      throw err;
    }
  };

  const completePasswordReset = async (newPass: string) => {
    if (!supabase || !isPasswordRecovery) throw new Error('Abra o link de recuperação ou valide seu código primeiro.');
    if (newPass.length < 6) throw new Error('Use uma senha com pelo menos 6 caracteres.');
    setIsSubmitting(true);
    try {
      if (isSupabaseConfigured && supabase) {
        const { error } = await supabase.auth.updateUser({ password: newPass });
        if (error) throw error;
      }
      showToast('Senha redefinida com sucesso!');
      sessionStorage.removeItem('passwordRecovery');
      setIsPasswordRecovery(false);
    } catch (err: any) {
      showToast(err.message || 'Não foi possível redefinir a senha', 'error');
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  // Funções de Período
  const setPeriodMode = (
    mode: 'current_month' | 'previous_month' | 'custom' | 'next_30' | 'next_60' | 'next_120',
    customStart?: string,
    customEnd?: string
  ) => {
    const now = todayString();
    if (mode === 'current_month') {
      setPeriodFilter(prev => ({
        ...prev,
        mode: 'current_month',
        startDate: getStartOfMonth(now),
        endDate: getEndOfMonth(now)
      }));
    } else if (mode === 'previous_month') {
      const prevRange = getPreviousMonthRange(now);
      setPeriodFilter(prev => ({
        ...prev,
        mode: 'previous_month',
        startDate: prevRange.start,
        endDate: prevRange.end
      }));
    } else if (mode === 'next_30') {
      setPeriodFilter(prev => ({
        ...prev,
        mode,
        startDate: now,
        endDate: addDays(now, 30)
      }));
    } else if (mode === 'next_60') {
      setPeriodFilter(prev => ({
        ...prev,
        mode,
        startDate: now,
        endDate: addDays(now, 60)
      }));
    } else if (mode === 'next_120') {
      setPeriodFilter(prev => ({
        ...prev,
        mode,
        startDate: now,
        endDate: addDays(now, 120)
      }));
    } else if (mode === 'custom' && customStart && customEnd) {
      setPeriodFilter(prev => ({
        ...prev,
        mode: 'custom',
        startDate: customStart,
        endDate: customEnd
      }));
    }
  };

  const setDateBase = (dateBase: 'expected' | 'effective') => {
    setPeriodFilter(prev => ({ ...prev, dateBase }));
  };

  // Cálculo de sumário reativo centralizado
  const summary = useMemo(() => {
    return calculateFinancialSummary(
      accounts,
      transactions,
      transfers,
      periodFilter.startDate,
      periodFilter.endDate,
      today
    );
  }, [accounts, transactions, transfers, periodFilter, today]);

  // Transações
  const createTransaction = async (data: Parameters<DataRepository['createTransaction']>[0]) => {
    setIsSubmitting(true);
    try {
      const created = await repository.createTransaction(data);
      setTransactions(prev => [created, ...prev]);
      showToast('Lançamento cadastrado com sucesso!');
      return created;
    } catch (err: any) {
      showToast(err.message || 'Erro ao criar lançamento', 'error');
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateTransaction = async (id: string, updates: Partial<Transaction>) => {
    setIsSubmitting(true);
    try {
      const updated = await repository.updateTransaction(id, updates);
      setTransactions(prev => prev.map(t => (t.id === id ? updated : t)));
      showToast('Lançamento atualizado!');
      return updated;
    } catch (err: any) {
      showToast(err.message || 'Erro ao atualizar lançamento', 'error');
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteTransaction = async (id: string) => {
    setIsSubmitting(true);
    try {
      await repository.deleteTransaction(id);
      setTransactions(prev => prev.filter(t => t.id !== id));
      showToast('Lançamento excluído com sucesso.');
    } catch (err: any) {
      showToast(err.message || 'Erro ao excluir lançamento', 'error');
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  const cancelTransaction = async (id: string) => {
    setIsSubmitting(true);
    try {
      const updated = await repository.cancelTransaction(id);
      setTransactions(prev => prev.map(t => (t.id === id ? updated : t)));
      showToast('Lançamento cancelado com sucesso.');
      return updated;
    } catch (err: any) {
      showToast(err.message || 'Erro ao cancelar lançamento', 'error');
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  const duplicateTransaction = async (id: string) => {
    const original = transactions.find(t => t.id === id);
    if (!original) throw new Error('Original não encontrado');

    const copyData = {
      account_id: original.account_id,
      category_id: original.category_id,
      type: original.type,
      description: `${original.description} (Cópia)`,
      amount: original.amount,
      expected_date: original.expected_date,
      salary_schedule: original.salary_schedule,
      salary_month: original.salary_month,
      status: 'pending' as const,
      notes: original.notes
    };

    return createTransaction(copyData);
  };

  const completeTransaction = async (id: string, effectiveDate: string) => {
    setIsSubmitting(true);
    try {
      const updated = await repository.completeTransaction(id, effectiveDate);
      setTransactions(prev => prev.map(t => (t.id === id ? updated : t)));
      showToast(updated.type === 'income' ? 'Entrada marcada como recebida!' : 'Despesa marcada como paga!');
      return updated;
    } catch (err: any) {
      showToast(err.message || 'Erro ao efetivar lançamento', 'error');
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  const undoCompleteTransaction = async (id: string) => {
    setIsSubmitting(true);
    try {
      const updated = await repository.undoCompleteTransaction(id);
      setTransactions(prev => prev.map(t => (t.id === id ? updated : t)));
      showToast('Efetivação desfeita com sucesso.');
      return updated;
    } catch (err: any) {
      showToast(err.message || 'Erro ao desfazer efetivação', 'error');
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  // Recorrências
  const createRecurrence = async (data: Parameters<DataRepository['createRecurrence']>[0]) => {
    setIsSubmitting(true);
    try {
      const rec = await repository.createRecurrence(data);
      setRecurrences(prev => [rec, ...prev]);
      await loadUserData(); // Recarrega para obter as novas transações geradas
      showToast('Recorrência cadastrada com sucesso!');
      return rec;
    } catch (err: any) {
      showToast(err.message || 'Erro ao criar recorrência', 'error');
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateRecurrence = async (id: string, updates: Partial<Recurrence>) => {
    setIsSubmitting(true);
    try {
      const updated = await repository.updateRecurrence(id, updates);
      setRecurrences(prev => prev.map(r => (r.id === id ? updated : r)));
      const synchronizedTransactions = await repository.synchronizePendingSalaryOccurrences(
        recurrences.map(recurrence => recurrence.id === id ? updated : recurrence),
        transactions
      );
      setTransactions(synchronizedTransactions);
      showToast('Recorrência atualizada com sucesso!');
      return updated;
    } catch (err: any) {
      showToast(err.message || 'Erro ao atualizar recorrência', 'error');
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  // Contas
  const createAccount = async (data: Parameters<DataRepository['createAccount']>[0]) => {
    setIsSubmitting(true);
    try {
      const acc = await repository.createAccount(data);
      setAccounts(prev => [...prev, acc]);
      showToast('Conta criada com sucesso!');
      return acc;
    } catch (err: any) {
      showToast(err.message || 'Erro ao criar conta', 'error');
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateAccount = async (id: string, updates: Partial<Account>) => {
    setIsSubmitting(true);
    try {
      const updated = await repository.updateAccount(id, updates);
      setAccounts(prev => prev.map(a => (a.id === id ? updated : a)));
      showToast('Conta atualizada com sucesso!');
      return updated;
    } catch (err: any) {
      showToast(err.message || 'Erro ao atualizar conta', 'error');
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  const archiveAccount = async (id: string, archived: boolean) => {
    return updateAccount(id, { is_archived: archived });
  };

  // Transferências
  const createTransfer = async (data: Parameters<DataRepository['createTransfer']>[0]) => {
    setIsSubmitting(true);
    try {
      const tr = await repository.createTransfer(data);
      setTransfers(prev => [tr, ...prev]);
      showToast('Transferência entre contas realizada com sucesso!');
      return tr;
    } catch (err: any) {
      showToast(err.message || 'Erro ao realizar transferência', 'error');
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  // Categorias
  const createCategory = async (data: Parameters<DataRepository['createCategory']>[0]) => {
    setIsSubmitting(true);
    try {
      const cat = await repository.createCategory(data);
      setCategories(prev => [...prev, cat]);
      showToast('Categoria cadastrada com sucesso!');
      return cat;
    } catch (err: any) {
      showToast(err.message || 'Erro ao criar categoria', 'error');
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateCategory = async (id: string, updates: Partial<Category>) => {
    setIsSubmitting(true);
    try {
      const updated = await repository.updateCategory(id, updates);
      setCategories(prev => prev.map(c => (c.id === id ? updated : c)));
      showToast('Categoria atualizada com sucesso!');
      return updated;
    } catch (err: any) {
      showToast(err.message || 'Erro ao atualizar categoria', 'error');
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  // Anotações
  const createNote = async (data: Parameters<DataRepository['createNote']>[0]) => {
    setIsSubmitting(true);
    try {
      const note = await repository.createNote(data);
      setNotes(prev => [note, ...prev]);
      showToast('Anotação registrada com sucesso!');
      return note;
    } catch (err: any) {
      showToast(err.message || 'Erro ao criar anotação', 'error');
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateNote = async (id: string, updates: Partial<FinancialNote>) => {
    setIsSubmitting(true);
    try {
      const updated = await repository.updateNote(id, updates);
      setNotes(prev => prev.map(n => (n.id === id ? updated : n)));
      showToast('Anotação atualizada!');
      return updated;
    } catch (err: any) {
      showToast(err.message || 'Erro ao atualizar anotação', 'error');
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteNote = async (id: string) => {
    setIsSubmitting(true);
    try {
      await repository.deleteNote(id);
      setNotes(prev => prev.filter(n => n.id !== id));
      showToast('Anotação removida com sucesso.');
    } catch (err: any) {
      showToast(err.message || 'Erro ao remover anotação', 'error');
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  const convertNoteToTransaction = async (
    noteId: string,
    params: Parameters<DataRepository['convertNoteToTransaction']>[1]
  ) => {
    setIsSubmitting(true);
    try {
      const result = await repository.convertNoteToTransaction(noteId, params);
      setNotes(prev => prev.map(n => (n.id === noteId ? result.note : n)));
      setTransactions(prev => [result.transaction, ...prev]);
      showToast('Anotação convertida em lançamento com sucesso!');
    } catch (err: any) {
      showToast(err.message || 'Erro ao converter anotação', 'error');
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <FinanceContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isSupabaseOnline: isSupabaseConfigured,
        isLoading,
        isSubmitting,
        isPasswordRecovery,
        verifyRecoveryCode,
        login,
        signup,
        logout,
        resetPassword,
        updatePassword,
        completePasswordReset,
        accounts,
        categories,
        transactions,
        recurrences,
        transfers,
        notes,
        periodFilter,
        setPeriodMode,
        setDateBase,
        summary,
        refreshData: loadUserData,
        createTransaction,
        updateTransaction,
        deleteTransaction,
        cancelTransaction,
        duplicateTransaction,
        completeTransaction,
        undoCompleteTransaction,
        createRecurrence,
        updateRecurrence,
        createAccount,
        updateAccount,
        archiveAccount,
        createTransfer,
        createCategory,
        updateCategory,
        createNote,
        updateNote,
        deleteNote,
        convertNoteToTransaction,
        toasts,
        showToast,
        removeToast
      }}
    >
      {children}
    </FinanceContext.Provider>
  );
};

export const useFinance = () => {
  const ctx = useContext(FinanceContext);
  if (!ctx) throw new Error('useFinance deve ser utilizado dentro de FinanceProvider');
  return ctx;
};
