import { createClient, SupabaseClient } from '@supabase/supabase-js';
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

// Leitura segura das variáveis de ambiente públicas
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(
  import.meta.env.MODE !== 'test' &&
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl !== 'https://seu-projeto.supabase.co' &&
  supabaseAnonKey !== 'sua-chave-publica-anon-aqui'
);

export const supabaseConfigurationError = isSupabaseConfigured
  ? null
  : 'Supabase não configurado. Adicione VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY nas variáveis de ambiente da Vercel e publique novamente.';

// Capture before the SDK consumes the recovery fragment.
export const hasRecoveryRedirect = typeof window !== 'undefined' &&
  new URLSearchParams(window.location.hash.slice(1)).get('type') === 'recovery';

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    })
  : null;

// Categorias padrão sugeridas (Requisito 9 do prompt)
export const DEFAULT_CATEGORIES: { name: string; type: 'income' | 'expense'; color: string }[] = [
  // Entradas
  { name: 'Salário', type: 'income', color: '#10b981' },
  { name: 'Renda extra', type: 'income', color: '#06b6d4' },
  { name: 'Serviços', type: 'income', color: '#3b82f6' },
  { name: 'Reembolso', type: 'income', color: '#8b5cf6' },
  { name: 'Outros ganhos', type: 'income', color: '#14b8a6' },
  // Despesas
  { name: 'Moradia', type: 'expense', color: '#ef4444' },
  { name: 'Alimentação', type: 'expense', color: '#f97316' },
  { name: 'Transporte', type: 'expense', color: '#eab308' },
  { name: 'Saúde', type: 'expense', color: '#ec4899' },
  { name: 'Lazer', type: 'expense', color: '#a855f7' },
  { name: 'Assinaturas', type: 'expense', color: '#6366f1' },
  { name: 'Educação', type: 'expense', color: '#0ea5e9' },
  { name: 'Compras', type: 'expense', color: '#f43f5e' },
  { name: 'Outros gastos', type: 'expense', color: '#64748b' }
];

// Gerador de ID compatível com UUID v4
export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
