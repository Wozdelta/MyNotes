import React, { useState } from 'react';
import {
  Key,
  Compass,
  ChevronRight,
  Eye,
  EyeOff,
  LogOut,
  User
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import '../styles/settings.css';

export const SettingsPage: React.FC = () => {
  const { user, logout, updatePassword, showToast } = useFinance();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPass, setIsChangingPass] = useState(false);
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) {
      showToast('Informe sua senha atual', 'error');
      return;
    }
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
      await updatePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setVisiblePasswords({});
    } catch (err: any) {
      // toast já disparado
    } finally {
      setIsChangingPass(false);
    }
  };

  return (
    <div className="page-wrapper settings-page" style={{ maxWidth: 840 }}>
      <div style={{ marginBottom: 24 }}>
        <span className="settings-eyebrow">DO SEU JEITO</span>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
          Minha conta
        </h1>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: 2 }}>
          Seu perfil, sua segurança e seus primeiros passos.
        </p>
      </div>

      {/* Card de Perfil */}
      <div className="card settings-profile">
        <div className="settings-profile-identity">
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
          <div className="settings-profile-text">
            <span className="settings-eyebrow">MEU PERFIL</span>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 700 }}>{user?.full_name || 'Usuário'}</h2>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{user?.email}</div>
          </div>
        </div>

      </div>

      <button className="settings-tutorial" onClick={() => window.dispatchEvent(new Event('mynotes:start-guide'))}>
        <span className="settings-section-icon"><Compass size={22} /></span>
        <span><strong>Precisa de uma mão?</strong><small>Refazer tutorial guiado</small></span>
        <ChevronRight size={19} />
      </button>

      {/* Alterar Senha */}
      <div className="card settings-security">
        <div className="settings-section-heading">
          <span className="settings-section-icon"><Key size={21} /></span>
          <div><h3>Alterar senha</h3><p>Confirme sua senha atual para criar uma nova.</p></div>
        </div>

        <form onSubmit={handlePasswordChange}>
          <div className="form-group">
            <label className="form-label" htmlFor="settings-current-password">Senha atual</label>
            <div className="settings-password-field">
            <input
              id="settings-current-password"
              type={visiblePasswords.current ? 'text' : 'password'}
              className="form-input"
              placeholder="Digite sua senha atual"
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
            <button type="button" aria-label={visiblePasswords.current ? 'Ocultar senha atual' : 'Mostrar senha atual'} aria-pressed={!!visiblePasswords.current} onClick={() => setVisiblePasswords(v => ({ ...v, current: !v.current }))}>{visiblePasswords.current ? <EyeOff size={18} /> : <Eye size={18} />}</button>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="settings-new-password">Nova senha</label>
            <div className="settings-password-field">
            <input
              id="settings-new-password"
              type={visiblePasswords.new ? 'text' : 'password'}
              className="form-input"
              placeholder="Mínimo 6 caracteres"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              autoComplete="new-password"
              minLength={6}
              required
            />
            <button type="button" aria-label={visiblePasswords.new ? 'Ocultar nova senha' : 'Mostrar nova senha'} aria-pressed={!!visiblePasswords.new} onClick={() => setVisiblePasswords(v => ({ ...v, new: !v.new }))}>{visiblePasswords.new ? <EyeOff size={18} /> : <Eye size={18} />}</button>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="settings-confirm-password">Confirme a nova senha</label>
            <div className="settings-password-field">
            <input
              id="settings-confirm-password"
              type={visiblePasswords.confirm ? 'text' : 'password'}
              className="form-input"
              placeholder="Digite novamente a nova senha"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              required
            />
            <button type="button" aria-label={visiblePasswords.confirm ? 'Ocultar confirmação da senha' : 'Mostrar confirmação da senha'} aria-pressed={!!visiblePasswords.confirm} onClick={() => setVisiblePasswords(v => ({ ...v, confirm: !v.confirm }))}>{visiblePasswords.confirm ? <EyeOff size={18} /> : <Eye size={18} />}</button>
            </div>
          </div>

          <button type="submit" className="btn btn-primary settings-save" disabled={isChangingPass}>
            <Key size={16} />
            {isChangingPass ? 'Atualizando...' : 'Atualizar Senha'}
          </button>
        </form>
      </div>

      <button className="settings-signout" onClick={logout} disabled={isChangingPass}>
        <LogOut size={18} /><span>Sair da conta</span><ChevronRight size={17} />
      </button>

    </div>
  );
};
