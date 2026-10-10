import React, { useState } from 'react';
import { KeyRound, Lock, Mail, Shield, User } from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import brandIcon from '../../Ícone Teal com N Branco e Detalhe Verde.png';

interface AuthPageProps {
  initialMode?: 'login' | 'signup' | 'forgot' | 'reset';
}

export const AuthPage: React.FC<AuthPageProps> = ({ initialMode = 'login' }) => {
  const { login, signup, resetPassword, verifyRecoveryCode, completePasswordReset, logout, isSubmitting } = useFinance();

  const [mode, setMode] = useState<'login' | 'signup' | 'forgot' | 'reset'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [code, setCode] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (mode === 'signup' && password !== confirmPassword) {
      setErrorMsg('As senhas digitadas não coincidem.');
      return;
    }
    if (mode === 'reset' && password !== confirmPassword) {
      setErrorMsg('As senhas digitadas não coincidem.');
      return;
    }

    try {
      if (mode === 'login') {
        await login(email, password);
      } else if (mode === 'signup') {
        await signup(email, password, fullName);
      } else if (mode === 'forgot') {
        if (codeSent) {
          await verifyRecoveryCode(email, code);
          return;
        }
        await resetPassword(email);
        setCodeSent(true);
        setSuccessMsg('Se este e-mail estiver cadastrado, você receberá as instruções. Digite o código recebido ou abra o link do e-mail. Confira também o spam.');
      } else if (mode === 'reset') {
        await completePasswordReset(password);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao processar solicitação');
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        background: 'var(--bg-app)'
      }}
    >
      <div
        className="card"
        style={{
          maxWidth: 420,
          width: '100%',
          padding: '32px 28px',
          boxShadow: 'var(--shadow-lg)'
        }}
      >
        {/* Brand */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <img
            src={brandIcon}
            alt=""
            width={72}
            height={72}
            style={{
              display: 'block',
              objectFit: 'contain',
              margin: '0 auto 12px auto',
              filter: 'drop-shadow(0 4px 8px rgba(2, 132, 199, 0.18))'
            }}
          />
          <h1 style={{ fontSize: '1.375rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
            MyNotes
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: 4 }}>
            {mode === 'login' && 'Acesse sua conta para gerenciar suas finanças'}
            {mode === 'signup' && 'Crie sua conta pessoal gratuita e segura'}
            {mode === 'forgot' && 'Recuperação de acesso à sua conta'}
            {mode === 'reset' && 'Defina sua nova senha de acesso'}
          </p>
        </div>

        {/* Mensagens de Sucesso e Erro */}
        {errorMsg && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--expense-light)',
              color: 'var(--expense-color)',
              fontSize: '0.875rem',
              marginBottom: 16
            }}
          >
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--income-light)',
              color: 'var(--income-color)',
              fontSize: '0.875rem',
              marginBottom: 16
            }}
          >
            {successMsg}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {mode === 'signup' && (
            <div className="form-group">
              <label className="form-label">Nome Completo</label>
              <div style={{ position: 'relative' }}>
                <User
                  size={18}
                  style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-subtle)' }}
                />
                <input
                  type="text"
                  className="form-input"
                  style={{ paddingLeft: 38 }}
                  placeholder="Seu nome"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  required
                />
              </div>
            </div>
          )}

          {mode !== 'reset' && (
            <div className="form-group">
              <label className="form-label">E-mail</label>
              <div style={{ position: 'relative' }}>
                <Mail
                  size={18}
                  style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-subtle)' }}
                />
                <input
                  type="email"
                  className="form-input"
                  style={{ paddingLeft: 38 }}
                  placeholder="seu@email.com"
                  value={email}
                  readOnly={mode === 'forgot' && codeSent}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>
          )}

          {mode === 'forgot' && codeSent && (
            <div className="form-group">
              <label className="form-label" htmlFor="recovery-code">Código do e-mail</label>
              <input id="recovery-code" className="form-input" inputMode="numeric" autoComplete="one-time-code" value={code}
                onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 10))} required pattern="[0-9]{6,10}" placeholder="Digite o código recebido" />
              <button type="button" className="btn btn-outline btn-sm" style={{ marginTop: 12 }} disabled={isSubmitting}
                onClick={() => { setCodeSent(false); setCode(''); setSuccessMsg(''); setErrorMsg(''); }}>Alterar e-mail ou solicitar outro código</button>
            </div>
          )}

          {mode !== 'forgot' && (
            <div className="form-group">
              <label className="form-label">{mode === 'reset' ? 'Nova Senha' : 'Senha'}</label>
              <div style={{ position: 'relative' }}>
                <Lock
                  size={18}
                  style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-subtle)' }}
                />
                <input
                  type="password"
                  className="form-input"
                  style={{ paddingLeft: 38 }}
                  placeholder="Mínimo 6 caracteres"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
            </div>
          )}

          {(mode === 'signup' || mode === 'reset') && (
            <div className="form-group">
              <label className="form-label">Confirmar Senha</label>
              <div style={{ position: 'relative' }}>
                <Lock
                  size={18}
                  style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-subtle)' }}
                />
                <input
                  type="password"
                  className="form-input"
                  style={{ paddingLeft: 38 }}
                  placeholder="Repita a senha"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
            </div>
          )}

          {mode === 'login' && (
            <div style={{ textAlign: 'right', marginBottom: 16 }}>
              <button
                type="button"
                onClick={() => setMode('forgot')}
                style={{ fontSize: '0.8125rem', color: 'var(--primary-color)', fontWeight: 600 }}
              >
                Esqueceu a senha?
              </button>
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', marginTop: 8 }}
            disabled={isSubmitting}
          >
            {isSubmitting
              ? 'Processando...'
              : mode === 'login'
              ? 'Entrar no Sistema'
              : mode === 'signup'
              ? 'Cadastrar Conta'
              : mode === 'forgot'
              ? codeSent ? 'Validar código' : 'Enviar recuperação'
              : 'Redefinir Senha'}
          </button>
        </form>

        {/* Alternador de Modos */}
        <div style={{ marginTop: 24, textAlign: 'center', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
          {mode === 'login' && (
            <>
              Não tem uma conta?{' '}
              <button
                type="button"
                onClick={() => { setMode('signup'); setErrorMsg(''); }}
                style={{ color: 'var(--primary-color)', fontWeight: 700 }}
              >
                Cadastre-se gratuitamente
              </button>
            </>
          )}

          {mode === 'signup' && (
            <>
              Já tem uma conta?{' '}
              <button
                type="button"
                onClick={() => { setMode('login'); setErrorMsg(''); }}
                style={{ color: 'var(--primary-color)', fontWeight: 700 }}
              >
                Faça login
              </button>
            </>
          )}

          {(mode === 'forgot' || mode === 'reset') && (
            <button
              type="button"
              onClick={async () => { if (mode === 'reset') await logout(); setMode('login'); setErrorMsg(''); setSuccessMsg(''); setCodeSent(false); }}
              style={{ color: 'var(--primary-color)', fontWeight: 700 }}
            >
              Voltar para o Login
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
