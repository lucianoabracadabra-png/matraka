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
  const [isPublic, setIsPublic] = useState(false);

  const [showWaitMenu, setShowWaitMenu] = useState(false);
  const [showKeypressMenu, setShowKeypressMenu] = useState(false);

  const keysList = ['enter', 'space', 'right', 'left', 'up', 'down', 'page up', 'page down', 'del', 'backspace', 'home', 'end'];

  useEffect(() => {
    if (macroToEdit) {
      setTitle(macroToEdit.name);
      setContent(macroToEdit.text);
      setShortcut(macroToEdit.shortcut || '');
      setAppCategory(macroToEdit.app || 'TEXT');
      setIsPublic(macroToEdit.is_public || false);
    } else {
      setTitle('');
      setContent('');
      setShortcut('');
      setAppCategory('TEXT');
      setIsPublic(false);
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
    const macroType = appCategory === 'AI' ? 'ai' : 'text';
    const payload = { title, content, shortcut, app_category: appCategory, type: macroType, is_public: isPublic, updated_at: new Date() };
    if (macroToEdit) {
      const { error: updateError } = await supabase.from('macros').update(payload).eq('id', macroToEdit.id).eq('user_id', userId);
      error = updateError;
    } else {
      const { error: insertError } = await supabase.from('macros').insert({ ...payload, user_id: userId });
      error = insertError;
    }
    setLoading(false);
    if (error) { addToast('ERRO: ' + error.message, 'error'); } else { addToast(macroToEdit ? 'MACRO ATUALIZADA' : 'MACRO CRIADA', 'success'); onSuccess(); onClose(); }
  };

  if (!isOpen) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)', backgroundColor: 'rgba(0, 0, 0, 0.8)' }}>
      <div className="cyber-modal" style={{ width: '90%', maxWidth: '700px', padding: '0', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        
        {/* CSS LOCAL PARA A TELA DE EDIÇÃO */}
        <style>{`
          /* Labels */
          .input-label {
            font-family: 'JetBrains Mono', monospace; font-size: 0.7rem; color: #666; 
            margin-bottom: 6px; display: block; letter-spacing: 1px;
          }
          
          /* Inputs Estilizados */
          .cyber-field {
            background: #050505; border: 1px solid #333; color: #fff;
            padding: 12px; font-family: 'JetBrains Mono', monospace; font-size: 0.9rem;
            width: 100%; border-radius: 2px; transition: all 0.2s;
          }
          .cyber-field:focus {
            border-color: var(--neon-cyan); box-shadow: 0 0 15px rgba(0, 243, 255, 0.1); outline: none;
          }
          .cyber-field::placeholder { color: #333; }

          /* Tabs de Categoria */
          .cat-tab {
            flex: 1; text-align: center; padding: 10px; cursor: pointer;
            font-family: 'JetBrains Mono'; font-size: 0.8rem; font-weight: bold;
            background: #0a0a0a; border: 1px solid #333; color: #666; transition: all 0.2s;
          }
          .cat-tab.active-text { background: rgba(0, 243, 255, 0.1); border-color: var(--neon-cyan); color: var(--neon-cyan); }
          .cat-tab.active-ai { background: rgba(255, 0, 255, 0.1); border-color: var(--neon-pink); color: var(--neon-pink); }
          .cat-tab:hover { background: #111; color: #fff; }

          /* Botões da Toolbar */
          .tool-btn {
            display: flex; align-items: center; gap: 6px; padding: 8px 12px;
            background: rgba(255,255,255,0.03); border: 1px solid;
            font-family: 'JetBrains Mono'; font-size: 0.75rem; font-weight: bold;
            cursor: pointer; transition: all 0.2s; border-radius: 2px;
          }
          /* Efeito Hover Preto + Glow */
          .tool-btn:hover { color: #000 !important; box-shadow: 0 0 15px currentColor; background: currentColor; }
          .tool-btn svg { width: 14px; height: 14px; stroke-width: 2.5; }
          
          /* Menus Dropdown */
          .cyber-dropdown {
            background: #000; border: 1px solid; padding: 4px;
            box-shadow: 0 0 20px rgba(0,0,0,0.8); z-index: 100;
          }
          .dropdown-item {
            background: transparent; border: none; color: #fff; padding: 8px 12px;
            width: 100%; text-align: left; cursor: pointer;
            font-family: 'JetBrains Mono'; font-size: 0.8rem; transition: 0.2s;
          }
          .dropdown-item:hover { background: rgba(255,255,255,0.1); color: #fff; font-weight: bold; }

        `}</style>

        {/* HEADER */}
        <div style={{ padding: '20px 25px', borderBottom: '1px solid #222', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(90deg, rgba(0,0,0,1) 0%, rgba(10,10,15,1) 100%)' }}>
          <div>
            <span style={{ fontSize: '0.7rem', color: 'var(--neon-purple)', fontFamily: 'JetBrains Mono', display: 'block', marginBottom: '4px' }}>
              SYSTEM: {macroToEdit ? 'UPDATE_MODE' : 'INSERT_MODE'}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              <h2 className="title" style={{ fontSize: '1.8rem', margin: 0, color: '#fff', textShadow: '0 0 10px rgba(255,255,255,0.3)' }}>
                {macroToEdit ? 'EDIT_PROTOCOL' : 'NEW_PROTOCOL'}
              </h2>
              
              {/* Botão de Privacidade */}
              <button onClick={() => setIsPublic(!isPublic)} style={{ 
                background: isPublic ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.5)', 
                border: `1px solid ${isPublic ? '#00ff00' : 'var(--neon-pink)'}`, 
                color: isPublic ? '#00ff00' : 'var(--neon-pink)', 
                borderRadius: '2px', padding: '4px 10px', fontSize: '0.7rem', 
                cursor: 'pointer', fontFamily: 'JetBrains Mono', fontWeight: 'bold', 
                display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s',
                boxShadow: isPublic ? '0 0 5px rgba(0,255,0,0.2)' : '0 0 5px rgba(255,0,85,0.2)'
              }}>
                {isPublic ? (
                  <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 9.9-1"></path></svg> UNLOCKED</>
                ) : (
                  <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg> LOCKED</>
                )}
              </button>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#444', cursor: 'pointer', fontSize: '1.5rem', transition: '0.2s' }} onMouseEnter={e=>e.currentTarget.style.color='var(--neon-pink)'} onMouseLeave={e=>e.currentTarget.style.color='#444'}>✕</button>
        </div>

        {/* BODY */}
        <div style={{ padding: '25px', display: 'flex', flexDirection: 'column', gap: '20px', background: '#080808' }}>
          
          {/* Nome do Protocolo */}
          <div>
            <label className="input-label">PROTOCOL_NAME</label>
            <input 
              className="cyber-field" 
              placeholder="Ex: Saudação Bom Dia" 
              value={title} onChange={e => setTitle(e.target.value)} 
              autoFocus 
            />
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 200px', gap: '20px' }}>
            
            {/* Gatilho */}
            <div>
              <label className="input-label">TRIGGER_KEY</label>
              <input 
                className="cyber-field" 
                placeholder="Ex: /bomdia" 
                value={shortcut} onChange={e => setShortcut(e.target.value)} 
              />
            </div>

            {/* Categoria Selector */}
            <div>
              <label className="input-label">CATEGORY</label>
              <div style={{ display: 'flex', gap: '-1px' }}>
                <div className={`cat-tab ${appCategory === 'TEXT' ? 'active-text' : ''}`} onClick={() => setAppCategory('TEXT')}>TEXT</div>
                <div className={`cat-tab ${appCategory === 'AI' ? 'active-ai' : ''}`} onClick={() => setAppCategory('AI')}>AI</div>
                {/* <div className={`cat-tab`} onClick={() => setAppCategory('CODE')}>CODE</div> */}
              </div>
            </div>
          </div>

          <div>
            <label className="input-label">DATA_CONTENT</label>
            
            {/* TOOLBAR */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '10px', flexWrap: 'wrap', padding: '10px', background: '#000', border: '1px solid #222', borderRadius: '2px' }}>
              
              {appCategory === 'AI' ? (
                <ToolButton label="AI SELECT" color="#a855f7" onClick={() => insertTag('{selection}')} svgPath={<><path d="M20 12v6M12 20h6M12 4H6M4 12V6M2 2L22 22M12 12l8-8M12 12L4 20" /></>} />
              ) : (
                <>
                  <ToolButton label="CURSOR" color="var(--neon-cyan)" onClick={() => insertTag('[cursor]')} svgPath={<><path d="M5 3h14M5 21h14M12 3v18" /></>} />
                  <ToolButton label="CLIPBOARD" color="var(--neon-cyan)" onClick={() => insertTag('[paste]')} svgPath={<><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></>} />
                </>
              )}
              
              <div style={{ width: '1px', background: '#333', margin: '0 5px' }}></div>
              
              <ToolButton label="AGENTE" color="var(--neon-purple)" onClick={() => insertTag('[agente]')} svgPath={<><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></>} />
              
              <ToolButton label="INPUT" color="var(--neon-pink)" onClick={() => { const tag = '[input:Título]'; if (textareaRef.current) { const start = textareaRef.current.selectionStart; const text = content; const newText = text.substring(0, start) + tag + text.substring(textareaRef.current.selectionEnd); setContent(newText); setTimeout(() => { if (textareaRef.current) { textareaRef.current.focus(); textareaRef.current.setSelectionRange(start + 7, start + 7 + 6); } }, 0); } }} svgPath={<><path d="M12 19l7-7 3 3-7 7-3-3z"></path><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"></path><path d="M2 2l7.586 7.586"></path><circle cx="11" cy="11" r="2"></circle></>} />
              
              <div style={{ width: '1px', background: '#333', margin: '0 5px' }}></div>

              <ToolButton label="DOM" color="#f59e0b" onClick={() => insertTag('[dom:.classe]')} svgPath={<><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></>} />
              
              {/* Menu KEYPRESS (Direita alinhada) */}
              <div style={{ position: 'relative' }}>
                <ToolButton label="KEYPRESS" color="var(--neon-cyan)" onClick={() => setShowKeypressMenu(!showKeypressMenu)} svgPath={<><rect x="2" y="4" width="20" height="16" rx="2" ry="2"></rect><line x1="6" y1="12" x2="18" y2="12"></line></>} />
                {showKeypressMenu && (
                  <div className="cyber-dropdown" style={{ position: 'absolute', bottom: '120%', right: 0, minWidth: '220px', borderColor: 'var(--neon-cyan)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1px' }}>
                    {keysList.map(key => (
                      <button key={key} onClick={() => { insertTag(`[key:${key}]`); setShowKeypressMenu(false); }} className="dropdown-item" style={{ textAlign: 'center', textTransform: 'uppercase', fontSize: '0.7rem' }}>{key}</button>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Menu WAIT */}
              <div style={{ position: 'relative' }}>
                <ToolButton label="WAIT..." color="var(--neon-pink)" onClick={() => setShowWaitMenu(!showWaitMenu)} svgPath={<><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></>} />
                {showWaitMenu && (
                  <div className="cyber-dropdown" style={{ position: 'absolute', bottom: '120%', left: 0, minWidth: '80px', borderColor: 'var(--neon-pink)' }}>
                    {[1, 2, 3, 5].map(sec => (
                      <button key={sec} onClick={() => { insertTag(`[wait:${sec}]`); setShowWaitMenu(false); }} className="dropdown-item" style={{ textAlign: 'center' }}>{sec}s</button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Editor de Texto */}
            <textarea 
              ref={textareaRef}
              className="cyber-field" 
              placeholder={appCategory === 'AI' ? "Digite o prompt para a IA..." : "Digite o texto da macro..."}
              value={content} onChange={e => setContent(e.target.value)}
              style={{ minHeight: '220px', lineHeight: '1.6', fontSize: '0.95rem', resize: 'vertical' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
            <button onClick={handleSave} disabled={loading} className="cyber-btn-main" style={{ minWidth: '180px' }}>
              {loading ? 'PROCESSING...' : (macroToEdit ? 'SAVE_CHANGES' : 'COMPILE_MACRO')}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}

// Botão da Toolbar Refatorado
function ToolButton({ label, svgPath, onClick, color }: any) {
  return (
    <button 
      onClick={onClick} 
      className="tool-btn"
      style={{ borderColor: color, color: color }} // Cores dinâmicas via style inline
      title={`Inserir ${label}`}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
        {svgPath}
      </svg>
      {label}
    </button>
  );
}