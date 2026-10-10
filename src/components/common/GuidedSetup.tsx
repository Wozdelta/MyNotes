import React, { useEffect, useRef, useState } from 'react';
import { Compass, X, Hand, ChevronDown } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useFinance } from '../../context/FinanceContext';
import { supabase } from '../../services/supabase';
import '../../styles/guided-setup.css';

const steps = [
  { title: 'Bem-vindo ao MyNotes!', text: 'Vamos organizar seu dinheiro juntos. Você vai criar uma conta e aprender a registrar entradas e despesas. Use dados reais: tudo que salvar ficará na sua conta.', tab: 'dashboard' },
  { title: 'Primeiro, sua conta financeira', text: 'Uma conta pode ser seu banco, carteira ou reserva. Toque em “Nova Conta” para começar.', tab: 'accounts', target: 'account-create' },
  { title: 'Cadastre sua primeira conta', text: 'Informe o nome, o saldo que já possui e a data desse saldo. As observações são opcionais. Salve para continuar; não registre esse saldo novamente como receita.', tab: 'accounts' },
  { title: 'Agora, uma entrada', text: 'No celular, toque no botão + e escolha “Nova entrada”. No computador, use “Entrada” no topo. Se ainda não criou uma conta, faça isso antes de salvar.', tab: 'dashboard', target: 'income-create' },
  { title: 'Preencha sua receita', text: 'Escolha conta e categoria, descrição, valor e data prevista. Use Pendente se ainda vai receber; se já recebeu, marque como concluída e confira a data efetiva. A categoria Salário tem opções de recebimento.', tab: 'dashboard' },
  { title: 'Vamos registrar uma despesa', text: 'Toque no + e escolha “Nova despesa”. No computador, use “Despesa” no topo. Pode ser uma compra, conta de luz ou pagamento.', tab: 'dashboard', target: 'expense-create' },
  { title: 'Preencha seu pagamento', text: 'Escolha a conta de saída, categoria, descrição, valor e vencimento. Deixe Pendente se ainda não pagou. Se já pagou, informe a situação e a data efetiva. Salve para continuar.', tab: 'dashboard' },
  { title: 'O que se repete todo mês?', text: 'Em Recorrências, configure salário, aluguel ou assinaturas: conta, categoria, valor, frequência e início. Evite cadastrar duas vezes a mesma operação. Você pode explorar e cadastrar depois.', tab: 'recurrences' },
  { title: 'Sua agenda financeira', text: 'Selecione um dia para conferir seus lançamentos. Alterne entre calendário e lista e escolha a data prevista ou efetiva. Hoje aparece em azul.', tab: 'calendar' },
  { title: 'Entenda seus resultados', text: 'As análises mostram entradas, saídas e gastos por categoria. Use o filtro de período e as abas para comparar os meses e as despesas recorrentes.', tab: 'analytics' },
  { title: 'Tudo pronto para começar', text: 'No Início está seu resumo. No Extrato, revise os lançamentos. No Menu, encontre contas, categorias, anotações e configurações. Para rever este guia, abra Configurações → Refazer tutorial guiado.', tab: 'dashboard' }
];

export const GuidedSetup: React.FC<{ onNavigate: (tab: string) => void; onCloseForms: () => void }> = ({ onNavigate, onCloseForms }) => {
  const { user, accounts, transactions, showToast } = useFinance();
  const [step, setStep] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [spot, setSpot] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [compact, setCompact] = useState(false);
  const [viewport, setViewport] = useState({ width: window.innerWidth, height: window.innerHeight });
  const [cardHeight, setCardHeight] = useState(230);
  const card = useRef<HTMLElement>(null);
  const baseline = useRef({ accounts: 0, income: 0, expense: 0 });
  const counts = { accounts: accounts.length, income: transactions.filter(t => t.type === 'income').length, expense: transactions.filter(t => t.type === 'expense').length };
  const countsRef = useRef(counts);
  countsRef.current = counts;
  const navigation = useRef({ onNavigate, onCloseForms });
  navigation.current = { onNavigate, onCloseForms };
  const key = `mynotes_setup_${user?.id}`;

  useEffect(() => {
    let alive = true;
    const start = () => { navigation.current.onCloseForms(); setStep(0); };
    window.addEventListener('mynotes:start-guide', start);
    const check = async () => {
      const local = localStorage.getItem(key);
      if (local === 'done' || local === 'skipped') return;
      if (supabase) {
        const { data, error } = await supabase.auth.getUser();
        if (!alive || error || data.user?.id !== user?.id) return;
        if (data.user?.user_metadata?.onboarding_status !== 'pending') return;
      } else if (local !== 'pending') return;
      if (alive) setStep(0);
    };
    void check();
    return () => { alive = false; window.removeEventListener('mynotes:start-guide', start); };
  }, [key, user?.id]);

  useEffect(() => {
    if (step === null) return;
    baseline.current = countsRef.current;
    setCompact(false);
    // Form steps remain in place while the user fills the real form.
    if (![2, 4, 6].includes(step)) navigation.current.onNavigate(steps[step].tab);
    const target = steps[step].target;
    let previous: HTMLElement | null = null;
    let frame = 0;
    const highlight = () => {
      const candidates = target ? [...document.querySelectorAll<HTMLElement>(`[data-guide="${target}"]`)] : [];
      const visible = candidates.find(el => el.getClientRects().length > 0);
      const form = [2, 4, 6].includes(step) ? document.querySelector<HTMLElement>('.modal-content') : null;
      const focused = document.activeElement instanceof HTMLElement && form?.contains(document.activeElement) ? document.activeElement.closest<HTMLElement>('.form-group') || document.activeElement : null;
      const overview = ({ 7: '.page-wrapper', 8: '.agenda-calendar', 9: '.analytics-overview', 10: '.dashboard-home' } as Record<number, string>)[step];
      const element = visible || ([3, 5].includes(step) ? document.querySelector<HTMLElement>('[data-guide="add"]') : null) || focused || form || (overview ? document.querySelector<HTMLElement>(overview) : null);
      if (previous !== element) {
        previous?.classList.remove('guide-highlight');
        if (element && target) {
          element.classList.add('guide-highlight');
          element.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'auto' });
        }
        previous = element;
      }
      const width = window.visualViewport?.width || window.innerWidth;
      const height = window.visualViewport?.height || window.innerHeight;
      setViewport(v => v.width === width && v.height === height ? v : { width, height });
      const rect = element?.getBoundingClientRect();
      const next = rect ? { x: Math.max(4, rect.left - 7), y: Math.max(4, rect.top - 7), width: Math.min(rect.width + 14, width - Math.max(4, rect.left - 7) - 4), height: Math.max(0, Math.min(rect.bottom + 7, height - 4) - Math.max(4, rect.top - 7)) } : null;
      setSpot(old => JSON.stringify(old) === JSON.stringify(next) ? old : next);
    };
    const schedule = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(highlight); };
    schedule();
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true });
    const clicked = (event: MouseEvent) => {
      const element = event.target instanceof Element ? event.target.closest('[data-guide]') : null;
      if (target && element?.getAttribute('data-guide') === target) setStep(current => current === step ? step + 1 : current);
    };
    document.addEventListener('click', clicked);
    const focus = () => { if ([2, 4, 6].includes(step) && document.activeElement?.closest('.modal-content')) setCompact(true); schedule(); };
    document.addEventListener('focusin', focus);
    window.addEventListener('resize', schedule);
    window.addEventListener('scroll', schedule, true);
    window.visualViewport?.addEventListener('resize', schedule);
    const resize = new ResizeObserver(schedule);
    resize.observe(document.body);
    return () => {
      observer.disconnect();
      document.removeEventListener('click', clicked);
      cancelAnimationFrame(frame);
      resize.disconnect();
      document.removeEventListener('focusin', focus);
      window.removeEventListener('resize', schedule);
      window.removeEventListener('scroll', schedule, true);
      window.visualViewport?.removeEventListener('resize', schedule);
      document.querySelectorAll('.guide-highlight').forEach(el => el.classList.remove('guide-highlight'));
    };
  }, [step]);

  useEffect(() => {
    if (!card.current) return;
    const observer = new ResizeObserver(([entry]) => setCardHeight(entry.target.getBoundingClientRect().height));
    observer.observe(card.current);
    return () => observer.disconnect();
  }, [step]);

  useEffect(() => {
    if ((step === 2 && counts.accounts > baseline.current.accounts) ||
        (step === 4 && counts.income > baseline.current.income) ||
        (step === 6 && counts.expense > baseline.current.expense)) setStep(step + 1);
  }, [step, counts.accounts, counts.income, counts.expense]);

  const finish = async (status: 'done' | 'skipped') => {
    setSaving(true);
    try {
    if (supabase) {
      const { error } = await supabase.auth.updateUser({ data: { onboarding_status: status } });
      if (error) throw error;
    }
    } catch {
      showToast('Não foi possível sincronizar o tutorial. Sua escolha será lembrada neste navegador.', 'info');
    }
    localStorage.setItem(key, status);
    navigation.current.onCloseForms();
    navigation.current.onNavigate('dashboard');
    setStep(null);
    setSaving(false);
  };
  if (step === null) return null;
  const below = spot ? viewport.height - (spot.y + spot.height) >= cardHeight + 24 : false;
  const top = spot ? Math.max(10, Math.min(viewport.height - cardHeight - 10, below ? spot.y + spot.height + 18 : spot.y - cardHeight - 18)) : Math.max(10, (viewport.height - cardHeight) / 2);
  const cardWidth = Math.min(380, viewport.width - 24);
  const left = spot ? Math.max(12, Math.min(viewport.width - cardWidth - 12, spot.x + spot.width / 2 - cardWidth / 2)) : (viewport.width - cardWidth) / 2;
  return createPortal(<>
    <svg className={`guide-spotlight ${compact ? 'is-editing' : ''}`} width="100%" height="100%" aria-hidden="true">
      <defs><mask id="guide-cutout"><rect width="100%" height="100%" fill="white" />{spot && <rect x={spot.x} y={spot.y} width={Math.max(0, spot.width)} height={spot.height} rx="16" fill="black" />}</mask></defs>
      <rect width="100%" height="100%" fill="#071426" fillOpacity={compact ? .25 : .7} mask="url(#guide-cutout)" />
      {spot && <rect className="guide-spotlight-ring" x={spot.x} y={spot.y} width={Math.max(0, spot.width)} height={spot.height} rx="16" fill="none" stroke="var(--primary-color)" strokeWidth="3" />}
    </svg>
    {spot && steps[step].target && <div className="guide-touch" style={{ left: Math.min(viewport.width - 38, spot.x + spot.width - 10), top: Math.max(0, spot.y + spot.height - 10) }} aria-hidden="true"><Hand size={27} /></div>}
    <aside ref={card} className={`guided-setup ${compact ? 'is-compact' : ''}`} style={{ top, left, width: cardWidth }} aria-label="Tutorial de primeiro acesso">
    {spot && !compact && steps[step].target && <span className={`guide-arrow ${below ? 'points-up' : 'points-down'}`} style={{ left: Math.max(18, Math.min(cardWidth - 28, spot.x + spot.width / 2 - left)) }} />}
    <div className="guided-setup-heading"><span><Compass size={16} /> PRIMEIROS PASSOS · {step + 1}/{steps.length}</span><button aria-label="Pular tutorial" disabled={saving} onClick={() => void finish('skipped')}><X size={18} /></button></div>
    <div className="guided-setup-progress"><span style={{ width: `${(step + 1) / steps.length * 100}%` }} /></div>
    <div aria-live="polite"><h2>{steps[step].title}</h2>{!compact && <p>{steps[step].text}</p>}</div>
    {compact && <button className="guide-expand" onClick={() => setCompact(false)}>Ver instruções <ChevronDown size={14} /></button>}
    <div className="guided-setup-actions"><button disabled={saving} onClick={() => void finish('skipped')}>Pular tutorial</button>
      <button className="btn btn-primary btn-sm" disabled={saving} onClick={() => {
        if (step === steps.length - 1) { void finish('done'); return; }
        navigation.current.onCloseForms();
        // Skipping a practice step never creates fake financial data.
        setStep(({ 1: 3, 2: 3, 3: 5, 4: 5, 5: 7, 6: 7 } as Record<number, number>)[step] ?? step + 1);
      }}>{step === 0 ? 'Vamos começar' : step === steps.length - 1 ? 'Concluir' : step <= 6 ? 'Fazer depois' : 'Próximo'}</button></div>
  </aside></>, document.body);
};
