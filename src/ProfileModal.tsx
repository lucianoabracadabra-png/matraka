import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { useToast } from './ToastContext';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  onUpdate: () => void;
}

export function ProfileModal({ isOpen, onClose, userId, onUpdate }: Props) {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState('');
  const [website, setWebsite] = useState('');
  // Novo estado para a API Key
  const [groqKey, setGroqKey] = useState('');
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    if (isOpen) {
      getProfile();
    }
  }, [isOpen]);

  const getProfile = async () => {
    try {
      setLoading(true);
      // Agora buscamos também a groq_api_key
      const { data, error, status } = await supabase
        .from('profiles')
        .select('username, website, groq_api_key') 
        .eq('id', userId)
        .single();

      if (error && status !== 406) {
        throw error;
      }

      if (data) {
        setUsername(data.username || '');
        setWebsite(data.website || '');
        setGroqKey(data.groq_api_key || '');
      }
    } catch (error: any) {
      addToast('ERRO AO CARREGAR PERFIL', 'error');
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async () => {
    try {
      setLoading(true);
      const updates = {
        id: userId,
        username,
        website,
        groq_api_key: groqKey, // Salvando a chave
        updated_at: new Date(),
      };

      const { error } = await supabase.from('profiles').upsert(updates);

      if (error) {
        throw error;
      }
      addToast('PERFIL ATUALIZADO', 'success');
      onUpdate();
      onClose();
    } catch (error: any) {
      addToast('ERRO AO SALVAR', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 250, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(5px)', backgroundColor: 'rgba(0, 0, 0, 0.7)' }}>
      
      {/* CSS LOCAL PARA O TOGGLE DE SENHA */}
      <style>{`
        .input-group-pass { position: relative; display: flex; align-items: center; }
        .btn-eye {
          position: absolute; right: 10px; background: transparent; border: none;
          color: #666; cursor: pointer; transition: color 0.2s; display: flex;
        }
        .btn-eye:hover { color: var(--neon-cyan); }
      `}</style>

      <div className="cyber-modal" style={{ width: '90%', maxWidth: '500px', display: 'flex', flexDirection: 'column', '--modal-theme': 'var(--neon-cyan)' } as React.CSSProperties}>
        
        {/* HEADER */}
        <div className="modal-header">
          <div>
            <span style={{ fontSize: '0.65rem', color: 'var(--neon-purple)', fontFamily: 'JetBrains Mono', display: 'block', marginBottom: '4px', letterSpacing:'1px' }}>USER_CONFIG</span>
            <h2 className="title" style={{ fontSize: '1.5rem', margin: 0, color: '#fff' }}>EDIT_PROFILE</h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
        </div>

        {/* BODY */}
        <div className="modal-body">
          
          <div>
            <label className="input-label">CODENAME (USERNAME)</label>
            <input 
              className="cyber-field" 
              value={username} 
              onChange={(e) => setUsername(e.target.value)} 
              placeholder="Digite seu usuário..."
            />
          </div>

          <div>
            <label className="input-label">WEBSITE / PORTFOLIO</label>
            <input 
              className="cyber-field" 
              value={website} 
              onChange={(e) => setWebsite(e.target.value)} 
              placeholder="https://..."
            />
          </div>

          {/* SESSÃO GROQ API KEY (SUBSTITUI O AVATAR) */}
          <div style={{ padding: '15px', border: '1px dashed #333', background: 'rgba(255,0,255,0.03)', marginTop: '10px', borderRadius: '4px' }}>
            <label className="input-label" style={{ color: 'var(--neon-pink)', display:'flex', justifyContent:'space-between' }}>
              <span>GROQ_API_KEY (BYOK)</span>
              <span style={{ fontSize:'0.6rem', opacity: 0.7 }}>REQUIRED FOR AI</span>
            </label>
            
            <div className="input-group-pass">
              <input 
                type={showKey ? "text" : "password"}
                className="cyber-field" 
                value={groqKey} 
                onChange={(e) => setGroqKey(e.target.value)} 
                placeholder="gsk_..."
                style={{ borderColor: 'var(--neon-pink)', color: '#fff' }}
              />
              <button 
                className="btn-eye" 
                onClick={() => setShowKey(!showKey)} 
                title={showKey ? "Hide Key" : "Show Key"}
                type="button"
              >
                {showKey ? (
                  /* Icon Eye Off */
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                ) : (
                  /* Icon Eye */
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                )}
              </button>
            </div>
            
            <div style={{ marginTop: '8px', fontSize: '0.7rem', color: '#666', fontFamily: 'monospace', lineHeight: '1.4' }}>
              <span style={{color:'var(--neon-pink)'}}>INFO:</span> Sua chave é armazenada no seu perfil pessoal. O sistema usa essa chave para gerar textos via IA Groq.
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
            <button 
              onClick={updateProfile} 
              disabled={loading} 
              className="cyber-btn-main" 
              style={{ minWidth: '150px' }}
            >
              {loading ? 'SAVING...' : 'UPDATE_DATA'}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}