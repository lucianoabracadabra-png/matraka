import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { useToast } from './ToastContext';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  userId: string;
  macroToEdit?: any | null;
}

export function CreateMacroModal({ isOpen, onClose, onSuccess, userId, macroToEdit }: Props) {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);
  
  // States do formulário
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [shortcut, setShortcut] = useState('');
  const [appCategory, setAppCategory] = useState('TEXT');

  // Preenche dados se for edição
  useEffect(() => {
    if (macroToEdit) {
      setTitle(macroToEdit.name);
      setContent(macroToEdit.text);
      setShortcut(macroToEdit.shortcut || '');
      setAppCategory(macroToEdit.app || 'TEXT');
    } else {
      setTitle('');
      setContent('');
      setShortcut('');
      setAppCategory('TEXT');
    }
  }, [macroToEdit, isOpen]);

  const handleSave = async () => {
    if (!title || !content) {
      addToast('DADOS INCOMPLETOS: NOME E CONTEÚDO SÃO OBRIGATÓRIOS', 'error');
      return;
    }

    setLoading(true);
    let error;

    const payload = {
      title,
      content,
      shortcut,
      app_category: appCategory,
      updated_at: new Date()
    };

    if (macroToEdit) {
      // UPDATE
      const { error: updateError } = await supabase
        .from('macros')
        .update(payload)
        .eq('id', macroToEdit.id)
        .eq('user_id', userId);
      error = updateError;
    } else {
      // INSERT
      const { error: insertError } = await supabase
        .from('macros')
        .insert({
          ...payload,
          user_id: userId,
          type: 'text',
          is_public: false
        });
      error = insertError;
    }

    setLoading(false);

    if (error) {
      addToast('FALHA NA OPERAÇÃO: ' + error.message, 'error');
    } else {
      addToast(macroToEdit ? 'SISTEMA ATUALIZADO' : 'NOVA MACRO COMPILADA', 'success');
      onSuccess();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      backdropFilter: 'blur(8px)', backgroundColor: 'rgba(0, 0, 0, 0.8)'
    }}>
      {/* CONTAINER PRINCIPAL: Classe cyber-modal faz a mágica da borda cortada */}
      <div className="cyber-modal" style={{ width: '90%', maxWidth: '600px', padding: '2rem' }}>
        
        {/* HEADER DO MODAL */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            <span style={{ fontSize: '0.7rem', color: 'var(--neon-purple)', fontFamily: 'JetBrains Mono' }}>
              {macroToEdit ? 'MODE: UPDATE_EXISTING' : 'MODE: CREATE_NEW'}
            </span>
            <h2 className="title" style={{ fontSize: '1.8rem', margin: 0, color: '#fff', textShadow: '0 0 10px rgba(255,255,255,0.3)' }}>
              {macroToEdit ? 'EDIT_PROTOCOL' : 'NEW_PROTOCOL'}
            </h2>
          </div>
          <button 
            onClick={onClose} 
            style={{ 
              background: 'transparent', border: '1px solid var(--neon-pink)', 
              color: 'var(--neon-pink)', width: '30px', height: '30px', 
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}
          >
            ✕
          </button>
        </div>

        {/* FORMULÁRIO */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* NOME DA MACRO */}
          <div>
            <label className="cyber-label">PROTOCOL_NAME</label>
            <input 
              className="cyber-input" 
              placeholder="Ex: Resposta Padrão Cliente" 
              value={title} onChange={e => setTitle(e.target.value)}
              autoFocus
            />
          </div>
          
          {/* GRID: ATALHO + TIPO */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label className="cyber-label">SHORTCUT_KEY</label>
              <input 
                className="cyber-input" 
                placeholder="Ex: /oi" 
                value={shortcut} onChange={e => setShortcut(e.target.value)}
              />
            </div>

            <div>
              <label className="cyber-label">CATEGORY_TYPE</label>
              {/* Seletor Customizado em vez de <select> */}
              <div className="type-selector">
                {['TEXT', 'AI', 'CODE'].map((type) => (
                  <div 
                    key={type}
                    className={`type-option ${appCategory === type ? 'active' : ''}`}
                    onClick={() => setAppCategory(type)}
                  >
                    {type}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* CONTEÚDO */}
          <div>
            <label className="cyber-label">DATA_CONTENT</label>
            <textarea 
              className="cyber-input cyber-textarea" 
              placeholder="Digite o texto, prompt ou código aqui..." 
              value={content} onChange={e => setContent(e.target.value)}
            />
          </div>

          {/* RODAPÉ DO MODAL */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
            <span style={{ fontSize: '0.7rem', color: '#666', fontFamily: 'JetBrains Mono' }}>
              STATUS: {loading ? 'UPLOADING...' : 'READY'}
            </span>

            <button 
              onClick={handleSave} 
              disabled={loading}
              className="cyber-btn-main"
              style={{ minWidth: '150px' }}
            >
              {loading ? 'PROCESSING...' : (macroToEdit ? 'SAVE_CHANGES' : 'COMPILE')}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}