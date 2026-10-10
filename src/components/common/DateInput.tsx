import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { createPortal } from 'react-dom';

type DateInputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange'> & {
  value: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
};

const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const pad = (value: number) => String(value).padStart(2, '0');
const today = () => {
  const date = new Date();
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};
const displayDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value)
  ? `${value.slice(8, 10)}/${value.slice(5, 7)}/${value.slice(0, 4)}`
  : '';
const parseDisplayDate = (value: string) => {
  const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return '';
  const iso = `${match[3]}-${match[2]}-${match[1]}`;
  const date = new Date(`${iso}T12:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === iso ? iso : '';
};

export const DateInput: React.FC<DateInputProps> = ({
  value,
  onChange,
  min,
  max,
  required,
  disabled,
  readOnly,
  className = '',
  style,
  id,
  name,
  placeholder = 'dd/mm/aaaa',
  'aria-label': ariaLabel,
  ...inputProps
}) => {
  const generatedId = useId();
  const dialogId = `${generatedId}-calendar`;
  const inputRef = useRef<HTMLInputElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(displayDate(value));
  const initial = value || today();
  const [visibleMonth, setVisibleMonth] = useState(initial.slice(0, 7));
  const [popupStyle, setPopupStyle] = useState<React.CSSProperties>({});

  useEffect(() => setDraft(displayDate(value)), [value]);
  useEffect(() => { if (open) setVisibleMonth((value || today()).slice(0, 7)); }, [open, value]);

  const emit = (next: string) => onChange?.({
    target: { value: next, name },
    currentTarget: { value: next, name }
  } as React.ChangeEvent<HTMLInputElement>);

  const positionPopup = () => {
    const anchor = inputRef.current?.parentElement;
    if (!anchor) return;
    const rect = anchor.getBoundingClientRect();
    const width = Math.min(320, window.innerWidth - 16);
    const estimatedHeight = 388;
    const below = window.innerHeight - rect.bottom - 8;
    const above = rect.top - 8;
    const openAbove = below < Math.min(estimatedHeight, 280) && above > below;
    setPopupStyle({
      width,
      left: Math.max(8, Math.min(rect.left, window.innerWidth - width - 8)),
      top: openAbove ? Math.max(8, rect.top - Math.min(estimatedHeight, above) - 6) : rect.bottom + 6,
      maxHeight: Math.max(240, openAbove ? above : below)
    });
  };

  useEffect(() => {
    if (!open) return;
    positionPopup();
    const outside = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!inputRef.current?.parentElement?.contains(target) && !popupRef.current?.contains(target)) setOpen(false);
    };
    const layout = () => positionPopup();
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setOpen(false); buttonRef.current?.focus(); }
    };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', key);
    window.addEventListener('resize', layout);
    window.addEventListener('scroll', layout, true);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('keydown', key);
      window.removeEventListener('resize', layout);
      window.removeEventListener('scroll', layout, true);
    };
  }, [open]);

  const cells = useMemo(() => {
    const [year, month] = visibleMonth.split('-').map(Number);
    const first = new Date(Date.UTC(year, month - 1, 1, 12));
    const start = new Date(first);
    start.setUTCDate(1 - first.getUTCDay());
    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(start); date.setUTCDate(start.getUTCDate() + index);
      const iso = date.toISOString().slice(0, 10);
      return { iso, day: date.getUTCDate(), current: date.getUTCMonth() === month - 1 };
    });
  }, [visibleMonth]);

  const changeMonth = (amount: number) => {
    const [year, month] = visibleMonth.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1 + amount, 1, 12));
    setVisibleMonth(date.toISOString().slice(0, 7));
  };
  const selectDate = (date: string) => { emit(date); setDraft(displayDate(date)); setOpen(false); inputRef.current?.focus(); };
  const isUnavailable = (date: string) => Boolean((min && date < String(min)) || (max && date > String(max)));
  const [year, month] = visibleMonth.split('-').map(Number);

  return <div className={`date-input ${className.replace(/\bform-input\b/g, '').trim()}`} style={style}>
    <input
      {...inputProps}
      ref={inputRef}
      id={id}
      name={name}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      value={draft}
      placeholder={placeholder}
      aria-label={ariaLabel}
      aria-required={required}
      aria-invalid={Boolean(draft && !parseDisplayDate(draft))}
      disabled={disabled}
      readOnly={readOnly}
      onChange={event => {
        const digits = event.target.value.replace(/\D/g, '').slice(0, 8);
        const masked = digits.length <= 2 ? digits : digits.length <= 4 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
        setDraft(masked);
        const parsed = parseDisplayDate(masked);
        if (parsed && !isUnavailable(parsed)) emit(parsed);
        if (!masked && !required) emit('');
      }}
      onBlur={() => setDraft(displayDate(value))}
    />
    <button ref={buttonRef} type="button" className="date-input-button" disabled={disabled || readOnly} aria-label="Abrir calendário" aria-haspopup="dialog" aria-expanded={open} aria-controls={dialogId} onClick={() => setOpen(current => !current)}><CalendarDays size={17} /></button>
    {open && createPortal(<div ref={popupRef} id={dialogId} role="dialog" aria-label="Escolher data" className="date-picker" style={popupStyle}>
      <div className="date-picker-header"><button type="button" aria-label="Mês anterior" onClick={() => changeMonth(-1)}><ChevronLeft size={19} /></button><strong>{monthNames[month - 1]} de {year}</strong><button type="button" aria-label="Próximo mês" onClick={() => changeMonth(1)}><ChevronRight size={19} /></button></div>
      <div className="date-picker-weekdays">{weekDays.map(day => <span key={day}>{day}</span>)}</div>
      <div className="date-picker-grid">{cells.map(cell => <button type="button" key={cell.iso} disabled={isUnavailable(cell.iso)} className={`${cell.current ? '' : 'outside'} ${cell.iso === value ? 'selected' : ''} ${cell.iso === today() ? 'today' : ''}`} aria-label={displayDate(cell.iso)} aria-pressed={cell.iso === value} onClick={() => selectDate(cell.iso)}>{cell.day}</button>)}</div>
      <div className="date-picker-footer">{!required && !readOnly && <button type="button" onClick={() => { emit(''); setDraft(''); setOpen(false); }}>Limpar</button>}<button type="button" disabled={isUnavailable(today())} onClick={() => selectDate(today())}>Hoje</button></div>
    </div>, document.body)}
  </div>;
};
