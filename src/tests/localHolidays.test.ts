import { afterEach, describe, expect, it, vi } from 'vitest';
import { cityFromCep, parseLocalHolidays, brasilApiHolidays } from '../services/localHolidays';
import { defaultSalarySchedule, salaryDate } from '../utils/salarySchedule';
afterEach(() => vi.unstubAllGlobals());
describe('feriados por CEP', () => {
  it('imports national API dates without enabling optional holidays', async () => {
    const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => [
      { name: 'Natal', date: '2026-12-25' }, { name: 'Carnaval', date: '2026-02-17' }
    ] });
    vi.stubGlobal('fetch', fetch);
    expect(await brasilApiHolidays([2026])).toEqual([{ name: 'Natal', date: '2026-12-25', scope: 'national', source: 'brasilapi', annual: false }]);
    expect(fetch.mock.calls[0][0]).toBe('https://brasilapi.com.br/api/feriados/v1/2026');
  });
  it('does not accept an invalid national response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ error: 'Unavailable' }) }));
    await expect(brasilApiHolidays([2026])).rejects.toThrow('lista válida');
  });
  it('rejects invalid CEP without network calls', async () => {
    const fetch = vi.fn(); vi.stubGlobal('fetch', fetch);
    await expect(cityFromCep('123')).rejects.toThrow('8 dígitos');
    expect(fetch).not.toHaveBeenCalled();
  });
  it('returns only city and state', async () => {
    const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ city: 'São Paulo', state: 'SP', street: 'Rua de teste' }) });
    vi.stubGlobal('fetch', fetch);
    expect(await cityFromCep('01001-000')).toEqual({ city: 'São Paulo', state: 'SP' });
    expect(fetch.mock.calls[0][0]).toBe('https://brasilapi.com.br/api/cep/v2/01001000');
  });
  it('reports service errors', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 503 }));
    await expect(cityFromCep('01001000')).rejects.toThrow('indisponível');
  });
  it('imports only local non-optional dates', () => {
    expect(parseLocalHolidays([
      { type: 'municipal', name: 'Local', date: '2026-10-05' },
      { type: 'optional', name: 'Facultativo', date: '2026-10-06' },
      { type: 'national', name: 'Nacional', date: '2026-10-12' }
    ], 2026)).toEqual([{ scope: 'municipal', name: 'Local', date: '2026-10-05', annual: false, source: 'feriados.dev' }]);
  });
  it('rejects malformed dates and the wrong year', () => {
    expect(() => parseLocalHolidays([{ type: 'state', name: 'Teste', date: '2026-02-30' }], 2026)).toThrow();
    expect(() => parseLocalHolidays([{ type: 'state', name: 'Teste', date: '2027-01-01' }], 2026)).toThrow();
  });
  it('advances salary over an imported holiday and weekend', () => {
    const rule = { ...defaultSalarySchedule(5), advance: true, holidays: parseLocalHolidays([{ type: 'municipal', name: 'Local', date: '2026-10-05' }], 2026) };
    expect(salaryDate('2026-10', rule)).toBe('2026-10-02');
  });
});
