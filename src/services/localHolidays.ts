import { SalaryHoliday } from '../types';
import { isCivilDate, nationalHolidays } from '../utils/salarySchedule';

export const holidaysApiUrl = (import.meta.env.VITE_FERIADOS_API_URL || '').replace(/\/$/, '');
export async function brasilApiHolidays(years: number[], signal?: AbortSignal): Promise<SalaryHoliday[]> {
  const lists = await Promise.all(years.map(async year => {
    if (!Number.isInteger(year) || year < 1900 || year > 2199) throw new Error('A consulta de feriados suporta anos entre 1900 e 2199.');
    const rows = await json(`https://brasilapi.com.br/api/feriados/v1/${year}`, signal);
    if (!Array.isArray(rows) || !rows.length) throw new Error('A BrasilAPI não retornou uma lista válida de feriados.');
    const national = nationalHolidays(year);
    return rows.flatMap((row: any): SalaryHoliday[] => {
      if (!isCivilDate(row?.date) || !row.date.startsWith(`${year}-`) || typeof row.name !== 'string' || !row.name.trim()) throw new Error('Resposta inválida da BrasilAPI.');
      // Preserve the existing salary policy: Carnival/Corpus Christi require local confirmation.
      if (!national.has(row.date)) return [];
      return [{ date: row.date, name: row.name, scope: 'national', annual: false, source: 'brasilapi' }];
    });
  }));
  return [...new Map(lists.flat().map(h => [h.date, h])).values()];
}

export async function holidaysWithFallback(city: string, state: string, years: number[], signal?: AbortSignal) {
  if (holidaysApiUrl && city) {
    const local = new AbortController();
    const abort = () => local.abort();
    signal?.addEventListener('abort', abort, { once: true });
    const timer = setTimeout(abort, 7000);
    try {
      if (signal?.aborted) throw new Error('Consulta cancelada.');
      const holidays = await localHolidays(city, state, years, local.signal);
      if (holidays.length) return { holidays, source: 'feriados.dev' as const };
    } catch (error) { if (signal?.aborted) throw error; }
    finally { clearTimeout(timer); signal?.removeEventListener('abort', abort); }
  }
  return { holidays: await brasilApiHolidays(years, signal), source: 'brasilapi' as const };
}
async function json(url: string, signal?: AbortSignal) {
  const response = await fetch(url, { signal, credentials: 'omit' });
  if (!response.ok) throw new Error(response.status === 404 ? 'Localidade não encontrada.' : 'Serviço indisponível. Tente novamente.');
  return response.json();
}
export async function cityFromCep(cep: string, signal?: AbortSignal): Promise<{ city: string; state: string }> {
  const digits = cep.replace(/\D/g, '');
  if (!/^\d{8}$/.test(digits)) throw new Error('Informe um CEP com 8 dígitos.');
  const data = await json(`https://brasilapi.com.br/api/cep/v2/${digits}`, signal);
  if (typeof data?.city !== 'string' || !data.city.trim() || !/^[A-Z]{2}$/.test(data.state)) throw new Error('Resposta de CEP inválida.');
  return { city: data.city, state: data.state };
}
export function parseLocalHolidays(rows: unknown[], year: number): SalaryHoliday[] {
  return rows.flatMap((row: any) => {
    if (!['state', 'municipal'].includes(row?.type)) return [];
    if (!isCivilDate(row.date) || !row.date.startsWith(`${year}-`) || typeof row.name !== 'string' || !row.name.trim()) throw new Error('A API retornou um feriado inválido.');
    return [{ date: row.date, name: row.name, scope: row.type, annual: false, source: 'feriados.dev' as const }];
  });
}
export async function localHolidays(city: string, state: string, years: number[], signal?: AbortSignal): Promise<SalaryHoliday[]> {
  if (!holidaysApiUrl) throw new Error('A consulta de feriados locais ainda não foi configurada pelo administrador.');
  const results: SalaryHoliday[] = [];
  for (const year of years) {
    for (let page = 1; page <= 100; page++) {
      const query = new URLSearchParams({ city, state, year: String(year), page: String(page), limit: '100' });
      const data = await json(`${holidaysApiUrl}/v1/holidays?${query}`, signal);
      if (data?.status !== 'success' || !Array.isArray(data.data) || !Number.isInteger(data.pagination?.totalPages) || data.pagination.totalPages < 0) throw new Error('Resposta inesperada da API de feriados.');
      results.push(...parseLocalHolidays(data.data, year));
      if (page >= data.pagination.totalPages) break;
      if (page === 100) throw new Error('A consulta ultrapassou o limite de páginas.');
    }
  }
  return [...new Map(results.map(h => [`${h.date}:${h.scope}:${h.name}`, h])).values()];
}
