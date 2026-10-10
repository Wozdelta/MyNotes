import { Recurrence, RecurrenceException, Transaction } from '../types';
import { salaryDate } from './salarySchedule';
import { addDays, addMonths, addYears, getDaysInMonth, isDateAfter, isDateBefore, isLeapYear, padZero } from './date';

/**
 * Gera as datas das ocorrências de uma recorrência até uma data limite (limitDate).
 */
export function generateRecurrenceDates(
  recurrence: Recurrence,
  limitDate: string,
  maxOccurrences: number = 365
): string[] {
  if (!recurrence.is_active) return [];
  if (recurrence.salary_schedule && recurrence.frequency === 'monthly') {
    const result: string[] = [];
    let month = recurrence.start_date.slice(0, 7);
    const finalMonth = limitDate.slice(0, 7);
    // Include the following reference month: its payment can be advanced into the limit month.
    const lastReference = addMonths(`${finalMonth}-01`, 1).slice(0, 7);
    while (month <= lastReference && result.length < maxOccurrences) {
      const date = salaryDate(month, recurrence.salary_schedule);
      if (date >= recurrence.start_date && date <= limitDate && (!recurrence.end_date || date <= recurrence.end_date)) result.push(date);
      month = addMonths(`${month}-01`, Math.max(1, recurrence.interval_step || 1)).slice(0, 7);
    }
    return result;
  }
  const dates: string[] = [];

  const start = recurrence.start_date;
  const end = recurrence.end_date;

  const startParts = start.split('-');
  const startYear = parseInt(startParts[0], 10);
  const startMonth = parseInt(startParts[1], 10);
  const startDay = parseInt(startParts[2], 10);

  // O dia base desejado para meses (se especificado ou inferido da data inicial)
  const targetDayOfMonth = recurrence.day_of_month ?? startDay;

  let currentDate = start;
  let count = 0;

  while (count < maxOccurrences) {
    if (isDateAfter(currentDate, limitDate)) break;
    if (end && isDateAfter(currentDate, end)) break;

    dates.push(currentDate);
    count++;

    // Próxima data baseada na frequência
    if (recurrence.frequency === 'daily') {
      currentDate = addDays(currentDate, recurrence.interval_step || 1);
    } else if (recurrence.frequency === 'weekly') {
      currentDate = addDays(currentDate, (recurrence.interval_step || 1) * 7);
    } else if (recurrence.frequency === 'monthly') {
      // Regra obrigatória: se dia base for 31 e mês tiver 30 dias, usa 30. No próximo de 31, volta a 31.
      currentDate = addMonths(start, count * (recurrence.interval_step || 1), targetDayOfMonth);
    } else if (recurrence.frequency === 'yearly') {
      // Regra obrigatória para 29 de fevereiro
      currentDate = addYears(start, count * (recurrence.interval_step || 1), startDay, startMonth);
    } else {
      break;
    }
  }

  return dates;
}

/**
 * Filtra ocorrências já existentes ou que possuam exceções registradas.
 */
export function filterNewOccurrences(
  recurrence: Recurrence,
  generatedDates: string[],
  existingTransactions: Transaction[],
  exceptions: RecurrenceException[] = []
): string[] {
  const existingDatesSet = new Set(
    existingTransactions
      .filter(t => t.recurrence_id === recurrence.id)
      .map(t => t.expected_date)
  );

  const exceptionDatesSet = new Set(
    exceptions
      .filter(e => e.recurrence_id === recurrence.id)
      .map(e => e.exception_date)
  );

  return generatedDates.filter(date => {
    // Se já foi gerada no banco ou na lista, ignora
    if (existingDatesSet.has(date)) return false;
    // Se foi explicitamente cancelada ou excluída como exceção, ignora
    if (exceptionDatesSet.has(date)) return false;
    return true;
  });
}

/**
 * Cria instâncias de Transaction prontas para inserção a partir de uma recorrência e datas.
 */
export function instantiateOccurrences(
  recurrence: Recurrence,
  datesToInstantiate: string[],
  idGenerator: () => string
): Transaction[] {
  return datesToInstantiate.map((occurrenceDate, index) => {
    return {
      id: idGenerator(),
      user_id: recurrence.user_id,
      account_id: recurrence.account_id,
      category_id: recurrence.category_id,
      type: recurrence.type,
      description: recurrence.description,
      amount: recurrence.amount,
      expected_date: occurrenceDate,
      status: 'pending', // Regra: Entradas nascem previstas e despesas pendentes
      notes: recurrence.notes,
      salary_schedule: recurrence.salary_schedule || null,
      salary_month: recurrence.salary_schedule
        ? (salaryDate(occurrenceDate.slice(0, 7), recurrence.salary_schedule) === occurrenceDate
          ? occurrenceDate.slice(0, 7) : addMonths(`${occurrenceDate.slice(0, 7)}-01`, 1).slice(0, 7))
        : null,
      recurrence_id: recurrence.id,
      recurrence_index: index + 1,
      is_recurrent: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  });
}
