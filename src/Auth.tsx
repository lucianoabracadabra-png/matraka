import { useState } from 'react';
import { supabase } from './supabaseClient';
import { useToast } from './ToastContext';

export function Auth() {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === 'REGISTER') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        addToast('REGISTRO REALIZADO! VERIFIQUE SEU E-MAIL.', 'success');
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        addToast('SYSTEM ACCESS GRANTED', 'success');
      }
    } catch (error: any) {
      addToast(error.message || 'ERRO DE AUTENTICAÇÃO', 'error');
    } finally {
      setLoading(false);
    }
  };

  const themeColor = mode === 'LOGIN' ? 'var(--neon-cyan)' : 'var(--neon-pink)';

  return (
    <div className="auth-wrapper">
      <div className="cyber-modal" style={{ width: '400px', '--modal-theme': themeColor } as React.CSSProperties}>
        
        {/* HEADER */}
        <div className="modal-header" style={{ justifyContent: 'center', flexDirection: 'column', gap: '10px', paddingBottom: '0' }}>
          <h1 className="title-glitch" data-text="MATRAKA" style={{ fontSize: '2.5rem' }}>MATRAKA</h1>
          <span style={{ fontFamily: 'JetBrains Mono', fontSize: '0.8rem', color: '#666', letterSpacing: '2px' }}>
            SECURE_CONNECTION_V2.0
          </span>
        </div>

        {/* TABS */}
        <div className="auth-tabs" style={{ display: 'flex', marginTop: '1.5rem', borderBottom: '1px solid #333' }}>
          <button 
            onClick={() => setMode('LOGIN')}
            className={`auth-tab ${mode === 'LOGIN' ? 'active' : ''}`}
            style={{ color: mode === 'LOGIN' ? 'var(--neon-cyan)' : '#666' }}
          >
            SYSTEM_LOGIN
          </button>
          <button 
            onClick={() => setMode('REGISTER')}
            className={`auth-tab ${mode === 'REGISTER' ? 'active' : ''}`}
            style={{ color: mode === 'REGISTER' ? 'var(--neon-pink)' : '#666' }}
          >
            NEW_USER
          </button>
        </div>

        {/* BODY */}
        <form onSubmit={handleAuth} className="modal-body" style={{ gap: '1.5rem' }}>
          
          <div>
            <label className="input-label" style={{ color: themeColor }}>IDENTIFICATION (EMAIL)</label>
            <input 
              type="email" 
              className="cyber-field" 
              placeholder="user@matraka.system" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="input-label" style={{ color: themeColor }}>ACCESS_KEY (PASSWORD)</label>
            <input 
              type="password" 
              className="cyber-field" 
              placeholder="••••••••" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button 
            type="submit" 
            className="cyber-btn-main" 
            disabled={loading}
            style={{ marginTop: '1rem', background: themeColor }}
          >
            {loading ? 'PROCESSING...' : (mode === 'LOGIN' ? 'ENTER_SYSTEM' : 'CREATE_ID')}
          </button>

        </form>
      </div>
    </div>
  );
}