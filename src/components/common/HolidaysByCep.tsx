import { useEffect, useRef, useState } from 'react';
import { MapPin, LoaderCircle, CircleCheck, CircleAlert } from 'lucide-react';
import '../../styles/holiday-feedback.css';
import { SalarySchedule } from '../../types';
import { cityFromCep, holidaysApiUrl, holidaysWithFallback } from '../../services/localHolidays';

export function HolidaysByCep({ value, onChange, month }: { value: SalarySchedule; onChange: (value: SalarySchedule) => void; month: string }) {
  const [cep, setCep] = useState('');
  const [city, setCity] = useState<{ city: string; state: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [feedback, setFeedback] = useState<'loading' | 'success' | 'error' | 'empty'>('loading');
  const [operation, setOperation] = useState<'cep' | 'holidays'>('cep');
  const controller = useRef<AbortController>();
  const latest = useRef(value); latest.current = value;
  useEffect(() => () => { controller.current?.abort(); controller.current = undefined; }, []);
  useEffect(() => { controller.current?.abort(); controller.current = undefined; setBusy(false); setMessage(''); }, [month]);
  const run = async (importDates: boolean) => {
    if (busy) return;
    controller.current?.abort();
    const request = new AbortController(); controller.current = request;
    const timeout = window.setTimeout(() => request.abort(), 25000);
    setOperation(importDates ? 'holidays' : 'cep');
    setBusy(true); setFeedback('loading');
    setMessage(importDates ? 'Buscando feriados. Se a consulta local falhar, usaremos os nacionais da BrasilAPI…' : 'Buscando cidade pelo CEP…');
    try {
      if (!importDates) {
        const found = await cityFromCep(cep, request.signal);
        if (!request.signal.aborted && controller.current === request) {
          setCity(found);
          setFeedback('success');
          setMessage(`Cidade encontrada: ${found.city}/${found.state}. Confirme abaixo para importar os feriados.`);
        }
        return;
      }
      const year = Number(month.slice(0, 4));
      if (!Number.isInteger(year) || year < 1901 || year > 9997) throw new Error('Escolha uma data inicial válida.');
      const years = [year - 1, year, year + 1];
      const { holidays, source } = await holidaysWithFallback(city?.city || '', city?.state || '', years, request.signal);
      if (request.signal.aborted) return;
      if (!holidays.length) {
        setFeedback('empty');
        setMessage('A base não retornou feriados locais. Os feriados já cadastrados foram mantidos. Confira a cobertura da cidade e adicione manualmente se necessário.');
        return;
      }
      onChange({ ...latest.current, ...(source === 'feriados.dev' && city ? { location: { ...city, years } } : {}), holidays: [...latest.current.holidays.filter(h => h.source !== source), ...holidays] });
      setFeedback('success');
      setMessage(source === 'brasilapi'
        ? `${holidays.length} feriados nacionais importados da BrasilAPI (${years.join(', ')}). A consulta local não foi usada. Estaduais e municipais não foram consultados; os já cadastrados foram mantidos. Salve o formulário para guardar as alterações.`
        : `${holidays.length} feriados locais importados para ${city?.city}/${city?.state} (${years.join(', ')}). Confira a lista e salve o formulário.`);
    } catch (err) {
      if (controller.current === request) {
        setFeedback('error');
        setMessage(request.signal.aborted ? 'A busca demorou demais. Tente novamente.' : err instanceof TypeError ? 'Não foi possível conectar ao serviço. Verifique sua conexão ou tente novamente mais tarde.' : err instanceof Error ? err.message : 'Não foi possível consultar. Tente novamente.');
      }
    } finally { clearTimeout(timeout); if (controller.current === request) setBusy(false); }
  };
  return <div className="salary-location">
    <strong><MapPin size={17} />Feriados para o cálculo</strong>
    <p>Use o CEP do local de trabalho. Consultamos a BrasilAPI; não pedimos CPF nem salvamos seu endereço.</p>
    <label>CEP<div className="salary-cep-row"><input className="form-input" aria-label="CEP do local de trabalho" inputMode="numeric" autoComplete="postal-code" placeholder="00000-000" maxLength={9} value={cep} disabled={busy} onChange={e => { setCep(e.target.value.replace(/\D/g, '').slice(0, 8).replace(/^(\d{5})(\d)/, '$1-$2')); setCity(null); setMessage(''); }} /><button type="button" className="btn btn-outline" disabled={busy || cep.replace(/\D/g, '').length !== 8} onClick={() => void run(false)}>{busy ? 'Buscando…' : 'Buscar'}</button></div></label>
    {city && <div className="salary-location-found"><strong>{city.city} / {city.state}</strong><p>Confira se este é o município do seu trabalho.</p><button type="button" className="btn btn-primary btn-sm holiday-import-button" disabled={busy} aria-busy={busy && operation === 'holidays'} onClick={() => void run(true)}>{busy && operation === 'holidays' ? <><LoaderCircle size={16} className="holiday-loading-icon" />Buscando feriados…</> : 'Confirmar e importar feriados'}</button></div>}
    {message && <div className={`holiday-feedback holiday-feedback-${feedback}`} role={feedback === 'error' ? 'alert' : 'status'} aria-atomic="true">
      {feedback === 'loading' ? <LoaderCircle size={19} className="holiday-loading-icon" /> : feedback === 'success' ? <CircleCheck size={19} /> : <CircleAlert size={19} />}
      <span>{message}</span>
    </div>}
    {!city && <button type="button" className="btn btn-primary btn-sm holiday-import-button" disabled={busy} onClick={() => void run(true)}>{busy && operation === 'holidays' ? 'Buscando feriados…' : 'Importar feriados nacionais'}</button>}
    {!holidaysApiUrl && <p>Usaremos a BrasilAPI para os nacionais. Não é necessário CEP para essa consulta. Feriados estaduais e municipais podem ser adicionados manualmente.</p>}
    {value.location && <p>Local salvo: {value.location.city}/{value.location.state}. Anos consultados: {value.location.years.join(', ')}. Fora desses anos, atualize a importação; feriados locais não são projetados.</p>}
  </div>;
}
