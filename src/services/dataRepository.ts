import {
  Account,
  Category,
  FinancialNote,
  Recurrence,
  RecurrenceException,
  Transaction,
  Transfer,
  UserProfile
} from '../types';
import { todayString } from '../utils/date';
import { generateRecurrenceDates, instantiateOccurrences } from '../utils/recurrenceEngine';
import { DEFAULT_CATEGORIES, generateUUID, isSupabaseConfigured, supabase } from './supabase';

interface LocalDBState {
  accounts: Account[];
  categories: Category[];
  transactions: Transaction[];
  recurrences: Recurrence[];
  recurrenceExceptions: RecurrenceException[];
  transfers: Transfer[];
  notes: FinancialNote[];
}

const STORAGE_KEY_PREFIX = 'financas_pro_data_';

const memoryStore = new Map<string, string>();

function getStorageItem(key: string): string | null {
  if (typeof localStorage !== 'undefined') {
    return localStorage.getItem(key);
  }
  return memoryStore.get(key) || null;
}

function setStorageItem(key: string, value: string): void {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(key, value);
  } else {
    memoryStore.set(key, value);
  }
}

function getLocalState(userId: string): LocalDBState {
  const raw = getStorageItem(`${STORAGE_KEY_PREFIX}${userId}`);
  if (raw) {
    try {
      return JSON.parse(raw);
    } catch {
      // ignore
    }
  }

  const defaultCategories: Category[] = DEFAULT_CATEGORIES.map(c => ({
    id: generateUUID(),
    user_id: userId,
    name: c.name,
    type: c.type,
    color: c.color,
    is_archived: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }));

  const state: LocalDBState = {
    accounts: [],
    categories: defaultCategories,
    transactions: [],
    recurrences: [],
    recurrenceExceptions: [],
    transfers: [],
    notes: []
  };

  saveLocalState(userId, state);
  return state;
}

function saveLocalState(userId: string, state: LocalDBState) {
  setStorageItem(`${STORAGE_KEY_PREFIX}${userId}`, JSON.stringify(state));
}

// -----------------------------------------------------------------------------
// REPOSITÓRIO UNIFICADO (SUPABASE COM LOCAL FALLBACK AUTOMÁTICO)
// -----------------------------------------------------------------------------

export class DataRepository {
  private userId: string;

  constructor(userId: string) {
    this.userId = userId;
  }

  // ACCOUNTS
  async getAccounts(): Promise<Account[]> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .eq('user_id', this.userId)
        .order('created_at', { ascending: true });
      if (!error && data) return data as Account[];
    }
    const state = getLocalState(this.userId);
    return state.accounts;
  }

  async createAccount(input: Omit<Account, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<Account> {
    const newAcc: Account = {
      ...input,
      id: generateUUID(),
      user_id: this.userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('accounts').insert(newAcc).select().single();
      if (!error && data) return data as Account;
    }

    const state = getLocalState(this.userId);
    state.accounts.push(newAcc);
    saveLocalState(this.userId, state);
    return newAcc;
  }

  async updateAccount(id: string, updates: Partial<Account>): Promise<Account> {
    const now = new Date().toISOString();
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('accounts')
        .update({ ...updates, updated_at: now })
        .eq('id', id)
        .eq('user_id', this.userId)
        .select()
        .single();
      if (!error && data) return data as Account;
    }

    const state = getLocalState(this.userId);
    const idx = state.accounts.findIndex(a => a.id === id);
    if (idx !== -1) {
      state.accounts[idx] = { ...state.accounts[idx], ...updates, updated_at: now };
      saveLocalState(this.userId, state);
      return state.accounts[idx];
    }
    throw new Error('Conta não encontrada');
  }

  async archiveAccount(id: string, isArchived: boolean): Promise<Account> {
    return this.updateAccount(id, { is_archived: isArchived });
  }

  // CATEGORIES
  async getCategories(): Promise<Category[]> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('user_id', this.userId)
        .order('name', { ascending: true });
      if (!error && data && data.length > 0) return data as Category[];
    }
    const state = getLocalState(this.userId);
    return state.categories;
  }

  async createCategory(input: Omit<Category, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<Category> {
    const newCat: Category = {
      ...input,
      id: generateUUID(),
      user_id: this.userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('categories').insert(newCat).select().single();
      if (!error && data) return data as Category;
    }

    const state = getLocalState(this.userId);
    state.categories.push(newCat);
    saveLocalState(this.userId, state);
    return newCat;
  }

  async updateCategory(id: string, updates: Partial<Category>): Promise<Category> {
    const now = new Date().toISOString();
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('categories')
        .update({ ...updates, updated_at: now })
        .eq('id', id)
        .eq('user_id', this.userId)
        .select()
        .single();
      if (!error && data) return data as Category;
    }

    const state = getLocalState(this.userId);
    const idx = state.categories.findIndex(c => c.id === id);
    if (idx !== -1) {
      state.categories[idx] = { ...state.categories[idx], ...updates, updated_at: now };
      saveLocalState(this.userId, state);
      return state.categories[idx];
    }
    throw new Error('Categoria não encontrada');
  }

  // TRANSACTIONS
  async getTransactions(): Promise<Transaction[]> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', this.userId)
        .order('expected_date', { ascending: false });
      if (!error && data) return data as Transaction[];
    }
    const state = getLocalState(this.userId);
    return state.transactions;
  }

  async createTransaction(input: Omit<Transaction, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<Transaction> {
    // Validações
    if (!input.description || input.description.trim() === '') {
      throw new Error('A descrição é obrigatória');
    }
    if (input.amount <= 0) {
      throw new Error('O valor deve ser maior que zero');
    }
    if (input.status === 'completed' && !input.effective_date) {
      throw new Error('Data efetiva é obrigatória para lançamentos pagos ou recebidos');
    }

    const newTx: Transaction = {
      ...input,
      id: generateUUID(),
      user_id: this.userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('transactions').insert(newTx).select().single();
      if (!error && data) return data as Transaction;
    }

    const state = getLocalState(this.userId);
    state.transactions.unshift(newTx);
    saveLocalState(this.userId, state);
    return newTx;
  }

  async updateTransaction(id: string, updates: Partial<Transaction>): Promise<Transaction> {
    if (updates.amount !== undefined && updates.amount <= 0) {
      throw new Error('O valor deve ser maior que zero');
    }
    if (updates.status === 'completed' && !updates.effective_date) {
      // Se não veio nova data efetiva, verificar se a existente já tem
      const state = getLocalState(this.userId);
      const existing = state.transactions.find(t => t.id === id);
      if (!existing?.effective_date) {
        throw new Error('Data efetiva é obrigatória para lançamentos pagos ou recebidos');
      }
    }

    const now = new Date().toISOString();
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('transactions')
        .update({ ...updates, updated_at: now })
        .eq('id', id)
        .eq('user_id', this.userId)
        .select()
        .single();
      if (!error && data) return data as Transaction;
    }

    const state = getLocalState(this.userId);
    const idx = state.transactions.findIndex(t => t.id === id);
    if (idx !== -1) {
      state.transactions[idx] = { ...state.transactions[idx], ...updates, updated_at: now };
      saveLocalState(this.userId, state);
      return state.transactions[idx];
    }
    throw new Error('Lançamento não encontrado');
  }

  async deleteTransaction(id: string): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.from('transactions').delete().eq('id', id).eq('user_id', this.userId);
      if (!error) return;
    }

    const state = getLocalState(this.userId);
    const tx = state.transactions.find(t => t.id === id);
    // Se for de recorrência, adiciona à lista de exceções para nunca ser recriada
    if (tx?.recurrence_id && tx.expected_date) {
      state.recurrenceExceptions.push({
        id: generateUUID(),
        recurrence_id: tx.recurrence_id,
        exception_date: tx.expected_date,
        action: 'deleted',
        created_at: new Date().toISOString()
      });
    }

    state.transactions = state.transactions.filter(t => t.id !== id);
    saveLocalState(this.userId, state);
  }

  async cancelTransaction(id: string): Promise<Transaction> {
    return this.updateTransaction(id, { status: 'cancelled' });
  }

  async completeTransaction(id: string, effectiveDate: string): Promise<Transaction> {
    return this.updateTransaction(id, {
      status: 'completed',
      effective_date: effectiveDate
    });
  }

  async undoCompleteTransaction(id: string): Promise<Transaction> {
    return this.updateTransaction(id, {
      status: 'pending',
      effective_date: undefined
    });
  }

  // RECURRENCES
  async getRecurrences(): Promise<Recurrence[]> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('recurrences')
        .select('*')
        .eq('user_id', this.userId)
        .order('created_at', { ascending: false });
      if (!error && data) return data as Recurrence[];
    }
    const state = getLocalState(this.userId);
    return state.recurrences;
  }

  async createRecurrence(input: Omit<Recurrence, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<Recurrence> {
    const newRec: Recurrence = {
      ...input,
      id: generateUUID(),
      user_id: this.userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('recurrences').insert(newRec).select().single();
      if (!error && data) return data as Recurrence;
    }

    const state = getLocalState(this.userId);
    state.recurrences.push(newRec);

    // Gera ocorrências iniciais até 3 meses adiante
    const futureLimit = new Date();
    futureLimit.setMonth(futureLimit.getMonth() + 3);
    const limitDate = `${futureLimit.getFullYear()}-${String(futureLimit.getMonth() + 1).padStart(2, '0')}-${String(futureLimit.getDate()).padStart(2, '0')}`;

    const dates = generateRecurrenceDates(newRec, limitDate);
    const newTxs = instantiateOccurrences(newRec, dates, generateUUID);
    state.transactions.push(...newTxs);

    saveLocalState(this.userId, state);
    return newRec;
  }

  async updateRecurrence(id: string, updates: Partial<Recurrence>): Promise<Recurrence> {
    const now = new Date().toISOString();
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('recurrences')
        .update({ ...updates, updated_at: now })
        .eq('id', id)
        .eq('user_id', this.userId)
        .select()
        .single();
      if (!error && data) return data as Recurrence;
    }

    const state = getLocalState(this.userId);
    const idx = state.recurrences.findIndex(r => r.id === id);
    if (idx !== -1) {
      state.recurrences[idx] = { ...state.recurrences[idx], ...updates, updated_at: now };
      saveLocalState(this.userId, state);
      return state.recurrences[idx];
    }
    throw new Error('Recorrência não encontrada');
  }

  // TRANSFERS (Atômica)
  async getTransfers(): Promise<Transfer[]> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('transfers')
        .select('*')
        .eq('user_id', this.userId)
        .order('transfer_date', { ascending: false });
      if (!error && data) return data as Transfer[];
    }
    const state = getLocalState(this.userId);
    return state.transfers;
  }

  async createTransfer(input: Omit<Transfer, 'id' | 'user_id' | 'created_at'>): Promise<Transfer> {
    if (input.origin_account_id === input.destination_account_id) {
      throw new Error('A conta de origem e destino não podem ser as mesmas');
    }
    if (input.amount <= 0) {
      throw new Error('O valor da transferência deve ser maior que zero');
    }

    const transfer: Transfer = {
      ...input,
      id: generateUUID(),
      user_id: this.userId,
      created_at: new Date().toISOString()
    };

    if (isSupabaseConfigured && supabase) {
      // Chama função atômica no Supabase
      const { data, error } = await supabase.rpc('transfer_funds', {
        p_origin_account_id: input.origin_account_id,
        p_destination_account_id: input.destination_account_id,
        p_amount: input.amount,
        p_transfer_date: input.transfer_date,
        p_notes: input.notes || null
      });
      if (!error && data) return data as Transfer;
    }

    // Execução local atômica
    const state = getLocalState(this.userId);
    state.transfers.unshift(transfer);
    saveLocalState(this.userId, state);
    return transfer;
  }

  // NOTES & POSSIBILITIES
  async getNotes(): Promise<FinancialNote[]> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('user_id', this.userId)
        .order('created_at', { ascending: false });
      if (!error && data) return data as FinancialNote[];
    }
    const state = getLocalState(this.userId);
    return state.notes;
  }

  async createNote(input: Omit<FinancialNote, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<FinancialNote> {
    const newNote: FinancialNote = {
      ...input,
      id: generateUUID(),
      user_id: this.userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('notes').insert(newNote).select().single();
      if (!error && data) return data as FinancialNote;
    }

    const state = getLocalState(this.userId);
    state.notes.unshift(newNote);
    saveLocalState(this.userId, state);
    return newNote;
  }

  async updateNote(id: string, updates: Partial<FinancialNote>): Promise<FinancialNote> {
    const now = new Date().toISOString();
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('notes')
        .update({ ...updates, updated_at: now })
        .eq('id', id)
        .eq('user_id', this.userId)
        .select()
        .single();
      if (!error && data) return data as FinancialNote;
    }

    const state = getLocalState(this.userId);
    const idx = state.notes.findIndex(n => n.id === id);
    if (idx !== -1) {
      state.notes[idx] = { ...state.notes[idx], ...updates, updated_at: now };
      saveLocalState(this.userId, state);
      return state.notes[idx];
    }
    throw new Error('Anotação não encontrada');
  }

  async deleteNote(id: string): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      await supabase.from('notes').delete().eq('id', id).eq('user_id', this.userId);
      return;
    }

    const state = getLocalState(this.userId);
    state.notes = state.notes.filter(n => n.id !== id);
    saveLocalState(this.userId, state);
  }

  /**
   * Converte uma Anotação em Lançamento de forma ATÔMICA, impedindo duplicidade.
   */
  async convertNoteToTransaction(
    noteId: string,
    transactionInput: {
      account_id: string;
      category_id: string;
      amount: number;
      expected_date: string;
      description?: string;
      notes?: string;
    }
  ): Promise<{ note: FinancialNote; transaction: Transaction }> {
    const state = getLocalState(this.userId);
    const note = state.notes.find(n => n.id === noteId);

    if (!note) {
      throw new Error('Anotação não encontrada');
    }
    if (note.status === 'converted') {
      throw new Error('Esta anotação já foi convertida em lançamento anteriormente');
    }

    const txType = note.type === 'possible_income' ? 'income' : 'expense';

    const newTx: Transaction = {
      id: generateUUID(),
      user_id: this.userId,
      account_id: transactionInput.account_id,
      category_id: transactionInput.category_id,
      type: txType,
      description: transactionInput.description || note.title,
      amount: transactionInput.amount,
      expected_date: transactionInput.expected_date,
      status: 'pending',
      notes: transactionInput.notes || note.notes,
      note_id: note.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (isSupabaseConfigured && supabase) {
      // RPC ou transação no Supabase
      const { data, error } = await supabase.rpc('convert_note_to_transaction', {
        p_note_id: noteId,
        p_account_id: transactionInput.account_id,
        p_category_id: transactionInput.category_id,
        p_amount: transactionInput.amount,
        p_expected_date: transactionInput.expected_date,
        p_description: transactionInput.description || note.title,
        p_notes: transactionInput.notes || note.notes
      });
      if (!error && data) {
        return data;
      }
    }

    // Execução atômica local
    note.status = 'converted';
    note.converted_transaction_id = newTx.id;
    note.updated_at = new Date().toISOString();

    state.transactions.unshift(newTx);
    saveLocalState(this.userId, state);

    return { note, transaction: newTx };
  }
}
