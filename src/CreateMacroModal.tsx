import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { useToast } from './ToastContext';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  userId: string;
  macroToEdit?: any | null; // <--- NOVO PROP: A macro que vamos editar
}

export function CreateMacroModal({ isOpen, onClose, onSuccess, userId, macroToEdit }: Props) {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [shortcut, setShortcut] = useState('');
  const [appCategory, setAppCategory] = useState('TEXT');

  // Se receber uma macro para editar, preenche os campos
  useEffect(() => {
    if (macroToEdit) {
      setTitle(macroToEdit.name);
      setContent(macroToEdit.text);
      setShortcut(macroToEdit.shortcut || '');
      setAppCategory(macroToEdit.app || 'TEXT');
    } else {
      // Limpa se for criar nova
      setTitle('');
      setContent('');
      setShortcut('');
      setAppCategory('TEXT');
    }
  }, [macroToEdit, isOpen]);

  const handleSave = async () => {
    if (!title || !content) {
      addToast('PREENCHA O NOME E O CONTEÚDO', 'error');
      return;
    }

    setLoading(true);

    let error;

    if (macroToEdit) {
      // --- MODO EDIÇÃO (UPDATE) ---
      const { error: updateError } = await supabase
        .from('macros')
        .update({
          title,
          content,
          shortcut,
          app_category: appCategory,
          updated_at: new Date()
        })
        .eq('id', macroToEdit.id)
        .eq('user_id', userId); // Garante que só edita se for sua
      
      error = updateError;
    } else {
      // --- MODO CRIAÇÃO (INSERT) ---
      const { error: insertError } = await supabase
        .from('macros')
        .insert({
          user_id: userId,
          title,
          content,
          shortcut,
          app_category: appCategory,
          type: 'text',
          is_public: false
        });
      
      error = insertError;
    }

    setLoading(false);

    if (error) {
      addToast('ERRO AO SALVAR: ' + error.message, 'error');
    } else {
      addToast(macroToEdit ? 'MACRO ATUALIZADA!' : 'MACRO CRIADA!', 'success');
      onSuccess();
      onClose();
      // Limpa campos
      if (!macroToEdit) {
        setTitle('');
        setContent('');
        setShortcut('');
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 50,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      backdropFilter: 'blur(5px)', backgroundColor: 'rgba(0, 0, 0, 0.7)'
    }}>
      <div className="snippet-card" style={{ width: '100%', maxWidth: '500px', border: '1px solid var(--neon-cyan)', background: '#05050a' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <h2 className="title" style={{ fontSize: '1.5rem', margin: 0, color: '#fff' }}>
            {macroToEdit ? 'EDIT_MACRO' : 'NEW_MACRO'}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--neon-pink)', cursor: 'pointer', fontSize: '1.2rem' }}>[X]</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <input 
            className="search-input" 
            placeholder="NOME DA MACRO (Ex: Saudação)" 
            value={title} onChange={e => setTitle(e.target.value)}
          />
          
          <div style={{ display: 'flex', gap: '1rem' }}>
            <input 
              className="search-input" 
              placeholder="ATALHO (Ex: /oi)" 
              value={shortcut} onChange={e => setShortcut(e.target.value)}
              style={{ flex: 1 }}
            />
            <select 
              className="search-input" 
              value={appCategory} onChange={e => setAppCategory(e.target.value)}
              style={{ width: '120px' }}
            >
              <option value="TEXT">TEXT</option>
              <option value="AI">AI</option>
              <option value="CODE">CODE</option>
            </select>
          </div>

          <textarea 
            className="search-input" 
            placeholder="CONTEÚDO DA MACRO..." 
            rows={8}
            value={content} onChange={e => setContent(e.target.value)}
            style={{ fontFamily: 'monospace' }}
          />

          <button 
            onClick={handleSave} 
            disabled={loading}
            className="btn-create" 
            style={{ width: '100%', marginTop: '1rem' }}
          >
            {loading ? 'SAVING...' : (macroToEdit ? 'UPDATE_SYSTEM' : 'COMPILE_MACRO')}
          </button>
        </div>
      </div>
    </div>
  );
}