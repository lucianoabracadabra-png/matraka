import { useState } from 'react';
import { supabase } from './supabaseClient';
import { useToast } from './ToastContext'; // <--- Importamos o Toast

export function Auth() {
  const { addToast } = useToast(); // <--- Hook
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');

  const handleLogin = async (e: any) => {
    e.preventDefault();
    setLoading(true);
    
    // Validação básica
    if (!email) {
      addToast('DIGITE UM EMAIL VÁLIDO', 'error');
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.signInWithOtp({ 
      email,
      options: {
        // Redireciona para o site atual após o clique no email
        emailRedirectTo: window.location.origin 
      }
    });

    if (error) {
      addToast('ERRO NO LOGIN: ' + error.message, 'error');
    } else {
      addToast('LINK MÁGICO ENVIADO! VERIFIQUE SEU EMAIL.', 'success');
      addToast('Aguardando confirmação...', 'info');
    }
    setLoading(false);
  };

  return (
    <div className="auth-container" style={{
      background: 'rgba(5, 5, 10, 0.9)',
      padding: '2rem',
      borderRadius: '8px',
      border: '1px solid var(--neon-purple)',
      boxShadow: '0 0 20px rgba(188, 19, 254, 0.2)',
      textAlign: 'center',
      maxWidth: '400px',
      width: '100%'
    }}>
      <h1 className="title" style={{ marginBottom: '0.5rem' }}>MATRAKA</h1>
      <p style={{ color: '#fff', fontFamily: 'JetBrains Mono', marginBottom: '2rem', fontSize: '0.9rem' }}>
        SYSTEM.LOGIN_REQUIRED
      </p>
      
      <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <input
          className="search-input"
          type="email"
          placeholder="SEU_EMAIL@CORP.COM"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ textAlign: 'center' }}
        />
        <button 
          className="btn-neon" 
          disabled={loading}
          style={{ width: '100%', justifyContent: 'center', padding: '1rem' }}
        >
          {loading ? 'SENDING_LINK...' : 'SEND_MAGIC_LINK'}
        </button>
      </form>
      
      <p style={{ marginTop: '1.5rem', color: '#666', fontSize: '0.75rem', fontFamily: 'JetBrains Mono' }}>
        * ACESSO RESTRITO A OPERADORES AUTORIZADOS
      </p>
    </div>
  );
}