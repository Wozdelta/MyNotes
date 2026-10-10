import React from 'react';
import { Banknote, BriefcaseBusiness, Car, GraduationCap, HeartPulse, House, MoreHorizontal, PiggyBank, ReceiptText, RotateCcw, ShoppingBag, Sparkles, Tv, Utensils, Wallet, type LucideIcon } from 'lucide-react';
import { Category } from '../../types';

const defaultIcons: Record<string, { key: string; icon: LucideIcon }> = {
  'income:Salário': { key: 'salary', icon: Banknote },
  'income:Renda extra': { key: 'extra-income', icon: Sparkles },
  'income:Serviços': { key: 'services', icon: BriefcaseBusiness },
  'income:Reembolso': { key: 'refund', icon: RotateCcw },
  'income:Outros ganhos': { key: 'other-income', icon: PiggyBank },
  'expense:Moradia': { key: 'housing', icon: House },
  'expense:Alimentação': { key: 'food', icon: Utensils },
  'expense:Transporte': { key: 'transport', icon: Car },
  'expense:Saúde': { key: 'health', icon: HeartPulse },
  'expense:Lazer': { key: 'leisure', icon: Tv },
  'expense:Assinaturas': { key: 'subscriptions', icon: ReceiptText },
  'expense:Educação': { key: 'education', icon: GraduationCap },
  'expense:Compras': { key: 'shopping', icon: ShoppingBag },
  'expense:Outros gastos': { key: 'other-expense', icon: Wallet }
};

// Legacy seed records have no icon. New custom categories explicitly store "dot".
export function resolveCategoryIcon(category: Pick<Category, 'name' | 'type' | 'icon'>): string {
  return category.icon || defaultIcons[`${category.type}:${category.name}`]?.key || 'dot';
}

export const CategoryIcon: React.FC<{ category: Category }> = ({ category }) => {
  const key = resolveCategoryIcon(category);
  const Icon = Object.values(defaultIcons).find(item => item.key === key)?.icon;
  const color = category.color || '#3b82f6';
  if (!Icon) return <span aria-hidden="true" style={{ display: 'inline-block', width: 14, height: 14, borderRadius: '50%', background: color, flexShrink: 0 }} />;
  return <span aria-hidden="true" style={{ display: 'grid', placeItems: 'center', width: 38, height: 38, borderRadius: 12, flexShrink: 0, color, background: `color-mix(in srgb, ${color} 12%, var(--bg-card))` }}>
    <Icon size={21} strokeWidth={1.8} />
  </span>;
};
