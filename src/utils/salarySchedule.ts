import { SalarySchedule } from '../types';

const iso = (date: Date) => date.toISOString().slice(0, 10);
const utc = (date: string) => new Date(`${date}T12:00:00Z`);
export function isCivilDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(utc(value).getTime()) && iso(utc(value)) === value;
}
export function defaultSalarySchedule(day = 5): SalarySchedule {
  return { mode: 'fixed', day, businessDay: 5, advance: false, holidays: [] };
}
export function isSalaryCategory(name?: string) {
  return name?.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase() === 'salario';
}

// Gregorian Easter (Meeus/Jones/Butcher). Civil dates use UTC, never local timestamps.
function easter(year: number): Date {
  const a = year % 19, b = Math.floor(year / 100), c = year % 100;
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const n = h + l - 7 * m + 114;
  return new Date(Date.UTC(year, Math.floor(n / 31) - 1, n % 31 + 1, 12));
}

/** National calendar: fixed holidays plus Good Friday; no optional Carnival/Corpus Christi.
 * Source and scope are documented in SALARIO.md. Changes in legislation require updating this list.
 */
export function nationalHolidays(year: number): Set<string> {
  const fixed = ['01-01', '04-21', '05-01', '09-07', '10-12', '11-02', '11-15', '12-25'];
  if (year >= 2024) fixed.push('11-20');
  const dates = new Set(fixed.map(day => `${year}-${day}`));
  const friday = easter(year); friday.setUTCDate(friday.getUTCDate() - 2);
  dates.add(iso(friday));
  return dates;
}
export function isSalaryBusinessDay(date: string, schedule: SalarySchedule): boolean {
  if (!isCivilDate(date)) return false;
  const weekday = utc(date).getUTCDay();
  return weekday !== 0 && weekday !== 6 && !nationalHolidays(Number(date.slice(0, 4))).has(date)
    && !schedule.holidays.some(h => h.annual ? h.date.slice(5) === date.slice(5) : h.date === date);
}
export function validateSalarySchedule(schedule: SalarySchedule): void {
  if (!['fixed', 'business'].includes(schedule.mode) || !Number.isInteger(schedule.day) || schedule.day < 1 || schedule.day > 31
    || ![1, 2, 3, 4, 5, 10, 'penultimate', 'last'].includes(schedule.businessDay)
    || typeof schedule.advance !== 'boolean' || !Array.isArray(schedule.holidays)
    || schedule.holidays.some(h => !isCivilDate(h.date) || !h.name.trim() || !['state', 'municipal', 'national'].includes(h.scope) || typeof h.annual !== 'boolean')) {
    throw new Error('Confira a configuração de salário e as datas dos feriados.');
  }
}
export function salaryDate(month: string, schedule: SalarySchedule): string {
  validateSalarySchedule(schedule);
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month) || Number(month.slice(0, 4)) < 1900 || Number(month.slice(0, 4)) > 9998) throw new Error('Informe um mês válido entre 1900 e 9998.');
  const [year, m] = month.split('-').map(Number);
  const lastDay = new Date(Date.UTC(year, m, 0, 12)).getUTCDate();
  const makeDate = (day: number) => `${month}-${String(day).padStart(2, '0')}`;
  if (schedule.mode === 'fixed') {
    let result = makeDate(Math.min(lastDay, schedule.day));
    if (schedule.advance) {
      let steps = 0;
      while (!isSalaryBusinessDay(result, schedule)) {
        if (++steps > 366) throw new Error('Não foi encontrado um dia útil anterior. Confira os feriados.');
        const previous = utc(result); previous.setUTCDate(previous.getUTCDate() - 1); result = iso(previous);
      }
    }
    return result;
  }
  const days = Array.from({ length: lastDay }, (_, i) => makeDate(i + 1)).filter(date => isSalaryBusinessDay(date, schedule));
  const index = schedule.businessDay === 'last' ? days.length - 1 : schedule.businessDay === 'penultimate' ? days.length - 2 : schedule.businessDay - 1;
  if (!days[index]) throw new Error('O mês não possui dias úteis suficientes para essa regra. Confira os feriados.');
  return days[index];
}
export function salaryScheduleLabel(schedule: SalarySchedule): string {
  if (schedule.mode === 'fixed') return `Todo mês, dia ${schedule.day}${schedule.advance ? ' (antecipado para dia útil)' : ''}`;
  if (schedule.businessDay === 'last') return 'Último dia útil do mês';
  if (schedule.businessDay === 'penultimate') return 'Penúltimo dia útil do mês';
  return schedule.businessDay === 10 ? 'Até o 10º dia útil do mês' : `${schedule.businessDay}º dia útil do mês`;
}
