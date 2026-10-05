import React, { useState } from 'react';
import {
  Check,
  Copy,
  Database,
  Key,
  LogOut,
  Moon,
  ShieldCheck,
  Sun,
  User
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';

export const SettingsPage: React.FC = () => {
  const { user, isSupabaseOnline, logout, updatePassword, showToast } = useFinance();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPass, setIsChangingPass] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      showToast('A senha deve ter no mínimo 6 caracteres', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('As senhas não coincidem', 'error');
      return;
    }

    setIsChangingPass(true);
    try {
      await updatePassword(newPassword);
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      // toast já disparado
    } finally {
      setIsChangingPass(false);
    }
  };

  return (
    <div className="page-wrapper" style={{ maxWidth: 840 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
          Configurações & Perfil
        </h1>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: 2 }}>
          Gerencie sua conta, segurança, preferências e status de conexão.
        </p>
      </div>

      {/* Card de Perfil */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
          <div
            style={{
              width: 50,
              height: 50,
              borderRadius: 'var(--radius-md)',
              background: 'linear-gradient(135deg, #0284c7 0%, #10b981 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff'
            }}
          >
            <User size={26} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 700 }}>{user?.full_name || 'Usuário'}</h2>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{user?.email}</div>
          </div>
        </div>

        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: 16 }}>
          <button className="btn btn-outline btn-sm" onClick={logout} style={{ color: 'var(--expense-color)' }}>
            <LogOut size={16} />
            <span>Encerrar Sessão (Logout)</span>
          </button>
        </div>
      </div>

      {/* Alterar Senha */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <Key size={20} color="var(--primary-color)" />
          <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Segurança e Nova Senha</h3>
        </div>

        <form onSubmit={handlePasswordChange} style={{ maxWidth: 440 }}>
          <div className="form-group">
            <label className="form-label">Nova Senha</label>
            <input
              type="password"
              className="form-input"
              placeholder="Mínimo 6 caracteres"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Confirmar Nova Senha</label>
            <input
              type="password"
              className="form-input"
              placeholder="Digite novamente a nova senha"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn btn-primary btn-sm" disabled={isChangingPass}>
            {isChangingPass ? 'Atualizando...' : 'Atualizar Senha'}
          </button>
        </form>
      </div>

      {/* Status da Conexão Supabase */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <Database size={20} color="var(--primary-color)" />
          <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Integração Supabase & Segurança</h3>
        </div>

        <div
          style={{
            padding: '14px 18px',
            borderRadius: 'var(--radius-md)',
            background: isSupabaseOnline ? 'var(--income-light)' : 'var(--bg-card-hover)',
            border: `1px solid ${isSupabaseOnline ? 'rgba(16, 185, 129, 0.3)' : 'var(--border-color)'}`,
            marginBottom: 16
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <ShieldCheck size={18} color={isSupabaseOnline ? 'var(--income-color)' : 'var(--text-muted)'} />
            <span style={{ fontWeight: 700, color: isSupabaseOnline ? 'var(--income-color)' : 'var(--text-main)' }}>
              {isSupabaseOnline ? 'Supabase Conectado Ativamente' : 'Modo de Armazenamento Local Seguro'}
            </span>
          </div>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
            {isSupabaseOnline
              ? 'Seus dados estão sendo sincronizados diretamente com seu banco Supabase com proteção RLS de ponta a ponta.'
              : 'O aplicativo está operando com persistência em armazenamento local. Para conectar com sua nuvem Supabase, basta preencher as variáveis no arquivo .env conforme o .env.example e executar o script supabase_setup.sql.'}
          </p>
        </div>

        <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
          <strong>Regras de Segurança Aplicadas:</strong>
          <ul style={{ paddingLeft: 20, marginTop: 6 }}>
            <li>Chave pública ANON permitida exclusivamente para operações autenticadas do cliente.</li>
            <li>NUNCA exponha a Service Role Key (SUPABASE_SECRET) no frontend.</li>
            <li>RLS (Row Level Security) ativado em todas as tabelas: cada usuário acessa somente os seus próprios dados.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
