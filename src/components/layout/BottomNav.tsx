import React, { useState } from 'react';
import {
  ArrowLeftRight,
  BarChart3,
  Calendar,
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

  const moreItems = [
    { id: 'recurrences', label: 'Recorrências', icon: Repeat },
    { id: 'notes', label: 'Anotações & Possibilidades', icon: FileText },
    { id: 'analytics', label: 'Análises Gráficas', icon: BarChart3 },
    { id: 'accounts', label: 'Contas Financeiras', icon: Wallet },
    { id: 'categories', label: 'Categorias', icon: FolderTree },
    { id: 'settings', label: 'Configurações & Perfil', icon: Settings }
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
      <Modal isOpen={showAddMenu} onClose={() => setShowAddMenu(false)} title="Nova Operação" maxWidth="360px">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <button
            className="btn btn-income"
            style={{ width: '100%', justifyContent: 'flex-start', padding: '14px 18px' }}
            onClick={() => {
              setShowAddMenu(false);
              onOpenNewTransaction('income');
            }}
          >
            <TrendingUp size={20} />
            <span style={{ fontSize: '1rem' }}>Nova Entrada (Receita)</span>
          </button>

          <button
            className="btn btn-expense"
            style={{ width: '100%', justifyContent: 'flex-start', padding: '14px 18px' }}
            onClick={() => {
              setShowAddMenu(false);
              onOpenNewTransaction('expense');
            }}
          >
            <TrendingDown size={20} />
            <span style={{ fontSize: '1rem' }}>Nova Despesa (Gasto)</span>
          </button>

          <button
            className="btn btn-outline"
            style={{ width: '100%', justifyContent: 'flex-start', padding: '14px 18px' }}
            onClick={() => {
              setShowAddMenu(false);
              onOpenTransfer();
            }}
          >
            <ArrowLeftRight size={20} color="var(--primary-color)" />
            <span style={{ fontSize: '1rem' }}>Transferência entre Contas</span>
          </button>
        </div>
      </Modal>

      {/* Modal de Menu Completo Mobile */}
      <Modal isOpen={showMoreMenu} onClose={() => setShowMoreMenu(false)} title="Todos os Módulos" maxWidth="380px">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {moreItems.map(item => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onSelectTab(item.id);
                  setShowMoreMenu(false);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  padding: '12px 16px',
                  borderRadius: 'var(--radius-md)',
                  background: isActive ? 'var(--primary-light)' : 'var(--bg-card-hover)',
                  color: isActive ? 'var(--primary-color)' : 'var(--text-main)',
                  fontWeight: isActive ? 700 : 500,
                  fontSize: '0.9375rem',
                  width: '100%',
                  textAlign: 'left'
                }}
              >
                <Icon size={20} color={isActive ? 'var(--primary-color)' : 'var(--text-muted)'} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </Modal>
    </>
  );
};
