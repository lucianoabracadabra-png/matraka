import { useState } from 'react';
import { supabase } from './supabaseClient';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void; // Para avisar o App que salvou e precisa recarregar a lista
  userId: string;
}

export function CreateMacroModal({ isOpen, onClose, onSuccess, userId }: Props) {
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [shortcut, setShortcut] = useState('');
  const [appCategory, setAppCategory] = useState('TEXT'); // TEXT ou AI
  const [isPublic, setIsPublic] = useState(true);

  if (!isOpen) return null;

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.from('macros').insert({
      user_id: userId,
      title,
      content,
      shortcut,
      app_category: appCategory,
      type: 'text', // Default
      is_public: isPublic
    });

    setLoading(false);

    if (error) {
      alert('Erro ao criar macro: ' + error.message);
    } else {
      // Limpa o form
      setTitle('');
      setContent('');
      setShortcut('');
      onSuccess(); // Avisa o pai
      onClose();   // Fecha o modal
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 50,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      backdropFilter: 'blur(5px)', backgroundColor: 'rgba(0,0,0,0.5)'
    }}>
      <div className="snippet-card" style={{ 
        width: '100%', maxWidth: '500px', 
        border: '1px solid #475569', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)' 
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 className="title" style={{ fontSize: '1.5rem', margin: 0 }}>Nova Macro</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1.5rem' }}>&times;</button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          
          {/* Título e Atalho */}
          <div style={{ display: 'flex', gap: '1rem' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.8rem', marginBottom: '0.2rem' }}>Nome</label>
              <input 
                required
                className="search-input" 
                value={title} onChange={e => setTitle(e.target.value)} 
                placeholder="Ex: Saudação"
              />
            </div>
            <div style={{ width: '120px' }}>
              <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.8rem', marginBottom: '0.2rem' }}>Atalho</label>
              <input 
                className="search-input" 
                value={shortcut} onChange={e => setShortcut(e.target.value)} 
                placeholder="'ola"
              />
            </div>
          </div>

          {/* Conteúdo */}
          <div>
            <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.8rem', marginBottom: '0.2rem' }}>Conteúdo</label>
            <textarea 
              required
              className="search-input" 
              value={content} onChange={e => setContent(e.target.value)} 
              placeholder="Olá {cursor}, tudo bem?"
              style={{ minHeight: '120px', resize: 'vertical', fontFamily: 'monospace' }}
            />
          </div>

          {/* Categoria e Visibilidade */}
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.8rem', marginBottom: '0.2rem' }}>Categoria</label>
              <select 
                className="search-input"
                value={appCategory} onChange={e => setAppCategory(e.target.value)}
              >
                <option value="TEXT">Texto (Azul)</option>
                <option value="AI">AI Prompt (Roxo)</option>
              </select>
            </div>
            
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', color: '#e2e8f0', marginTop: '1rem' }}>
              <input 
                type="checkbox" 
                checked={isPublic} 
                onChange={e => setIsPublic(e.target.checked)}
              />
              <span>Pública?</span>
            </label>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            style={{
              marginTop: '1rem',
              background: 'linear-gradient(135deg, #10b981, #059669)',
              border: 'none', padding: '0.8rem', borderRadius: '8px',
              color: 'white', fontWeight: 'bold', cursor: 'pointer',
              opacity: loading ? 0.7 : 1
            }}
          >
            {loading ? 'Salvando...' : 'Criar Macro'}
          </button>

        </form>
      </div>
    </div>
  );
}