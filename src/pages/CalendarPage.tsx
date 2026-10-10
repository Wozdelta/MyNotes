import React, { useMemo, useState } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Edit2, List, Plus } from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { Transaction, TransactionType } from '../types';
import { addMonths, formatDateBR, getDaysInMonth, MONTH_NAMES_BR, padZero, todayString, WEEKDAY_SHORT_NAMES_BR } from '../utils/date';
import { formatCurrency } from '../utils/finance';
import '../styles/finance-pages.css';

interface CalendarPageProps {
  onOpenCreateWithDate: (date: string, type?: TransactionType) => void;
  onOpenEdit: (transaction: Transaction) => void;
}

export const CalendarPage: React.FC<CalendarPageProps> = ({ onOpenCreateWithDate, onOpenEdit }) => {
  const { transactions, categories } = useFinance();
  const today = todayString();
  const [currentYearMonth, setCurrentYearMonth] = useState(today.slice(0, 7));
  const [selectedDate, setSelectedDate] = useState(today);
  const [viewMode, setViewMode] = useState<'grid' | 'agenda'>('grid');
  const [calendarDateBase, setCalendarDateBase] = useState<'expected' | 'effective'>('expected');
  const [year, month] = currentYearMonth.split('-').map(Number);
  const categoryMap = new Map(categories.map(c => [c.id, c]));
  const dailyTransactionsMap = useMemo(() => {
    const map = new Map<string, Transaction[]>();
    for (const t of transactions) {
      if (t.status === 'cancelled') continue;
      const date = calendarDateBase === 'effective' && t.effective_date ? t.effective_date : t.expected_date;
      if (!date.startsWith(currentYearMonth)) continue;
      map.set(date, [...(map.get(date) || []), t]);
    }
    return map;
  }, [transactions, currentYearMonth, calendarDateBase]);
  const selectedTransactions = dailyTransactionsMap.get(selectedDate) || [];
  const income = selectedTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  const expense = selectedTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  const changeMonth = (step: number) => {
    const next = addMonths(currentYearMonth + '-01', step).slice(0, 7);
    setCurrentYearMonth(next);
    setSelectedDate(next === today.slice(0, 7) ? today : next + '-01');
  };

  return (
    <div className="page-wrapper finance-page agenda-page">
      <header className="finance-page-heading">
        <span className="finance-eyebrow">SEU MÊS, DIA A DIA</span>
        <h1>Agenda financeira</h1>
        <p>Acompanhe suas entradas e pagamentos.</p>
      </header>
      <div className="agenda-controls">
        <div className="agenda-month-nav">
          <button className="btn-icon" onClick={() => changeMonth(-1)} aria-label="Mês anterior"><ChevronLeft size={20} /></button>
          <h2>{MONTH_NAMES_BR[month - 1]} <span>{year}</span></h2>
          <button className="btn-icon" onClick={() => changeMonth(1)} aria-label="Próximo mês"><ChevronRight size={20} /></button>
        </div>
        <div className="agenda-toolbar">
          <div className="finance-segment agenda-date-base" aria-label="Data dos lançamentos">
            <button aria-pressed={calendarDateBase === 'expected'} onClick={() => setCalendarDateBase('expected')}>Data prevista</button>
            <button aria-pressed={calendarDateBase === 'effective'} onClick={() => setCalendarDateBase('effective')}>Data efetiva</button>
          </div>
          <button className="btn btn-outline btn-sm" onClick={() => { setCurrentYearMonth(today.slice(0, 7)); setSelectedDate(today); }}>Hoje</button>
          <div className="finance-segment" aria-label="Visualização da agenda">
            <button aria-label="Calendário" aria-pressed={viewMode === 'grid'} onClick={() => setViewMode('grid')}><CalendarIcon size={17} /></button>
            <button aria-label="Lista de lançamentos" aria-pressed={viewMode === 'agenda'} onClick={() => setViewMode('agenda')}><List size={17} /></button>
          </div>
        </div>
      </div>
      <div className="agenda-layout">
        <section className="card agenda-calendar" aria-label="Lançamentos do mês">
          {viewMode === 'grid' ? <>
            <div className="agenda-weekdays">{WEEKDAY_SHORT_NAMES_BR.map(day => <span key={day}>{day}</span>)}</div>
            <div className="agenda-days">
              {Array.from({ length: new Date(year, month - 1, 1).getDay() }, (_, i) => <span key={'empty-' + i} />)}
              {Array.from({ length: getDaysInMonth(year, month) }, (_, i) => {
                const day = i + 1;
                const date = currentYearMonth + '-' + padZero(day);
                const items = dailyTransactionsMap.get(date) || [];
                const net = items.reduce((sum, t) => sum + (t.type === 'income' ? t.amount : -t.amount), 0);
                const tone = items.length > 0 ? (net >= 0 ? 'positive' : 'negative') : '';
                return <button key={date} className={'agenda-day ' + tone + (date === selectedDate ? ' selected' : '')}
                  aria-pressed={date === selectedDate} aria-current={date === today ? 'date' : undefined}
                  aria-label={formatDateBR(date) + ', ' + items.length + ' lançamentos' + (items.length ? ', saldo ' + formatCurrency(net) : '')}
                  onClick={() => setSelectedDate(date)}>
                  <span>{day}</span>
                  {items.length > 0 && <small>{items.length} lanç.</small>}
                </button>;
              })}
            </div>
            <div className="agenda-legend"><span><i className="positive" />Mais entradas</span><span><i className="negative" />Mais despesas</span></div>
          </> : <div className="agenda-month-list">
            {dailyTransactionsMap.size === 0 && <div className="finance-empty"><CalendarIcon size={28} /><strong>Seu mês está livre</strong><p>Nenhum lançamento neste mês.</p></div>}
            {Array.from(dailyTransactionsMap.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([date, items]) =>
              <button key={date} className="agenda-list-day" aria-pressed={date === selectedDate} onClick={() => setSelectedDate(date)}>
                <strong>{formatDateBR(date)}</strong>
                {items.map(t => <span className="agenda-list-row" key={t.id}><span>{t.description}</span><b className={t.type === 'income' ? 'finance-income' : 'finance-expense'}>{t.type === 'income' ? '+' : '−'}{formatCurrency(t.amount)}</b></span>)}
              </button>)}
          </div>}
        </section>
        <section className="card agenda-detail">
          <div className="agenda-detail-heading"><div><span className="finance-eyebrow">{selectedDate === today ? 'HOJE' : 'DIA SELECIONADO'}</span><h2>{formatDateBR(selectedDate)}</h2></div>
            <button className="btn btn-primary btn-sm" onClick={() => onOpenCreateWithDate(selectedDate)}><Plus size={17} />Adicionar</button>
          </div>
          <div className="agenda-summary">
            <div><span>Entradas</span><strong className="finance-income">{formatCurrency(income)}</strong></div>
            <div><span>Saídas</span><strong className="finance-expense">{formatCurrency(expense)}</strong></div>
            <div><span>Resultado do dia</span><strong className={income >= expense ? 'finance-income' : 'finance-expense'}>{formatCurrency(income - expense)}</strong></div>
          </div>
          {selectedTransactions.length === 0 ? <div className="finance-empty"><CalendarIcon size={28} /><strong>Nada agendado por aqui</strong><p>Adicione uma entrada ou um pagamento para este dia.</p></div> :
            <div className="agenda-transactions">{selectedTransactions.map(t => <div className="agenda-transaction" key={t.id}>
              <div><strong>{t.description}</strong><small>{categoryMap.get(t.category_id)?.name || 'Geral'} · {t.status === 'completed' ? t.type === 'income' ? 'Recebida' : 'Paga' : 'Pendente'}</small></div>
              <b className={t.type === 'income' ? 'finance-income' : 'finance-expense'}>{t.type === 'income' ? '+' : '−'}{formatCurrency(t.amount)}</b>
              <button className="btn-icon" onClick={() => onOpenEdit(t)} aria-label={'Editar ' + t.description}><Edit2 size={16} /></button>
            </div>)}</div>}
        </section>
      </div>
    </div>
  );
};
