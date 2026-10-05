import { describe, expect, it } from 'vitest';
import { sanitizeCSVValue } from '../utils/csvExport';

describe('CSV Security & Sanitization Tests', () => {
  it('neutraliza fórmulas maliciosas prefixadas com =, +, -, @ ou tabs', () => {
    // Fórmulas comumente usadas em CSV injection
    expect(sanitizeCSVValue('=1+2')).toBe(`"'=1+2"`);
    expect(sanitizeCSVValue('+cmd|/c calc')).toBe(`"'+cmd|/c calc"`);
    expect(sanitizeCSVValue('-100')).toBe(`"'-100"`);
    expect(sanitizeCSVValue('@SUM(A1:A10)')).toBe(`"'@SUM(A1:A10)"`);
  });

  it('escapa aspas duplas internas corretamente', () => {
    expect(sanitizeCSVValue('Compra na loja "Magazine"')).toBe('"Compra na loja ""Magazine"""');
  });

  it('lida com valores nulos ou vazios de forma segura', () => {
    expect(sanitizeCSVValue(null)).toBe('""');
    expect(sanitizeCSVValue(undefined)).toBe('""');
    expect(sanitizeCSVValue('')).toBe('""');
  });
});
