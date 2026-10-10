import { describe, expect, it } from 'vitest';
import { Recurrence, RecurrenceException, Transaction } from '../types';
import {
  addDays,
  addMonths,
  addYears,
  formatDateBR,
  getDaysInMonth,
  isLeapYear,
  parseDateBR
} from '../utils/date';
import { filterNewOccurrences, generateRecurrenceDates, synchronizePendingSalaryOccurrence } from '../utils/recurrenceEngine';

describe('Date & Recurrence Engine Tests', () => {
  it('identifica corretamente anos bissextos', () => {
    expect(isLeapYear(2024)).toBe(true);
    expect(isLeapYear(2025)).toBe(false);
    expect(isLeapYear(2026)).toBe(false);
    expect(isLeapYear(2028)).toBe(true);
    expect(isLeapYear(2000)).toBe(true);
    expect(isLeapYear(1900)).toBe(false);
  });

  it('retorna os dias exatos de cada mês (28, 29, 30, 31)', () => {
    expect(getDaysInMonth(2026, 1)).toBe(31); // Janeiro
    expect(getDaysInMonth(2026, 2)).toBe(28); // Fevereiro 2026 (não bissexto)
    expect(getDaysInMonth(2024, 2)).toBe(29); // Fevereiro 2024 (bissexto)
    expect(getDaysInMonth(2026, 4)).toBe(30); // Abril
    expect(getDaysInMonth(2026, 7)).toBe(31); // Julho
  });

  it('formatação e parse de datas em formato brasileiro DD/MM/AAAA', () => {
    expect(formatDateBR('2026-10-05')).toBe('05/10/2026');
    expect(parseDateBR('05/10/2026')).toBe('2026-10-05');
    expect(parseDateBR('31/02/2026')).toBeNull(); // Data inválida
  });

  it('regra obrigatória do Dia 31: ajusta para o último dia de meses curtos e retorna para 31 nos meses longos', () => {
    const originDate = '2026-01-31';

    // +1 mês: Fevereiro/2026 (tem 28 dias) -> deve ser 28
    const febDate = addMonths(originDate, 1, 31);
    expect(febDate).toBe('2026-02-28');

    // +2 meses: Março/2026 (tem 31 dias) -> volta para 31!
    const marDate = addMonths(originDate, 2, 31);
    expect(marDate).toBe('2026-03-31');

    // +3 meses: Abril/2026 (tem 30 dias) -> deve ser 30
    const aprDate = addMonths(originDate, 3, 31);
    expect(aprDate).toBe('2026-04-30');

    // +4 meses: Maio/2026 (tem 31 dias) -> volta para 31!
    const mayDate = addMonths(originDate, 4, 31);
    expect(mayDate).toBe('2026-05-31');
  });

  it('regra obrigatória de 29 de fevereiro para recorrência anual', () => {
    const leapDate = '2024-02-29'; // Ano bissexto

    // +1 ano: 2025 não é bissexto -> deve gerar 28/02/2025
    const year1 = addYears(leapDate, 1, 29, 2);
    expect(year1).toBe('2025-02-28');

    // +2 anos: 2026 não é bissexto -> 28/02/2026
    const year2 = addYears(leapDate, 2, 29, 2);
    expect(year2).toBe('2026-02-28');

    // +4 anos: 2028 é bissexto -> volta para 29/02/2028!
    const year4 = addYears(leapDate, 4, 29, 2);
    expect(year4).toBe('2028-02-29');
  });

  it('gera datas de recorrência mensal sem ultrapassar a data limite', () => {
    const rec: Recurrence = {
      id: 'rec-1',
      user_id: 'u-1',
      account_id: 'a-1',
      category_id: 'c-1',
      type: 'expense',
      description: 'Aluguel',
      amount: 1500,
      frequency: 'monthly',
      interval_step: 1,
      start_date: '2026-01-10',
      day_of_month: 10,
      is_active: true,
      created_at: '',
      updated_at: ''
    };

    const dates = generateRecurrenceDates(rec, '2026-04-15');
    expect(dates).toEqual([
      '2026-01-10',
      '2026-02-10',
      '2026-03-10',
      '2026-04-10'
    ]);
  });

  it('alinha a primeira ocorrência mensal ao dia escolhido', () => {
    const recurrence: Recurrence = {
      id: 'rec-15', user_id: 'u-1', account_id: 'a-1', category_id: 'c-1',
      type: 'income', description: 'Faculdade', amount: 926.20,
      frequency: 'monthly', interval_step: 1, start_date: '2026-10-10',
      day_of_month: 15, is_active: true, created_at: '', updated_at: ''
    };

    expect(generateRecurrenceDates(recurrence, '2026-12-31')).toEqual([
      '2026-10-15', '2026-11-15', '2026-12-15'
    ]);
  });

  it('não duplica ocorrências já existentes e respeita exceções de exclusão', () => {
    const rec: Recurrence = {
      id: 'rec-1',
      user_id: 'u-1',
      account_id: 'a-1',
      category_id: 'c-1',
      type: 'expense',
      description: 'Assinatura',
      amount: 50,
      frequency: 'monthly',
      interval_step: 1,
      start_date: '2026-01-15',
      day_of_month: 15,
      is_active: true,
      created_at: '',
      updated_at: ''
    };

    const generated = ['2026-01-15', '2026-02-15', '2026-03-15', '2026-04-15'];

    // Ocorrência de Janeiro já foi gerada e está no banco
    const existingTxs: Transaction[] = [
      {
        id: 'tx-jan',
        user_id: 'u-1',
        account_id: 'a-1',
        category_id: 'c-1',
        type: 'expense',
        description: 'Assinatura',
        amount: 50,
        expected_date: '2026-01-15',
        status: 'completed',
        recurrence_id: 'rec-1',
        created_at: '',
        updated_at: ''
      }
    ];

    // Ocorrência de Fevereiro foi explicitamente excluída pelo usuário
    const exceptions: RecurrenceException[] = [
      {
        id: 'exc-feb',
        recurrence_id: 'rec-1',
        exception_date: '2026-02-15',
        action: 'deleted',
        created_at: ''
      }
    ];

    const toInstantiate = filterNewOccurrences(rec, generated, existingTxs, exceptions);

    // Deve conter apenas Março e Abril (Janeiro já existe, Fevereiro foi excluída)
    expect(toInstantiate).toEqual(['2026-03-15', '2026-04-15']);
  });

  it('sincroniza uma ocorrência pendente com a regra de salário editada', () => {
    const recurrence: Recurrence = {
      id: 'rec-salary', user_id: 'u-1', account_id: 'a-1', category_id: 'salary',
      type: 'income', description: 'Caju', amount: 581.46, frequency: 'monthly',
      interval_step: 1, start_date: '2026-10-10', is_active: true,
      salary_schedule: { mode: 'business', day: 1, businessDay: 'last', advance: false, holidays: [] },
      created_at: '', updated_at: ''
    };
    const stale: Transaction = {
      id: 'tx-1', user_id: 'u-1', account_id: 'a-1', category_id: 'salary',
      type: 'expense', description: 'Caju', amount: 581.46, expected_date: '2026-10-10',
      status: 'pending', recurrence_id: recurrence.id, created_at: '', updated_at: ''
    };

    const synchronized = synchronizePendingSalaryOccurrence(stale, recurrence);

    expect(synchronized.type).toBe('income');
    expect(synchronized.expected_date).toBe('2026-10-30');
    expect(synchronized.salary_month).toBe('2026-10');
  });

  it('não altera o histórico de salários concluídos', () => {
    const recurrence: Recurrence = {
      id: 'rec-salary', user_id: 'u-1', account_id: 'a-1', category_id: 'salary',
      type: 'income', description: 'Salário', amount: 1000, frequency: 'monthly',
      interval_step: 1, start_date: '2026-10-01', is_active: true,
      salary_schedule: { mode: 'business', day: 1, businessDay: 'last', advance: false, holidays: [] },
      created_at: '', updated_at: ''
    };
    const completed: Transaction = {
      id: 'tx-1', user_id: 'u-1', account_id: 'a-1', category_id: 'salary',
      type: 'expense', description: 'Salário', amount: 1000, expected_date: '2026-10-10',
      effective_date: '2026-10-10', status: 'completed', recurrence_id: recurrence.id,
      created_at: '', updated_at: ''
    };

    expect(synchronizePendingSalaryOccurrence(completed, recurrence)).toBe(completed);
  });
});
