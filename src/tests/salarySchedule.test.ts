import { describe, expect, it } from 'vitest';
import { Recurrence, SalarySchedule } from '../types';
import { defaultSalarySchedule, isCivilDate, isSalaryBusinessDay, isSalaryCategory, nationalHolidays, salaryDate } from '../utils/salarySchedule';
import { filterNewOccurrences, generateRecurrenceDates, instantiateOccurrences } from '../utils/recurrenceEngine';
import { DataRepository } from '../services/dataRepository';

const fixed = (day: number, advance = false): SalarySchedule => ({ ...defaultSalarySchedule(day), advance });
const business = (businessDay: SalarySchedule['businessDay']): SalarySchedule => ({ ...defaultSalarySchedule(), mode: 'business', businessDay });
const rec = (rule: SalarySchedule): Recurrence => ({ id: 'salary-rec', user_id: 'salary-test', account_id: 'acc', category_id: 'salary', type: 'income', description: 'Salário', amount: 1000, frequency: 'monthly', interval_step: 1, start_date: '2026-01-01', is_active: true, salary_schedule: rule, created_at: '', updated_at: '' });

describe('Salário: calendário civil e regras', () => {
  it('detecta categoria sem depender de acento ou caixa', () => {
    expect(isSalaryCategory(' Salário ')).toBe(true);
    expect(isSalaryCategory('SALARIO')).toBe(true);
    expect(isSalaryCategory('Salário extra')).toBe(false);
  });
  it.each([['2026-02', '2026-02-28'], ['2028-02', '2028-02-29'], ['2026-04', '2026-04-30'], ['2026-05', '2026-05-31']])('dia 31 em %s', (month, expected) => {
    expect(salaryDate(month, fixed(31))).toBe(expected);
  });
  it('antecipa sábados, domingos e cadeia de feriados, inclusive no ano anterior', () => {
    expect(salaryDate('2026-10', fixed(10, true))).toBe('2026-10-09');
    expect(salaryDate('2026-10', fixed(11, true))).toBe('2026-10-09');
    expect(salaryDate('2026-10', fixed(12, true))).toBe('2026-10-09');
    expect(salaryDate('2026-01', fixed(1, true))).toBe('2025-12-31');
    expect(salaryDate('2026-10', fixed(12))).toBe('2026-10-12');
  });
  it.each([[1,'2026-01-02'],[2,'2026-01-05'],[3,'2026-01-06'],[4,'2026-01-07'],[5,'2026-01-08'],[10,'2026-01-15'],['penultimate','2026-01-29'],['last','2026-01-30']] as const)('calcula opção %s em janeiro', (ordinal, expected) => {
    expect(salaryDate('2026-01', business(ordinal))).toBe(expected);
  });
  it('recalcula o quinto dia útil todo mês, inclusive feriado móvel', () => {
    expect(salaryDate('2026-02', business(5))).toBe('2026-02-06');
    expect(salaryDate('2026-03', business(5))).toBe('2026-03-06');
    expect(salaryDate('2026-04', business(5))).toBe('2026-04-08');
    expect(salaryDate('2026-05', business(5))).toBe('2026-05-08');
  });
  it('calcula Paixão de Cristo por ano e inclui Consciência Negra desde 2024', () => {
    expect(nationalHolidays(2026).has('2026-04-03')).toBe(true);
    expect(nationalHolidays(2027).has('2027-03-26')).toBe(true);
    expect(nationalHolidays(2026).has('2026-11-20')).toBe(true);
    expect(nationalHolidays(2023).has('2023-11-20')).toBe(false);
    expect(isSalaryBusinessDay('2026-02-17', business(1))).toBe(true); // Carnaval não é feriado nacional.
  });
  it('considera feriados locais anuais e pontuais sem contar duplicatas duas vezes', () => {
    const rule = business(5);
    rule.holidays = [
      { date: '2026-01-02', name: 'Municipal', scope: 'municipal', annual: true },
      { date: '2026-01-05', name: 'Estadual', scope: 'state', annual: false },
      { date: '2026-01-05', name: 'Duplicado', scope: 'municipal', annual: false }
    ];
    expect(salaryDate('2026-01', rule)).toBe('2026-01-12');
    expect(isSalaryBusinessDay('2029-01-02', rule)).toBe(false);
    expect(isSalaryBusinessDay('2027-01-05', rule)).toBe(true);
  });
  it('rejeita datas, regras e meses inválidos sem entrar em loop', () => {
    expect(isCivilDate('2026-02-31')).toBe(false);
    expect(() => salaryDate('2026-13', fixed(5))).toThrow();
    expect(() => salaryDate('2026-02', fixed(32))).toThrow();
    const rule = business(10);
    rule.holidays = Array.from({ length: 28 }, (_, i) => ({ date: `2026-02-${String(i + 1).padStart(2, '0')}`, name: 'Fechado', scope: 'state' as const, annual: false }));
    expect(() => salaryDate('2026-02', rule)).toThrow('dias úteis suficientes');
  });
  it('recorrência respeita regra, intervalo, fim e exceções', () => {
    const recurrence = { ...rec(business(5)), interval_step: 2, end_date: '2026-05-08' };
    const dates = generateRecurrenceDates(recurrence, '2026-12-31');
    expect(dates).toEqual(['2026-01-08', '2026-03-06', '2026-05-08']);
    expect(filterNewOccurrences(recurrence, dates, [], [{ id: 'exc', recurrence_id: recurrence.id, exception_date: dates[1], action: 'deleted', created_at: '' }])).toEqual([dates[0], dates[2]]);
    expect(generateRecurrenceDates({ ...recurrence, is_active: false }, '2026-12-31')).toEqual([]);
  });
  it('mantém mês de referência quando antecipado para o mês anterior', () => {
    const recurrence = { ...rec(fixed(1, true)), start_date: '2025-12-01' };
    const dates = generateRecurrenceDates(recurrence, '2025-12-31');
    expect(dates).toEqual(['2025-12-01', '2025-12-31']);
    expect(instantiateOccurrences(recurrence, dates, () => 'id')[1].salary_month).toBe('2026-01');
  });
  it('persiste, recupera, altera e remove a configuração sem mudar a data efetiva', async () => {
    const repository = new DataRepository('isolated-salary-test');
    const tx = await repository.createTransaction({ account_id: 'acc', category_id: 'salary', type: 'income', description: 'Salário teste', amount: 1000, status: 'completed', expected_date: '2026-04-01', effective_date: '2026-04-06', salary_schedule: business(5), salary_month: '2026-04' });
    expect(tx.expected_date).toBe('2026-04-08');
    const loaded = (await repository.getTransactions()).find(t => t.id === tx.id)!;
    expect(loaded.salary_schedule).toEqual(business(5));
    const updated = await repository.updateTransaction(tx.id, { salary_schedule: fixed(31), salary_month: '2028-02' });
    expect(updated.expected_date).toBe('2028-02-29');
    expect(updated.effective_date).toBe('2026-04-06');
    const removed = await repository.updateTransaction(tx.id, { salary_schedule: null, salary_month: null });
    expect(removed.salary_schedule).toBeNull();
  });
});
