import React, { useEffect, useState } from 'react';
import {
  ArrowLeftRight,
  BarChart3,
  Calendar,
  ChevronRight,
  CreditCard,
  FileText,
  FolderTree,
  LayoutDashboard,
  Menu,
  Plus,
  Repeat,
  Settings,
  TrendingDown,
  TrendingUp,
  Wallet,
  X
} from 'lucide-react';
import { Modal } from '../common/Modal';
import '../../styles/quick-actions.css';

interface BottomNavProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  onOpenNewTransaction: (type: 'income' | 'expense') => void;
  onOpenTransfer: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentTab,
  onSelectTab,
  onOpenNewTransaction,
  onOpenTransfer
}) => {
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  useEffect(() => {
    const close = () => { setShowAddMenu(false); setShowMoreMenu(false); };
    window.addEventListener('mynotes:close-guide-forms', close);
    return () => window.removeEventListener('mynotes:close-guide-forms', close);
  }, []);

  const moreItems = [
    { id: 'recurrences', label: 'Recorrências', description: 'Entradas e contas fixas', icon: Repeat, color: '#8b5cf6' },
    { id: 'notes', label: 'Anotações', description: 'Ideias e possibilidades', icon: FileText, color: '#d97706' },
    { id: 'analytics', label: 'Análises', description: 'Entenda seus resultados', icon: BarChart3, color: '#0284c7' },
    { id: 'accounts', label: 'Minhas contas', description: 'Saldos e carteiras', icon: Wallet, color: '#059669' },
    { id: 'categories', label: 'Categorias', description: 'Organize os lançamentos', icon: FolderTree, color: '#db2777' },
    { id: 'settings', label: 'Configurações', description: 'Perfil e preferências', icon: Settings, color: '#64748b' }
  ];

  return (
    <>
      <nav className="bottom-nav">
        {/* Visão Geral */}
        <button
          onClick={() => onSelectTab('dashboard')}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 4,
            padding: '6px 8px',
            color: currentTab === 'dashboard' ? 'var(--primary-color)' : 'var(--text-muted)',
            fontSize: '0.6875rem',
            fontWeight: currentTab === 'dashboard' ? 700 : 500
          }}
        >
          <LayoutDashboard size={20} />
          <span>Início</span>
        </button>

        {/* Lançamentos */}
        <button
          onClick={() => onSelectTab('transactions')}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 4,
            padding: '6px 8px',
            color: currentTab === 'transactions' ? 'var(--primary-color)' : 'var(--text-muted)',
            fontSize: '0.6875rem',
            fontWeight: currentTab === 'transactions' ? 700 : 500
          }}
        >
          <CreditCard size={20} />
          <span>Extrato</span>
        </button>

        {/* Botão Central de Adicionar (FAB) */}
        <button
          onClick={() => setShowAddMenu(true)}
          style={{
            width: 48,
            height: 48,
            borderRadius: 'var(--radius-full)',
            background: 'linear-gradient(135deg, #0284c7 0%, #10b981 100%)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(2, 132, 199, 0.4)',
            transform: 'translateY(-12px)'
          }}
          aria-label="Adicionar novo registro"
          data-guide="add"
        >
          <Plus size={24} />
        </button>

        {/* Calendário */}
        <button
          onClick={() => onSelectTab('calendar')}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 4,
            padding: '6px 8px',
            color: currentTab === 'calendar' ? 'var(--primary-color)' : 'var(--text-muted)',
            fontSize: '0.6875rem',
            fontWeight: currentTab === 'calendar' ? 700 : 500
          }}
        >
          <Calendar size={20} />
          <span>Agenda</span>
        </button>

        {/* Menu Mais */}
        <button
          onClick={() => setShowMoreMenu(true)}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 4,
            padding: '6px 8px',
            color: ['recurrences', 'notes', 'analytics', 'accounts', 'categories', 'settings'].includes(currentTab)
              ? 'var(--primary-color)'
              : 'var(--text-muted)',
            fontSize: '0.6875rem',
            fontWeight: ['recurrences', 'notes', 'analytics', 'accounts', 'categories', 'settings'].includes(currentTab)
              ? 700
              : 500
          }}
        >
          <Menu size={20} />
          <span>Menu</span>
        </button>
      </nav>

      {/* Modal de Ação Rápida Mobile */}
      <Modal isOpen={showAddMenu} onClose={() => setShowAddMenu(false)} title="O que vamos registrar?" maxWidth="480px" variant="action-sheet">
        <p className="quick-actions-intro">Escolha uma opção para cuidar do seu dinheiro.</p>
        <div className="quick-actions">
          <button
            className="quick-action quick-action-income"
            data-guide="income-create"
            onClick={() => {
              setShowAddMenu(false);
              onOpenNewTransaction('income');
            }}
          >
            <span className="quick-action-icon"><TrendingUp size={24} /></span>
            <span className="quick-action-copy"><strong>Nova entrada</strong><span>Salário, renda extra e recebimentos</span></span>
            <ChevronRight className="quick-action-chevron" size={18} />
          </button>

          <button
            className="quick-action quick-action-expense"
            data-guide="expense-create"
            onClick={() => {
              setShowAddMenu(false);
              onOpenNewTransaction('expense');
            }}
          >
            <span className="quick-action-icon"><TrendingDown size={24} /></span>
            <span className="quick-action-copy"><strong>Nova despesa</strong><span>Compras, contas e pagamentos</span></span>
            <ChevronRight className="quick-action-chevron" size={18} />
          </button>

          <button
            className="quick-action quick-action-transfer"
            onClick={() => {
              setShowAddMenu(false);
              onOpenTransfer();
            }}
          >
            <span className="quick-action-icon"><ArrowLeftRight size={23} /></span>
            <span className="quick-action-copy"><strong>Transferir dinheiro</strong><span>Movimente entre suas contas</span></span>
            <ChevronRight className="quick-action-chevron" size={18} />
          </button>
        </div>
        <button className="quick-actions-cancel" onClick={() => setShowAddMenu(false)}>Agora não</button>
      </Modal>

      {/* Modal de Menu Completo Mobile */}
      <Modal isOpen={showMoreMenu} onClose={() => setShowMoreMenu(false)} title="Seu espaço financeiro" maxWidth="480px" variant="action-sheet">
        <p className="quick-actions-intro">Tudo para organizar sua vida financeira.</p>
        <nav className="module-menu" aria-label="Módulos do aplicativo">
          {moreItems.map(item => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                className="module-menu-item"
                aria-current={isActive ? 'page' : undefined}
                onClick={() => {
                  onSelectTab(item.id);
                  setShowMoreMenu(false);
                }}
                style={{ '--module-color': item.color } as React.CSSProperties}
              >
                <span className="module-menu-icon"><Icon size={22} /></span>
                {isActive && <span className="module-menu-current">Atual</span>}
                <strong>{item.label}</strong>
                <span className="module-menu-description">{item.description}</span>
              </button>
            );
          })}
        </nav>
        <button className="quick-actions-cancel" onClick={() => setShowMoreMenu(false)}>Fechar menu</button>
      </Modal>
    </>
  );
};
