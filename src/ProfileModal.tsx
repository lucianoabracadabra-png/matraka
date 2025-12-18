import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { useToast } from './ToastContext'; // <--- Importamos o Hook

interface Props {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  onUpdate: () => void;
}

export function ProfileModal({ isOpen, onClose, userId, onUpdate }: Props) {
  const { addToast } = useToast(); // <--- Usamos o Hook
  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  // Removi o estado 'msg', não precisamos mais dele

  useEffect(() => {
    if (isOpen) loadProfile();
  }, [isOpen]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const { data } = await supabase
        .from('profiles')
        .select('username, avatar_url')
        .eq('id', userId)
        .single();

      if (data) {
        setUsername(data.username || '');
        setAvatarUrl(data.avatar_url || '');
      }
    } catch (error) {
      console.warn('Profile load error', error);
      // Não precisa de toast aqui para não spamar se for só um perfil novo
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: any) => {
    e.preventDefault();
    setLoading(true);

    const updates = {
      id: userId,
      username,
      avatar_url: avatarUrl,
      updated_at: new Date(),
    };

    const { error } = await supabase.from('profiles').upsert(updates);

    if (error) {
      addToast('ERRO AO ATUALIZAR: ' + error.message, 'error'); // <--- TOAST ERRO
    } else {
      addToast('IDENTIDADE ATUALIZADA COM SUCESSO', 'success'); // <--- TOAST SUCESSO
      onUpdate();
      onClose();
    }
    setLoading(false);
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      backdropFilter: 'blur(8px)', backgroundColor: 'rgba(5, 5, 10, 0.8)'
    }}>
      <div className="snippet-card" style={{ 
        width: '100%', maxWidth: '450px', 
        border: '1px solid var(--neon-cyan)',
        boxShadow: '0 0 30px rgba(0, 243, 255, 0.15)',
        position: 'relative',
        background: '#05050a'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', borderBottom: '1px solid var(--neon-cyan)', padding: '1rem' }}>
          <h2 className="title" style={{ fontSize: '1.5rem', margin: 0, color: '#fff' }}>ID_CONFIGURATION</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--neon-pink)', cursor: 'pointer', fontSize: '1.5rem' }}>[X]</button>
        </div>

        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '0 1.5rem 1.5rem' }}>
          
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <div style={{
              width: '80px', height: '80px', borderRadius: '50%',
              background: '#000', border: '2px solid var(--neon-purple)',
              backgroundImage: avatarUrl ? `url(${avatarUrl})` : 'none',
              backgroundSize: 'cover', backgroundPosition: 'center',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 15px var(--neon-purple)'
            }}>
              {!avatarUrl && <span style={{fontSize: '2rem', color: '#666'}}>?</span>}
            </div>
          </div>

          <div>
            <label style={{ display: 'block', color: 'var(--neon-cyan)', fontSize: '0.8rem', fontFamily: 'JetBrains Mono', marginBottom: '0.5rem' }}>
              CODENAME (USERNAME)
            </label>
            <input 
              className="search-input" 
              value={username} 
              onChange={e => setUsername(e.target.value)} 
              placeholder="Ex: Neo_The_One"
              maxLength={20}
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', color: 'var(--neon-purple)', fontSize: '0.8rem', fontFamily: 'JetBrains Mono', marginBottom: '0.5rem' }}>
              AVATAR_SOURCE (URL)
            </label>
            <input 
              className="search-input" 
              value={avatarUrl} 
              onChange={e => setAvatarUrl(e.target.value)} 
              placeholder="https://..."
              style={{ borderColor: 'var(--neon-purple)', color: 'var(--neon-purple)' }}
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="btn-neon"
            style={{
              marginTop: '1rem',
              background: loading ? 'transparent' : 'var(--neon-cyan)',
              color: loading ? 'var(--neon-cyan)' : '#000',
              padding: '1rem',
              fontWeight: '800',
              letterSpacing: '2px'
            }}
          >
            {loading ? 'UPLOADING...' : 'UPDATE_IDENTITY'}
          </button>

        </form>
      </div>
    </div>
  );
}