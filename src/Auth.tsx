import { useState } from 'react';
import { supabase } from './supabaseClient';

export function Auth() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async (e: any) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) alert(error.message);
    setLoading(false);
  };

  const handleSignUp = async (e: any) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      alert(error.message);
    } else {
      alert('Cadastro realizado! Se o login não for automático, verifique seu e-mail.');
    }
    setLoading(false);
  };

  return (
    <div className="auth-container" style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '80vh'
    }}>
      <div className="snippet-card card-ai" style={{ maxWidth: '400px', width: '100%', padding: '2rem' }}>
        <h2 className="title" style={{ fontSize: '2rem', textAlign: 'center', marginBottom: '2rem' }}>
          Matraka
        </h2>
        <p style={{ color: '#94a3b8', textAlign: 'center', marginBottom: '2rem' }}>
          Identifique-se para acessar o sistema
        </p>

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <input
              className="search-input"
              type="email"
              placeholder="Seu e-mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <input
              className="search-input"
              type="password"
              placeholder="Sua senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          
          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: '1rem',
              background: 'linear-gradient(135deg, #a855f7, #06b6d4)',
              border: 'none',
              padding: '1rem',
              borderRadius: '8px',
              color: 'white',
              fontWeight: 'bold',
              cursor: loading ? 'wait' : 'pointer'
            }}
          >
            {loading ? 'Carregando...' : 'Entrar'}
          </button>

          <button
            type="button"
            onClick={handleSignUp}
            disabled={loading}
            style={{
              background: 'transparent',
              border: '1px solid #475569',
              padding: '0.8rem',
              borderRadius: '8px',
              color: '#94a3b8',
              cursor: loading ? 'wait' : 'pointer',
              fontSize: '0.9rem'
            }}
          >
            Não tem conta? Cadastre-se
          </button>
        </form>
      </div>
    </div>
  );
}