import { describe, expect, it } from 'vitest';
import { resolveCategoryIcon } from '../components/common/CategoryIcon';

describe('category icons', () => {
  it('recognizes legacy default categories by name and type', () => {
    expect(resolveCategoryIcon({ name: 'Alimentação', type: 'expense' })).toBe('food');
    expect(resolveCategoryIcon({ name: 'Salário', type: 'income' })).toBe('salary');
  });
  it('keeps newly created categories as dots even with a default name', () => {
    expect(resolveCategoryIcon({ name: 'Salário', type: 'income', icon: 'dot' })).toBe('dot');
    expect(resolveCategoryIcon({ name: 'Minha categoria', type: 'expense' })).toBe('dot');
  });
  it('preserves the saved icon after renaming', () => {
    expect(resolveCategoryIcon({ name: 'Mercado', type: 'expense', icon: 'food' })).toBe('food');
  });
});
