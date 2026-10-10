import React from 'react';
import {
  ArrowLeftRight,
  BarChart3,
  Calendar,
  CreditCard,
  FileText,
  FolderTree,
  LayoutDashboard,
  LogOut,
  Repeat,
  Settings,
  Wallet
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import brandIcon from '../../../Ícone Teal com N Branco e Detalhe Verde.png';

interface SidebarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  onOpenTransfer: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  onOpenTransfer
}) => {
  const { user, logout } = useFinance();

  const menuItems = [
    { id: 'dashboard', label: 'Visão Geral', icon: LayoutDashboard },
    { id: 'transactions', label: 'Lançamentos', icon: CreditCard },
    { id: 'calendar', label: 'Calendário', icon: Calendar },
    { id: 'recurrences', label: 'Recorrências', icon: Repeat },
    { id: 'notes', label: 'Anotações', icon: FileText },
    { id: 'analytics', label: 'Análises', icon: BarChart3 },
    { id: 'accounts', label: 'Contas', icon: Wallet },
    { id: 'categories', label: 'Categorias', icon: FolderTree },
    { id: 'settings', label: 'Configurações', icon: Settings }
  ];

  return (
    <aside className="app-sidebar">
      {/* Brand / Logo */}
      <div
        style={{
          padding: '20px 24px',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          gap: 12
        }}
      >
        <img
          src={brandIcon}
          alt=""
          width={44}
          height={44}
          style={{
            display: 'block',
            objectFit: 'contain',
            flexShrink: 0,
            filter: 'drop-shadow(0 3px 6px rgba(2, 132, 199, 0.18))'
          }}
        />
        <div>
          <div style={{ fontWeight: 800, fontSize: '1.0625rem', letterSpacing: '-0.02em' }}>
            MyNotes
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Gestão Financeira
          </div>
        </div>
      </div>

      {/* Menu Principal */}
      <div style={{ flex: 1, padding: '16px 12px', overflowY: 'auto' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {menuItems.map(item => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                className={`tour-step-${item.id}`}
                onClick={() => onSelectTab(item.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.875rem',
                  fontWeight: isActive ? 700 : 500,
                  color: isActive ? 'var(--primary-color)' : 'var(--text-main)',
                  background: isActive ? 'var(--primary-light)' : 'transparent',
                  textAlign: 'left',
                  width: '100%',
                  transition: 'all 0.15s ease'
                }}
              >
                <Icon size={18} color={isActive ? 'var(--primary-color)' : 'var(--text-muted)'} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Botão de Transferência Rápida */}
        <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border-color)' }}>
          <button
            className="btn btn-outline"
            style={{ width: '100%', justifyContent: 'flex-start', fontSize: '0.8125rem' }}
            onClick={onOpenTransfer}
          >
            <ArrowLeftRight size={16} color="var(--primary-color)" />
            <span>Transferir entre Contas</span>
          </button>
        </div>
      </div>

      {/* Rodapé / Usuário & Logout */}
      <div
        style={{
          padding: '16px 20px',
          borderTop: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'var(--bg-card)'
        }}
      >
        <div style={{ minWidth: 0, flex: 1, marginRight: 8 }}>
          <div
            style={{
              fontSize: '0.8125rem',
              fontWeight: 600,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}
          >
            {user?.full_name || 'Usuário'}
          </div>
          <div
            style={{
              fontSize: '0.75rem',
              color: 'var(--text-muted)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}
          >
            {user?.email}
          </div>
        </div>
        <button
          className="btn-icon"
          onClick={logout}
          title="Sair da conta"
          aria-label="Sair"
          style={{ width: 34, height: 34 }}
        >
          <LogOut size={16} />
        </button>
      </div>
    </aside>
  );
};
