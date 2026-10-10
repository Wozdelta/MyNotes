import { useId, useState } from 'react';
import { SalaryHoliday, SalarySchedule } from '../../types';
import { isCivilDate, salaryDate } from '../../utils/salarySchedule';
import { formatDateBR } from '../../utils/date';
import { Select } from './Select';
import { DateInput } from './DateInput';
import { HolidaysByCep } from './HolidaysByCep';

export function SalaryScheduleFields({ value, onChange, month, onMonthChange }: {
  value: SalarySchedule; onChange: (rule: SalarySchedule) => void; month: string; onMonthChange?: (month: string) => void;
}) {
  const id = useId();
  const [date, setDate] = useState('');
  const [name, setName] = useState('');
  const [scope, setScope] = useState<SalaryHoliday['scope']>('municipal');
  const [annual, setAnnual] = useState(true);
  const [error, setError] = useState('');
  const update = (patch: Partial<SalarySchedule>) => onChange({ ...value, ...patch });
  let preview: { month: string; date: string }[] = [], calculationError = '';
  try {
    const [y, m] = month.split('-').map(Number);
    preview = Array.from({ length: 3 }, (_, i) => {
      const target = new Date(Date.UTC(y, m - 1 + i, 1, 12)).toISOString().slice(0, 7);
      return { month: target, date: salaryDate(target, value) };
    });
  } catch (err) { calculationError = err instanceof Error ? err.message : 'Informe o mês de referência.'; }
  return <section className="salary-settings" aria-labelledby={`${id}-title`}>
    <h3 id={`${id}-title`}>Quando você recebe seu salário?</h3>
    <HolidaysByCep value={value} onChange={onChange} month={month} />
    <label className="form-group">Tipo de recebimento<Select className="form-select" value={value.mode} onChange={e => update({ mode: e.target.value as SalarySchedule['mode'] })}><option value="fixed">Dia fixo do mês</option><option value="business">Dia útil do mês</option></Select></label>
    {value.mode === 'fixed' ? <><label className="form-group">Dia do mês<Select className="form-select" value={value.day} onChange={e => update({ day: Number(e.target.value) })}>{Array.from({ length: 31 }, (_, i) => <option key={i + 1} value={i + 1}>Todo dia {i + 1}</option>)}</Select></label><label className="salary-check"><input type="checkbox" checked={value.advance} onChange={e => update({ advance: e.target.checked })} />Antecipar para o dia útil anterior se cair em fim de semana ou feriado</label><p className="salary-help">Se o mês não tiver esse dia, usamos o último dia do mês antes de aplicar a antecipação.</p></> : <><label className="form-group">Qual dia útil?<Select className="form-select" value={value.businessDay} onChange={e => update({ businessDay: (['last', 'penultimate'].includes(e.target.value) ? e.target.value : Number(e.target.value)) as SalarySchedule['businessDay'] })}>{[1,2,3,4,5,10].map(day => <option key={day} value={day}>{day === 10 ? 'Até o 10º' : `${day}º`} dia útil do mês</option>)}<option value="penultimate">Penúltimo dia útil do mês</option><option value="last">Último dia útil do mês</option></Select></label>{value.businessDay === 10 && <p className="salary-help">A previsão usa o 10º dia útil como prazo limite. O recebimento pode ocorrer antes.</p>}</>}
    {onMonthChange && <label className="form-group">Mês de referência<input className="form-input" type="month" min="1900-01" max="9998-12" value={month} onChange={e => onMonthChange(e.target.value)} required /></label>}
    <details className="salary-holidays"><summary>Feriados cadastrados ({value.holidays.length})</summary><p className="salary-help">Adicione os feriados do seu local de trabalho. Datas móveis devem ser cadastradas para cada ano.</p><div className="form-group"><label htmlFor={`${id}-holiday-name`}>Nome do feriado</label><input id={`${id}-holiday-name`} className="form-input" value={name} onChange={e => setName(e.target.value)} placeholder="Ex.: Aniversário da cidade" /></div><div className="salary-field-row"><label className="form-group">Data<DateInput className="form-input" value={date} onChange={e => setDate(e.target.value)} /></label><label className="form-group">Abrangência<Select className="form-select" value={scope} onChange={e => setScope(e.target.value as SalaryHoliday['scope'])}><option value="municipal">Municipal</option><option value="state">Estadual</option></Select></label></div><label className="salary-check"><input type="checkbox" checked={annual} onChange={e => setAnnual(e.target.checked)} />Repetir nesta data todos os anos</label><button type="button" className="btn btn-outline btn-sm" onClick={() => { if (!name.trim() || !isCivilDate(date)) { setError('Informe o nome e uma data válida para adicionar o feriado.'); return; } update({ holidays: [...value.holidays, { name: name.trim(), date, scope, annual }] }); setName(''); setDate(''); setError(''); }}>Adicionar feriado</button>{error && <p role="alert" className="salary-error">{error}</p>}<ul>{value.holidays.map((h, index) => <li key={`${h.date}-${index}`}><span>{h.name} · {formatDateBR(h.date)}<small>{h.scope === 'national' ? 'Nacional' : h.scope === 'state' ? 'Estadual' : 'Municipal'} · {h.annual ? 'Anual' : 'Somente neste ano'}</small></span><button type="button" className="btn btn-outline btn-sm" aria-label={`Remover ${h.name}`} onClick={() => update({ holidays: value.holidays.filter((_, i) => i !== index) })}>Remover</button></li>)}</ul></details>
    <div className="salary-preview" aria-live="polite"><strong>Próximas datas calculadas</strong>{calculationError ? <p role="alert" className="salary-error">{calculationError}</p> : preview.map(p => <div key={p.month}><span>{p.month.slice(5)}/{p.month.slice(0,4)}</span><strong>{formatDateBR(p.date)}</strong></div>)}</div><p className="salary-help">Sábados, domingos e feriados nacionais são desconsiderados. Carnaval e Corpus Christi só entram se adicionados como feriados locais. A prévia não cria lançamentos futuros.</p>
  </section>;
}
