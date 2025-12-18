import { useState, useEffect, useRef } from 'react';
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [shortcut, setShortcut] = useState('');
  const [appCategory, setAppCategory] = useState('TEXT');

  const [showWaitMenu, setShowWaitMenu] = useState(false);

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

  const insertTag = (tag: string) => {
    if (!textareaRef.current) return;
    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    const text = content;
    const newText = text.substring(0, start) + tag + text.substring(end);
    setContent(newText);
    
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(start + tag.length, start + tag.length);
      }
    }, 0);
  };

  const handleSave = async () => {
    if (!title || !content) {
      addToast('DADOS INCOMPLETOS', 'error');
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
      const { error: updateError } = await supabase
        .from('macros')
        .update(payload)
        .eq('id', macroToEdit.id)
        .eq('user_id', userId);
      error = updateError;
    } else {
      const { error: insertError } = await supabase
        .from('macros')
        .insert({ ...payload, user_id: userId, type: 'text', is_public: false });
      error = insertError;
    }

    setLoading(false);

    if (error) {
      addToast('ERRO: ' + error.message, 'error');
    } else {
      addToast(macroToEdit ? 'MACRO ATUALIZADA' : 'MACRO CRIADA', 'success');
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
      <div className="cyber-modal" style={{ width: '90%', maxWidth: '650px', padding: '2rem' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <span style={{ fontSize: '0.7rem', color: 'var(--neon-purple)', fontFamily: 'JetBrains Mono' }}>
              {macroToEdit ? 'SYSTEM: UPDATE_MODE' : 'SYSTEM: INSERT_MODE'}
            </span>
            <h2 className="title" style={{ fontSize: '1.8rem', margin: 0, color: '#fff' }}>
              {macroToEdit ? 'EDIT_PROTOCOL' : 'NEW_PROTOCOL'}
            </h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--neon-pink)', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          
          <div>
            <label className="cyber-label">PROTOCOL_NAME</label>
            <input className="cyber-input" placeholder="Ex: Saudação Bom Dia" value={title} onChange={e => setTitle(e.target.value)} autoFocus />
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label className="cyber-label">TRIGGER_KEY</label>
              <input className="cyber-input" placeholder="Ex: /bomdia" value={shortcut} onChange={e => setShortcut(e.target.value)} />
            </div>
            <div>
              <label className="cyber-label">CATEGORY</label>
              <div className="type-selector">
                {['TEXT', 'AI', 'CODE'].map((type) => (
                  <div key={type} className={`type-option ${appCategory === type ? 'active' : ''}`} onClick={() => setAppCategory(type)}>
                    {type}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="cyber-label">DATA_CONTENT</label>
            
            {/* --- BARRA DE FERRAMENTAS PADRONIZADA --- */}
            <div style={{ 
              display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', flexWrap: 'wrap',
              background: 'rgba(0, 0, 0, 0.3)', padding: '0.5rem', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.1)'
            }}>
              
              {/* GRUPO 1: Ferramentas de Sistema (CYAN) */}
              <ToolButton label="CURSOR" icon="⌶" onClick={() => insertTag('{cursor}')} color="var(--neon-cyan)" />
              <ToolButton label="CLIPBOARD" icon="📋" onClick={() => insertTag('{clipboard}')} color="var(--neon-cyan)" />
              
              <div style={{ width: '1px', background: 'rgba(255,255,255,0.2)', margin: '0 0.2rem' }}></div>
              
              {/* GRUPO 2: Entidades (ROXO) */}
              <ToolButton label="CLIENTE" icon="👤" onClick={() => insertTag('{client}')} color="var(--neon-purple)" />
              <ToolButton label="AGENTE" icon="🎧" onClick={() => insertTag('{agent}')} color="var(--neon-purple)" />
              
              <div style={{ width: '1px', background: 'rgba(255,255,255,0.2)', margin: '0 0.2rem' }}></div>

              {/* GRUPO 3: Dados e Controle (CYAN e ROSA) */}
              <ToolButton label="DATA" icon="📅" onClick={() => insertTag('{date}')} color="var(--neon-cyan)" />
              <ToolButton label="ENTER" icon="↵" onClick={() => insertTag('{key:enter}')} color="var(--neon-cyan)" />
              
              {/* Botão Wait (ROSA) */}
              <div style={{ position: 'relative' }}>
                <ToolButton 
                  label="AGUARDE..." 
                  icon="⏳" 
                  onClick={() => setShowWaitMenu(!showWaitMenu)} 
                  color="var(--neon-pink)"
                />
                
                {showWaitMenu && (
                  <div style={{
                    position: 'absolute', bottom: '110%', left: 0,
                    background: '#05050a', border: '1px solid var(--neon-pink)',
                    display: 'flex', flexDirection: 'column', gap: '2px', padding: '4px',
                    zIndex: 10, boxShadow: '0 0 15px rgba(255,0,85,0.3)',
                    minWidth: '100px'
                  }}>
                    {[1, 2, 3, 5, 10].map(sec => (
                      <button
                        key={sec}
                        onClick={() => { insertTag(`{wait:${sec}s}`); setShowWaitMenu(false); }}
                        style={{
                          background: 'rgba(255, 0, 85, 0.1)', border: 'none', color: '#fff',
                          padding: '6px', cursor: 'pointer', fontFamily: 'JetBrains Mono',
                          textAlign: 'left', fontSize: '0.8rem', marginBottom: '1px'
                        }}
                        className="hover-pink"
                      >
                        +{sec}s
                      </button>
                    ))}
                  </div>
                )}
              </div>

            </div>

            <textarea 
              ref={textareaRef}
              className="cyber-input cyber-textarea" 
              placeholder="Digite o texto da macro..." 
              value={content} onChange={e => setContent(e.target.value)}
              style={{ minHeight: '180px', fontFamily: 'monospace', fontSize: '0.9rem', lineHeight: '1.5' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
            <button onClick={handleSave} disabled={loading} className="cyber-btn-main" style={{ minWidth: '150px' }}>
              {loading ? 'PROCESSING...' : (macroToEdit ? 'SAVE_CHANGES' : 'COMPILE_MACRO')}
            </button>
          </div>

        </div>
      </div>
      
      <style>{`
        .hover-pink:hover { background: var(--neon-pink) !important; color: #000 !important; }
      `}</style>
    </div>
  );
}

function ToolButton({ label, icon, onClick, color }: any) {
  const finalColor = color || '#e0e0e0';
  
  return (
    <button 
      onClick={onClick}
      title={`Inserir ${label}`}
      style={{
        background: `rgba(0,0,0,0.3)`, 
        border: `1px solid ${finalColor}`,
        color: finalColor,
        borderRadius: '2px', 
        padding: '6px 10px',
        cursor: 'pointer',
        fontFamily: 'JetBrains Mono',
        fontSize: '0.7rem',
        fontWeight: 'bold',
        display: 'flex', alignItems: 'center', gap: '6px',
        transition: 'all 0.2s',
        boxShadow: `0 0 5px ${finalColor}20` 
      }}
      onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
        const target = e.currentTarget as HTMLButtonElement;
        target.style.background = finalColor;
        target.style.color = '#000'; 
        target.style.boxShadow = `0 0 15px ${finalColor}`;
      }}
      onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
        const target = e.currentTarget as HTMLButtonElement;
        target.style.background = 'rgba(0,0,0,0.3)';
        target.style.color = finalColor;
        target.style.boxShadow = `0 0 5px ${finalColor}20`;
      }}
    >
      <span style={{ fontSize: '0.9rem' }}>{icon}</span>
      <span>{label}</span>
    </button>
  );
}
