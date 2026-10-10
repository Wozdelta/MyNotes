export type TransactionType = 'income' | 'expense';

export type TransactionStatus = 'pending' | 'completed' | 'cancelled';

export interface SalaryHoliday {
  source?: 'feriados.dev' | 'brasilapi';
  date: string; // YYYY-MM-DD; annual entries match month/day in subsequent years
  name: string;
  scope: 'state' | 'municipal' | 'national';
  annual: boolean;
}
export interface SalarySchedule {
  location?: { city: string; state: string; years: number[] };
  mode: 'fixed' | 'business';
  day: number;
  businessDay: 1 | 2 | 3 | 4 | 5 | 10 | 'penultimate' | 'last';
  advance: boolean;
  holidays: SalaryHoliday[];
}

export interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
}

export interface UserPreferences {
  user_id: string;
  theme: 'light' | 'dark' | 'system';
  currency: string;
  date_format: string;
  timezone: string;
}

export interface Account {
  id: string;
  user_id: string;
  name: string;
  initial_balance: number; // Armazenado em valor decimal no banco e manipulado em centavos
  initial_balance_date: string; // YYYY-MM-DD
  notes?: string;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  user_id: string;
  name: string;
  type: TransactionType;
  color?: string;
  icon?: string;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  salary_schedule?: SalarySchedule | null;
  salary_month?: string | null; // Reference month (YYYY-MM), even when payment is advanced into previous month
  id: string;
  user_id: string;
  account_id: string;
  category_id: string;
  type: TransactionType;
  description: string;
  amount: number; // Em valor numérico (R$)
  expected_date: string; // YYYY-MM-DD
  effective_date?: string; // YYYY-MM-DD (obrigatório se completed)
  status: TransactionStatus;
  notes?: string;
  recurrence_id?: string;
  recurrence_index?: number;
  is_recurrent?: boolean;
  note_id?: string; // Se originado de uma anotação
  created_at: string;
  updated_at: string;
}

export type RecurrenceFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface Recurrence {
  salary_schedule?: SalarySchedule | null;
  id: string;
  user_id: string;
  account_id: string;
  category_id: string;
  type: TransactionType;
  description: string;
  amount: number;
  frequency: RecurrenceFrequency;
  interval_step: number; // normalmente 1
  start_date: string; // YYYY-MM-DD
  end_date?: string; // YYYY-MM-DD (opcional)
  day_of_week?: number; // 0 = Domingo, 1 = Segunda, etc.
  day_of_month?: number; // 1 a 31
  notes?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface RecurrenceException {
  id: string;
  recurrence_id: string;
  exception_date: string; // YYYY-MM-DD
  action: 'cancelled' | 'deleted' | 'modified';
  new_transaction_id?: string;
  created_at: string;
}

export interface Transfer {
  id: string;
  user_id: string;
  origin_account_id: string;
  destination_account_id: string;
  amount: number;
  transfer_date: string; // YYYY-MM-DD
  notes?: string;
  created_at: string;
}

export type NoteType = 'possible_income' | 'possible_expense' | 'note';
export type NoteStatus = 'open' | 'converted' | 'discarded';

export interface FinancialNote {
  id: string;
  user_id: string;
  title: string;
  type: NoteType;
  estimated_amount?: number;
  category_id?: string;
  notes?: string;
  status: NoteStatus;
  converted_transaction_id?: string;
  created_at: string;
  updated_at: string;
}

export interface FinancialSummary {
  currentBalance: number;       // Saldo atual consolidado
  totalReceived: number;        // Entradas efetivamente recebidas no período
  totalPaid: number;            // Despesas efetivamente pagas no período
  actualResult: number;         // totalReceived - totalPaid
  totalToReceive: number;       // Entradas previstas não recebidas no período
  totalToPay: number;           // Despesas pendentes não pagas no período
  overdueAmount: number;        // Total atrasado (pendente com expected_date < hoje)
  overdueCount: number;         // Quantidade de pendências atrasadas
  expectedResult: number;       // Entradas previstas - despesas previstas no período
  projectedBalanceAtEnd: number;// Saldo projetado no último dia do período
  firstNegativeDate?: string;   // Primeiro dia em que a projeção fica negativa (se houver)
}

export interface PeriodFilter {
  mode: 'current_month' | 'previous_month' | 'custom';
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  dateBase: 'expected' | 'effective';
}

export interface TransactionFilter {
  searchQuery: string;
  type: 'all' | 'income' | 'expense';
  status: 'all' | 'pending' | 'completed' | 'overdue' | 'cancelled';
  categoryId: string;
  accountId: string;
  recurrentOnly: 'all' | 'recurrent' | 'occasional';
  sortBy: 'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc';
}
