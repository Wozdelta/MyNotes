import React, { useMemo, useState } from 'react';
import {
  Calendar as CalendarIcon,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Edit2,
  List,
  Plus,
  RotateCcw
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { Transaction, TransactionType } from '../types';
import {
  addMonths,
  formatDateBR,
  formatMonthYearBR,
  getDaysInMonth,
  MONTH_NAMES_BR,
  padZero,
  todayString,
  WEEKDAY_SHORT_NAMES_BR
} from '../utils/date';
import { formatCurrency, isOverdue } from '../utils/finance';

interface CalendarPageProps {
  onOpenCreateWithDate: (date: string, type?: TransactionType) => void;
  onOpenEdit: (transaction: Transaction) => void;
}

export const CalendarPage: React.FC<CalendarPageProps> = ({
  onOpenCreateWithDate,
  onOpenEdit
}) => {
  const { transactions, categories, accounts, completeTransaction, undoCompleteTransaction } = useFinance();
  const today = todayString();

  // Mês e Ano exibidos no calendário
  const [currentYearMonth, setCurrentYearMonth] = useState(() => {
    const parts = today.split('-');
    return `${parts[0]}-${parts[1]}`;
  });

  const [selectedDate, setSelectedDate] = useState<string>(today);
  const [viewMode, setViewMode] = useState<'grid' | 'agenda'>('grid');
  const [calendarDateBase, setCalendarDateBase] = useState<'expected' | 'effective'>('expected');

  // Filtros rápidos do calendário
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const [yearStr, monthStr] = currentYearMonth.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const daysInMonth = getDaysInMonth(year, month);

  // Primeiro dia da semana no mês (0 = Domingo, 1 = Segunda, etc.)
  const firstDayOfWeek = new Date(year, month - 1, 1).getDay();

  // Navegação
  const handlePrevMonth = () => {
    setCurrentYearMonth(prev => addMonths(`${prev}-01`, -1).substring(0, 7));
  };

  const handleNextMonth = () => {
    setCurrentYearMonth(prev => addMonths(`${prev}-01`, 1).substring(0, 7));
  };

  const handleGoToday = () => {
    const parts = today.split('-');
    setCurrentYearMonth(`${parts[0]}-${parts[1]}`);
    setSelectedDate(today);
  };

  // Mapeamentos
  const categoryMap = new Map(categories.map(c => [c.id, c]));
  const accountMap = new Map(accounts.map(a => [a.id, a.name]));

  // Agrupamento de lançamentos por dia no mês atual
  const dailyTransactionsMap = useMemo(() => {
    const map = new Map<string, Transaction[]>();

    for (const t of transactions) {
      if (t.status === 'cancelled') continue;
      if (filterType !== 'all' && t.type !== filterType) continue;
      if (filterStatus === 'pending' && t.status !== 'pending') continue;
      if (filterStatus === 'completed' && t.status !== 'completed') continue;

      const dateToUse = calendarDateBase === 'effective' && t.effective_date ? t.effective_date : t.expected_date;
      if (!dateToUse.startsWith(currentYearMonth)) continue;

      const list = map.get(dateToUse) || [];
      list.push(t);
      map.set(dateToUse, list);
    }

    return map;
  }, [transactions, currentYearMonth, calendarDateBase, filterType, filterStatus]);

  // Lançamentos do dia selecionado
  const selectedDayTransactions = dailyTransactionsMap.get(selectedDate) || [];

  // Totais do dia selecionado
  const selectedDaySummary = useMemo(() => {
    let income = 0;
    let expense = 0;
    for (const t of selectedDayTransactions) {
      if (t.type === 'income') income += t.amount;
      else expense += t.amount;
    }
    return {
      income,
      expense,
      result: income - expense
    };
  }, [selectedDayTransactions]);

  // Lista de dias no formato de grade com união discriminada estrita
  type CalendarCell =
    | { empty: true; key: string }
    | { empty: false; day: number; dateStr: string; key: string };

  const calendarCells: CalendarCell[] = [];
  for (let i = 0; i < firstDayOfWeek; i++) {
    calendarCells.push({ empty: true, key: `empty-${i}` });
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${yearStr}-${monthStr}-${padZero(day)}`;
    calendarCells.push({
      empty: false,
      day,
      dateStr,
      key: dateStr
    });
  }

  return (
    <div className="page-wrapper">
      {/* Topo do Calendário */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          marginBottom: 20
        }}
      >
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
            Calendário Financeiro
          </h1>
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
            <span>Visualizando base:</span>
            <button
              onClick={() => setCalendarDateBase(calendarDateBase === 'expected' ? 'effective' : 'expected')}
              className="badge"
              style={{
                cursor: 'pointer',
                background: 'var(--bg-card-hover)',
                color: 'var(--primary-color)',
                border: '1px solid var(--border-color)',
                fontWeight: 700
              }}
            >
              {calendarDateBase === 'expected' ? 'Data Prevista (Agendados)' : 'Data Efetiva (Realizados)'} ⇄
            </button>
          </div>
        </div>

        {/* Controles de Navegação */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button className="btn btn-outline btn-sm" onClick={handlePrevMonth} aria-label="Mês anterior">
            <ChevronLeft size={16} />
          </button>
          <span style={{ fontWeight: 700, minWidth: 140, textAlign: 'center', fontSize: '0.9375rem' }}>
            {MONTH_NAMES_BR[month - 1]} de {year}
          </span>
          <button className="btn btn-outline btn-sm" onClick={handleNextMonth} aria-label="Próximo mês">
            <ChevronRight size={16} />
          </button>
          <button className="btn btn-outline btn-sm" onClick={handleGoToday}>
            Hoje
          </button>

          {/* Alternar Grid vs Agenda */}
          <div style={{ display: 'flex', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
            <button
              className="btn-icon"
              style={{
                width: 34,
                height: 34,
                borderRadius: 0,
                background: viewMode === 'grid' ? 'var(--primary-light)' : 'transparent',
                color: viewMode === 'grid' ? 'var(--primary-color)' : 'var(--text-muted)'
              }}
              onClick={() => setViewMode('grid')}
              title="Visualização em Grade"
            >
              <CalendarIcon size={16} />
            </button>
            <button
              className="btn-icon"
              style={{
                width: 34,
                height: 34,
                borderRadius: 0,
                background: viewMode === 'agenda' ? 'var(--primary-light)' : 'transparent',
                color: viewMode === 'agenda' ? 'var(--primary-color)' : 'var(--text-muted)'
              }}
              onClick={() => setViewMode('agenda')}
              title="Visualização em Lista / Agenda"
            >
              <List size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Layout Split: Calendário à esquerda / Detalhes do Dia à direita */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: viewMode === 'grid' ? 'repeat(auto-fit, minmax(320px, 1fr))' : '1fr',
          gap: 20
        }}
      >
        {/* Visão Grade */}
        {viewMode === 'grid' && (
          <div className="card" style={{ padding: 16 }}>
            {/* Dias da Semana */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(7, 1fr)',
                textAlign: 'center',
                fontWeight: 700,
                fontSize: '0.75rem',
                color: 'var(--text-muted)',
                marginBottom: 8,
                paddingBottom: 8,
                borderBottom: '1px solid var(--border-color)'
              }}
            >
              {WEEKDAY_SHORT_NAMES_BR.map((wd, i) => (
                <div key={i}>{wd}</div>
              ))}
            </div>

            {/* Grade de Células */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
              {calendarCells.map(cell => {
                if (cell.empty) {
                  return (
                    <div
                      key={cell.key}
                      style={{
                        minHeight: 64,
                        background: 'transparent',
                        borderRadius: 'var(--radius-sm)'
                      }}
                    />
                  );
                }

                const dayTxs = dailyTransactionsMap.get(cell.dateStr) || [];
                const isSelected = cell.dateStr === selectedDate;
                const isToday = cell.dateStr === today;

                let dayIncome = 0;
                let dayExpense = 0;
                for (const t of dayTxs) {
                  if (t.type === 'income') dayIncome += t.amount;
                  else dayExpense += t.amount;
                }

                return (
                  <button
                    key={cell.key}
                    onClick={() => setSelectedDate(cell.dateStr)}
                    style={{
                      minHeight: 68,
                      padding: 6,
                      background: isSelected
                        ? 'var(--primary-light)'
                        : isToday
                        ? 'var(--bg-card-hover)'
                        : 'var(--bg-card)',
                      border: isSelected
                        ? '2px solid var(--primary-color)'
                        : isToday
                        ? '1px solid var(--primary-color)'
                        : '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-sm)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-start',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div
                      style={{
                        fontSize: '0.8125rem',
                        fontWeight: isSelected || isToday ? 800 : 500,
                        color: isSelected
                          ? 'var(--primary-color)'
                          : isToday
                          ? 'var(--primary-color)'
                          : 'var(--text-main)',
                        marginBottom: 4
                      }}
                    >
                      {cell.day}
                    </div>

                    {/* Indicadores resumidos */}
                    {dayTxs.length > 0 && (
                      <div style={{ width: '100%', fontSize: '0.6875rem', lineHeight: 1.2 }}>
                        {dayIncome > 0 && (
                          <div style={{ color: 'var(--income-color)', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden' }}>
                            +{formatCurrency(dayIncome)}
                          </div>
                        )}
                        {dayExpense > 0 && (
                          <div style={{ color: 'var(--expense-color)', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden' }}>
                            -{formatCurrency(dayExpense)}
                          </div>
                        )}
                        {dayTxs.length > 2 && (
                          <div style={{ color: 'var(--text-subtle)', fontSize: '0.625rem', marginTop: 2 }}>
                            {dayTxs.length} lançamentos
                          </div>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Visão de Agenda (Lista de dias com transações) */}
        {viewMode === 'agenda' && (
          <div className="card" style={{ padding: 16 }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 12 }}>
              Agenda de Lançamentos ({MONTH_NAMES_BR[month - 1]} de {year})
            </h3>
            {Array.from(dailyTransactionsMap.entries())
              .sort(([dA], [dB]) => dA.localeCompare(dB))
              .map(([dStr, txs]) => (
                <div
                  key={dStr}
                  style={{
                    padding: '12px 14px',
                    borderBottom: '1px solid var(--border-color)',
                    background: dStr === selectedDate ? 'var(--primary-light)' : 'transparent',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer'
                  }}
                  onClick={() => setSelectedDate(dStr)}
                >
                  <div style={{ fontWeight: 700, fontSize: '0.875rem', marginBottom: 6, color: 'var(--text-main)' }}>
                    {formatDateBR(dStr)}
                  </div>
                  {txs.map(t => (
                    <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', margin: '4px 0' }}>
                      <span>{t.description}</span>
                      <span style={{ fontWeight: 700, color: t.type === 'income' ? 'var(--income-color)' : 'var(--expense-color)' }}>
                        {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              ))}
          </div>
        )}

        {/* Painel de Detalhes do Dia Selecionado */}
        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>DIA SELECIONADO</div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>{formatDateBR(selectedDate)}</h2>
            </div>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => onOpenCreateWithDate(selectedDate)}
            >
              <Plus size={16} />
              <span>Adicionar</span>
            </button>
          </div>

          {/* Resumo do Dia */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              gap: 8,
              padding: '10px 14px',
              background: 'var(--bg-card-hover)',
              borderRadius: 'var(--radius-md)',
              marginBottom: 16,
              textAlign: 'center'
            }}
          >
            <div>
              <div style={{ fontSize: '0.6875rem', color: 'var(--income-color)', fontWeight: 700 }}>ENTRADAS</div>
              <div style={{ fontWeight: 800, fontSize: '0.875rem' }}>+{formatCurrency(selectedDaySummary.income)}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.6875rem', color: 'var(--expense-color)', fontWeight: 700 }}>DESPESAS</div>
              <div style={{ fontWeight: 800, fontSize: '0.875rem' }}>-{formatCurrency(selectedDaySummary.expense)}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', fontWeight: 700 }}>SALDO DIA</div>
              <div
                style={{
                  fontWeight: 800,
                  fontSize: '0.875rem',
                  color: selectedDaySummary.result >= 0 ? 'var(--income-color)' : 'var(--expense-color)'
                }}
              >
                {selectedDaySummary.result > 0 ? '+' : ''}{formatCurrency(selectedDaySummary.result)}
              </div>
            </div>
          </div>

          {/* Lista de Lançamentos do Dia */}
          {selectedDayTransactions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '36px 0', color: 'var(--text-muted)' }}>
              Nenhum lançamento previsto ou realizado neste dia.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {selectedDayTransactions.map(t => {
                const cat = categoryMap.get(t.category_id);
                const isIncome = t.type === 'income';
                return (
                  <div
                    key={t.id}
                    style={{
                      padding: '10px 14px',
                      background: 'var(--bg-card-hover)',
                      borderRadius: 'var(--radius-md)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 10
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{t.description}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {cat?.name || 'Geral'} • {t.status === 'completed' ? (isIncome ? 'Recebida' : 'Paga') : 'Pendente'}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div
                        style={{
                          fontWeight: 800,
                          fontSize: '0.9375rem',
                          color: isIncome ? 'var(--income-color)' : 'var(--expense-color)'
                        }}
                      >
                        {isIncome ? '+' : '-'}{formatCurrency(t.amount)}
                      </div>
                      <button
                        className="btn-icon"
                        style={{ width: 30, height: 30 }}
                        onClick={() => onOpenEdit(t)}
                        title="Editar lançamento"
                      >
                        <Edit2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
