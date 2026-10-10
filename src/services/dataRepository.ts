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
import { salaryDate, validateSalarySchedule } from '../utils/salarySchedule';
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

function throwSupabaseError(operation: string, error: unknown): never {
  const details = error && typeof error === 'object' && 'message' in error
    ? String((error as { message: unknown }).message)
    : String(error);
  throw new Error(`${operation} no Supabase: ${details}`);
}

type Registro = Record<string, any>;

const tipoParaBanco = (tipo: string) => tipo === 'income' ? 'entrada' : 'despesa';
const tipoDoBanco = (tipo: string) => tipo === 'entrada' ? 'income' : 'expense';
const situacaoParaBanco = (situacao: string) => ({ pending: 'pendente', completed: 'concluido', cancelled: 'cancelado' }[situacao] || situacao);
const situacaoDoBanco = (situacao: string) => ({ pendente: 'pending', concluido: 'completed', cancelado: 'cancelled' }[situacao] || situacao);
const frequenciaParaBanco = (frequencia: string) => ({ daily: 'diaria', weekly: 'semanal', monthly: 'mensal', yearly: 'anual' }[frequencia] || frequencia);
const frequenciaDoBanco = (frequencia: string) => ({ diaria: 'daily', semanal: 'weekly', mensal: 'monthly', anual: 'yearly' }[frequencia] || frequencia);
const tipoAnotacaoParaBanco = (tipo: string) => ({ possible_income: 'possivel_entrada', possible_expense: 'possivel_despesa', note: 'anotacao' }[tipo] || tipo);
const tipoAnotacaoDoBanco = (tipo: string) => ({ possivel_entrada: 'possible_income', possivel_despesa: 'possible_expense', anotacao: 'note' }[tipo] || tipo);
const situacaoAnotacaoParaBanco = (situacao: string) => ({ open: 'aberta', converted: 'convertida', discarded: 'descartada' }[situacao] || situacao);
const situacaoAnotacaoDoBanco = (situacao: string) => ({ aberta: 'open', convertida: 'converted', descartada: 'discarded' }[situacao] || situacao);

function copiarCampo(destino: Registro, origem: Registro, campoOrigem: string, campoDestino: string, transformar: (valor: any) => any = valor => valor) {
  if (Object.prototype.hasOwnProperty.call(origem, campoOrigem)) {
    destino[campoDestino] = transformar(origem[campoOrigem]);
  }
}

const nuloSeVazio = (valor: any) => valor === undefined || valor === '' ? null : valor;

function contaDoBanco(row: Registro): Account {
  return { id: row.id, user_id: row.usuario_id, name: row.nome, initial_balance: row.saldo_inicial,
    initial_balance_date: row.data_saldo_inicial, notes: row.observacoes || undefined,
    is_archived: row.arquivada, created_at: row.criado_em, updated_at: row.atualizado_em };
}

function contaParaBanco(value: Registro): Registro {
  const row: Registro = {};
  [['id','id'],['user_id','usuario_id'],['name','nome'],['initial_balance','saldo_inicial'],['initial_balance_date','data_saldo_inicial'],['is_archived','arquivada'],['created_at','criado_em'],['updated_at','atualizado_em']]
    .forEach(([a,b]) => copiarCampo(row, value, a, b));
  copiarCampo(row, value, 'notes', 'observacoes', nuloSeVazio);
  return row;
}

function categoriaDoBanco(row: Registro): Category {
  return { id: row.id, user_id: row.usuario_id, name: row.nome, type: tipoDoBanco(row.tipo) as Category['type'],
    color: row.cor || undefined, icon: row.icone || undefined, is_archived: row.arquivada,
    created_at: row.criado_em, updated_at: row.atualizado_em };
}

function categoriaParaBanco(value: Registro): Registro {
  const row: Registro = {};
  [['id','id'],['user_id','usuario_id'],['name','nome'],['is_archived','arquivada'],['created_at','criado_em'],['updated_at','atualizado_em']]
    .forEach(([a,b]) => copiarCampo(row, value, a, b));
  copiarCampo(row, value, 'type', 'tipo', tipoParaBanco);
  copiarCampo(row, value, 'color', 'cor', nuloSeVazio);
  copiarCampo(row, value, 'icon', 'icone', nuloSeVazio);
  return row;
}

function lancamentoDoBanco(row: Registro): Transaction {
  return { salary_schedule: row.regra_salario || null, salary_month: row.mes_salario || null,
    id: row.id, user_id: row.usuario_id, account_id: row.conta_id, category_id: row.categoria_id,
    type: tipoDoBanco(row.tipo) as Transaction['type'], description: row.descricao, amount: row.valor,
    expected_date: row.data_prevista, effective_date: row.data_efetiva || undefined,
    status: situacaoDoBanco(row.situacao) as Transaction['status'], recurrence_id: row.recorrencia_id || undefined,
    recurrence_index: row.indice_recorrencia ?? undefined, is_recurrent: row.recorrente,
    note_id: row.anotacao_id || undefined, notes: row.observacoes || undefined,
    created_at: row.criado_em, updated_at: row.atualizado_em };
}

function lancamentoParaBanco(value: Registro): Registro {
  const row: Registro = {};
  copiarCampo(row, value, 'salary_schedule', 'regra_salario', nuloSeVazio);
  copiarCampo(row, value, 'salary_month', 'mes_salario', nuloSeVazio);
  [['id','id'],['user_id','usuario_id'],['account_id','conta_id'],['category_id','categoria_id'],['description','descricao'],['amount','valor'],['expected_date','data_prevista'],['recurrence_index','indice_recorrencia'],['is_recurrent','recorrente'],['created_at','criado_em'],['updated_at','atualizado_em']]
    .forEach(([a,b]) => copiarCampo(row, value, a, b));
  copiarCampo(row, value, 'type', 'tipo', tipoParaBanco);
  copiarCampo(row, value, 'status', 'situacao', situacaoParaBanco);
  copiarCampo(row, value, 'effective_date', 'data_efetiva', nuloSeVazio);
  copiarCampo(row, value, 'recurrence_id', 'recorrencia_id', nuloSeVazio);
  copiarCampo(row, value, 'note_id', 'anotacao_id', nuloSeVazio);
  copiarCampo(row, value, 'notes', 'observacoes', nuloSeVazio);
  return row;
}

function recorrenciaDoBanco(row: Registro): Recurrence {
  return { salary_schedule: row.regra_salario || null,
    id: row.id, user_id: row.usuario_id, account_id: row.conta_id, category_id: row.categoria_id,
    type: tipoDoBanco(row.tipo) as Recurrence['type'], description: row.descricao, amount: row.valor,
    frequency: frequenciaDoBanco(row.frequencia) as Recurrence['frequency'], interval_step: row.intervalo,
    start_date: row.data_inicio, end_date: row.data_fim || undefined, day_of_week: row.dia_semana ?? undefined,
    day_of_month: row.dia_mes ?? undefined, notes: row.observacoes || undefined, is_active: row.ativa,
    created_at: row.criado_em, updated_at: row.atualizado_em };
}

function recorrenciaParaBanco(value: Registro): Registro {
  const row: Registro = {};
  copiarCampo(row, value, 'salary_schedule', 'regra_salario', nuloSeVazio);
  [['id','id'],['user_id','usuario_id'],['account_id','conta_id'],['category_id','categoria_id'],['description','descricao'],['amount','valor'],['interval_step','intervalo'],['start_date','data_inicio'],['day_of_week','dia_semana'],['day_of_month','dia_mes'],['is_active','ativa'],['created_at','criado_em'],['updated_at','atualizado_em']]
    .forEach(([a,b]) => copiarCampo(row, value, a, b));
  copiarCampo(row, value, 'type', 'tipo', tipoParaBanco);
  copiarCampo(row, value, 'frequency', 'frequencia', frequenciaParaBanco);
  copiarCampo(row, value, 'end_date', 'data_fim', nuloSeVazio);
  copiarCampo(row, value, 'notes', 'observacoes', nuloSeVazio);
  return row;
}

function transferenciaDoBanco(row: Registro): Transfer {
  return { id: row.id, user_id: row.usuario_id, origin_account_id: row.conta_origem_id,
    destination_account_id: row.conta_destino_id, amount: row.valor, transfer_date: row.data_transferencia,
    notes: row.observacoes || undefined, created_at: row.criado_em };
}

function anotacaoDoBanco(row: Registro): FinancialNote {
  return { id: row.id, user_id: row.usuario_id, title: row.titulo,
    type: tipoAnotacaoDoBanco(row.tipo) as FinancialNote['type'], estimated_amount: row.valor_estimado ?? undefined,
    category_id: row.categoria_id || undefined, notes: row.observacoes || undefined,
    status: situacaoAnotacaoDoBanco(row.situacao) as FinancialNote['status'],
    converted_transaction_id: row.lancamento_convertido_id || undefined,
    created_at: row.criado_em, updated_at: row.atualizado_em };
}

function anotacaoParaBanco(value: Registro): Registro {
  const row: Registro = {};
  [['id','id'],['user_id','usuario_id'],['title','titulo'],['estimated_amount','valor_estimado'],['created_at','criado_em'],['updated_at','atualizado_em']]
    .forEach(([a,b]) => copiarCampo(row, value, a, b));
  copiarCampo(row, value, 'type', 'tipo', tipoAnotacaoParaBanco);
  copiarCampo(row, value, 'status', 'situacao', situacaoAnotacaoParaBanco);
  copiarCampo(row, value, 'category_id', 'categoria_id', nuloSeVazio);
  copiarCampo(row, value, 'notes', 'observacoes', nuloSeVazio);
  copiarCampo(row, value, 'converted_transaction_id', 'lancamento_convertido_id', nuloSeVazio);
  return row;
}

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
        .from('contas')
        .select('*')
        .eq('usuario_id', this.userId)
        .order('criado_em', { ascending: true });
      if (error) throwSupabaseError('Erro ao carregar contas', error);
      return (data || []).map(contaDoBanco);
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
      const { data, error } = await supabase.from('contas').insert(contaParaBanco(newAcc)).select().single();
      if (error) throwSupabaseError('Erro ao criar conta', error);
      return contaDoBanco(data);
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
        .from('contas')
        .update(contaParaBanco({ ...updates, updated_at: now }))
        .eq('id', id)
        .eq('usuario_id', this.userId)
        .select()
        .single();
      if (error) throwSupabaseError('Erro ao atualizar conta', error);
      return contaDoBanco(data);
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
        .from('categorias')
        .select('*')
        .eq('usuario_id', this.userId)
        .order('nome', { ascending: true });
      if (error) throwSupabaseError('Erro ao carregar categorias', error);
      return (data || []).map(categoriaDoBanco);
    }
    const state = getLocalState(this.userId);
    return state.categories;
  }

  async createCategory(input: Omit<Category, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<Category> {
    const newCat: Category = {
      ...input,
      icon: 'dot',
      id: generateUUID(),
      user_id: this.userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('categorias').insert(categoriaParaBanco(newCat)).select().single();
      if (error) throwSupabaseError('Erro ao criar categoria', error);
      return categoriaDoBanco(data);
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
        .from('categorias')
        .update(categoriaParaBanco({ ...updates, updated_at: now }))
        .eq('id', id)
        .eq('usuario_id', this.userId)
        .select()
        .single();
      if (error) throwSupabaseError('Erro ao atualizar categoria', error);
      return categoriaDoBanco(data);
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
        .from('lancamentos')
        .select('*')
        .eq('usuario_id', this.userId)
        .order('data_prevista', { ascending: false });
      if (error) throwSupabaseError('Erro ao carregar lançamentos', error);
      return (data || []).map(lancamentoDoBanco);
    }
    const state = getLocalState(this.userId);
    return state.transactions;
  }

  async createTransaction(input: Omit<Transaction, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<Transaction> {
    if (input.salary_schedule) {
      if (input.type !== 'income') throw new Error('A regra de salário só pode ser usada em entradas.');
      input = { ...input, expected_date: salaryDate(input.salary_month || '', input.salary_schedule) };
    }
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
      const { data, error } = await supabase.from('lancamentos').insert(lancamentoParaBanco(newTx)).select().single();
      if (error) throwSupabaseError('Erro ao criar lançamento', error);
      return lancamentoDoBanco(data);
    }

    const state = getLocalState(this.userId);
    state.transactions.unshift(newTx);
    saveLocalState(this.userId, state);
    return newTx;
  }

  async updateTransaction(id: string, updates: Partial<Transaction>): Promise<Transaction> {
    if (updates.salary_schedule) {
      if (updates.type === 'expense') throw new Error('A regra de salário só pode ser usada em entradas.');
      updates = { ...updates, expected_date: salaryDate(updates.salary_month || '', updates.salary_schedule) };
    }
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
        .from('lancamentos')
        .update(lancamentoParaBanco({ ...updates, updated_at: now }))
        .eq('id', id)
        .eq('usuario_id', this.userId)
        .select()
        .single();
      if (error) throwSupabaseError('Erro ao atualizar lançamento', error);
      return lancamentoDoBanco(data);
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
      const { error } = await supabase.from('lancamentos').delete().eq('id', id).eq('usuario_id', this.userId);
      if (error) throwSupabaseError('Erro ao excluir lançamento', error);
      return;
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
        .from('recorrencias')
        .select('*')
        .eq('usuario_id', this.userId)
        .order('criado_em', { ascending: false });
      if (error) throwSupabaseError('Erro ao carregar recorrências', error);
      return (data || []).map(recorrenciaDoBanco);
    }
    const state = getLocalState(this.userId);
    return state.recurrences;
  }

  async createRecurrence(input: Omit<Recurrence, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<Recurrence> {
    if (input.salary_schedule) {
      validateSalarySchedule(input.salary_schedule);
      if (input.type !== 'income' || input.frequency !== 'monthly') throw new Error('Salários devem usar uma recorrência mensal de entrada.');
    }
    const newRec: Recurrence = {
      ...input,
      id: generateUUID(),
      user_id: this.userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('recorrencias').insert(recorrenciaParaBanco(newRec)).select().single();
      if (error) throwSupabaseError('Erro ao criar recorrência', error);
      return recorrenciaDoBanco(data);
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
    if (updates.salary_schedule) validateSalarySchedule(updates.salary_schedule);
    const now = new Date().toISOString();
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('recorrencias')
        .update(recorrenciaParaBanco({ ...updates, updated_at: now }))
        .eq('id', id)
        .eq('usuario_id', this.userId)
        .select()
        .single();
      if (error) throwSupabaseError('Erro ao atualizar recorrência', error);
      return recorrenciaDoBanco(data);
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
        .from('transferencias')
        .select('*')
        .eq('usuario_id', this.userId)
        .order('data_transferencia', { ascending: false });
      if (error) throwSupabaseError('Erro ao carregar transferências', error);
      return (data || []).map(transferenciaDoBanco);
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
      const { data, error } = await supabase.rpc('transferir_fundos', {
        p_conta_origem_id: input.origin_account_id,
        p_conta_destino_id: input.destination_account_id,
        p_valor: input.amount,
        p_data_transferencia: input.transfer_date,
        p_observacoes: input.notes || null
      });
      if (error) throwSupabaseError('Erro ao criar transferência', error);
      return transferenciaDoBanco(data);
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
        .from('anotacoes')
        .select('*')
        .eq('usuario_id', this.userId)
        .order('criado_em', { ascending: false });
      if (error) throwSupabaseError('Erro ao carregar anotações', error);
      return (data || []).map(anotacaoDoBanco);
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
      const { data, error } = await supabase.from('anotacoes').insert(anotacaoParaBanco(newNote)).select().single();
      if (error) throwSupabaseError('Erro ao criar anotação', error);
      return anotacaoDoBanco(data);
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
        .from('anotacoes')
        .update(anotacaoParaBanco({ ...updates, updated_at: now }))
        .eq('id', id)
        .eq('usuario_id', this.userId)
        .select()
        .single();
      if (error) throwSupabaseError('Erro ao atualizar anotação', error);
      return anotacaoDoBanco(data);
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
      const { error } = await supabase.from('anotacoes').delete().eq('id', id).eq('usuario_id', this.userId);
      if (error) throwSupabaseError('Erro ao excluir anotação', error);
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
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.rpc('converter_anotacao_em_lancamento', {
        p_anotacao_id: noteId,
        p_conta_id: transactionInput.account_id,
        p_categoria_id: transactionInput.category_id,
        p_valor: transactionInput.amount,
        p_data_prevista: transactionInput.expected_date,
        p_descricao: transactionInput.description || null,
        p_observacoes: transactionInput.notes || null
      });
      if (error) throwSupabaseError('Erro ao converter anotação', error);
      const resultado = data as { anotacao: Registro; lancamento: Registro };
      return { note: anotacaoDoBanco(resultado.anotacao), transaction: lancamentoDoBanco(resultado.lancamento) };
    }

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

    // Execução atômica local
    note.status = 'converted';
    note.converted_transaction_id = newTx.id;
    note.updated_at = new Date().toISOString();

    state.transactions.unshift(newTx);
    saveLocalState(this.userId, state);

    return { note, transaction: newTx };
  }
}
