/**
 * Utilitários de Data padronizados para o fuso brasileiro (America/Sao_Paulo).
 * Utilizam manipulação de strings YYYY-MM-DD para evitar qualquer deslocamento UTC incorreto.
 */

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

export function getDaysInMonth(year: number, month: number): number {
  // month: 1 a 12
  if (month === 2) {
    return isLeapYear(year) ? 29 : 28;
  }
  if ([4, 6, 9, 11].includes(month)) {
    return 30;
  }
  return 31;
}

export function padZero(num: number): string {
  return num < 10 ? `0${num}` : `${num}`;
}

/**
 * Retorna a data atual no formato YYYY-MM-DD (local)
 */
export function todayString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = padZero(now.getMonth() + 1);
  const day = padZero(now.getDate());
  return `${year}-${month}-${day}`;
}

/**
 * Converte YYYY-MM-DD para DD/MM/AAAA
 */
export function formatDateBR(dateStr?: string | null): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

/**
 * Converte DD/MM/AAAA para YYYY-MM-DD
 */
export function parseDateBR(brStr: string): string | null {
  const clean = brStr.trim();
  const parts = clean.split('/');
  if (parts.length !== 3) return null;
  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const year = parseInt(parts[2], 10);

  if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
  if (month < 1 || month > 12) return null;
  const maxDays = getDaysInMonth(year, month);
  if (day < 1 || day > maxDays) return null;

  return `${year}-${padZero(month)}-${padZero(day)}`;
}

/**
 * Retorna o primeiro dia do mês de uma data YYYY-MM-DD
 */
export function getStartOfMonth(dateStr: string): string {
  const parts = dateStr.split('-');
  return `${parts[0]}-${parts[1]}-01`;
}

/**
 * Retorna o último dia do mês de uma data YYYY-MM-DD
 */
export function getEndOfMonth(dateStr: string): string {
  const parts = dateStr.split('-');
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const maxDay = getDaysInMonth(year, month);
  return `${parts[0]}-${parts[1]}-${padZero(maxDay)}`;
}

/**
 * Retorna o primeiro e último dia do mês anterior a uma data
 */
export function getPreviousMonthRange(dateStr: string): { start: string; end: string } {
  const parts = dateStr.split('-');
  let year = parseInt(parts[0], 10);
  let month = parseInt(parts[1], 10) - 1;
  if (month === 0) {
    month = 12;
    year -= 1;
  }
  const maxDay = getDaysInMonth(year, month);
  return {
    start: `${year}-${padZero(month)}-01`,
    end: `${year}-${padZero(month)}-${padZero(maxDay)}`
  };
}

/**
 * Adiciona ou subtrai dias de uma data YYYY-MM-DD
 */
export function addDays(dateStr: string, days: number): string {
  const parts = dateStr.split('-');
  const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${padZero(d.getMonth() + 1)}-${padZero(d.getDate())}`;
}

/**
 * Adiciona meses respeitando regras de dias inexistentes (dia 31, 28/29 fev, etc)
 * targetDay: o dia de origem desejado (ex: 31)
 */
export function addMonths(dateStr: string, monthsToAdd: number, targetDay?: number): string {
  const parts = dateStr.split('-');
  let year = parseInt(parts[0], 10);
  let month = parseInt(parts[1], 10);
  const originalDay = targetDay ?? parseInt(parts[2], 10);

  const totalMonths = (year * 12 + (month - 1)) + monthsToAdd;
  const newYear = Math.floor(totalMonths / 12);
  const newMonth = (totalMonths % 12) + 1;

  const maxDayInNewMonth = getDaysInMonth(newYear, newMonth);
  // Se o dia original for 31 e o novo mês só tiver 30 dias, usa 30; se o novo mês tiver 31, usa 31!
  const actualDay = Math.min(originalDay, maxDayInNewMonth);

  return `${newYear}-${padZero(newMonth)}-${padZero(actualDay)}`;
}

/**
 * Adiciona anos respeitando 29 de fevereiro para anos bissextos
 */
export function addYears(dateStr: string, yearsToAdd: number, targetDay?: number, targetMonth?: number): string {
  const parts = dateStr.split('-');
  const year = parseInt(parts[0], 10) + yearsToAdd;
  const month = targetMonth ?? parseInt(parts[1], 10);
  const day = targetDay ?? parseInt(parts[2], 10);

  const maxDays = getDaysInMonth(year, month);
  const actualDay = Math.min(day, maxDays);

  return `${year}-${padZero(month)}-${padZero(actualDay)}`;
}

export function isDateBefore(d1: string, d2: string): boolean {
  return d1 < d2;
}

export function isDateAfter(d1: string, d2: string): boolean {
  return d1 > d2;
}

export function isDateEqual(d1: string, d2: string): boolean {
  return d1 === d2;
}

export function isDateBetween(d: string, start: string, end: string): boolean {
  return d >= start && d <= end;
}

export const MONTH_NAMES_BR = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export const MONTH_SHORT_NAMES_BR = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
];

export const WEEKDAY_NAMES_BR = [
  'Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira',
  'Quinta-feira', 'Sexta-feira', 'Sábado'
];

export const WEEKDAY_SHORT_NAMES_BR = [
  'Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'
];

/**
 * Retorna nome legível do mês e ano: "Outubro de 2026"
 */
export function formatMonthYearBR(dateStr: string): string {
  const parts = dateStr.split('-');
  const year = parts[0];
  const monthIndex = parseInt(parts[1], 10) - 1;
  return `${MONTH_NAMES_BR[monthIndex]} de ${year}`;
}
