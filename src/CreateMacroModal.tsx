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
      <div className="cyber-modal" style={{ width: '90%', maxWidth: '650px', padding: '2rem' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <span style={{ fontSize: '0.7rem', color: 'var(--neon-purple)', fontFamily: 'JetBrains Mono' }}>{macroToEdit ? 'SYSTEM: UPDATE_MODE' : 'SYSTEM: INSERT_MODE'}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <h2 className="title" style={{ fontSize: '1.8rem', margin: 0, color: '#fff' }}>{macroToEdit ? 'EDIT_PROTOCOL' : 'NEW_PROTOCOL'}</h2>
              
              <button onClick={() => setIsPublic(!isPublic)} style={{ background: isPublic ? 'rgba(0, 255, 0, 0.1)' : 'rgba(255, 0, 85, 0.1)', border: `1px solid ${isPublic ? '#00ff00' : 'var(--neon-pink)'}`, color: isPublic ? '#00ff00' : 'var(--neon-pink)', borderRadius: '4px', padding: '4px 8px', fontSize: '0.7rem', cursor: 'pointer', fontFamily: 'JetBrains Mono', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s' }}>
                {isPublic ? (
                  <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 9.9-1"></path></svg> UNLOCKED</>
                ) : (
                  <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg> LOCKED</>
                )}
              </button>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--neon-pink)', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          <div><label className="cyber-label">PROTOCOL_NAME</label><input className="cyber-input" placeholder="Ex: Saudação Bom Dia" value={title} onChange={e => setTitle(e.target.value)} autoFocus /></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div><label className="cyber-label">TRIGGER_KEY</label><input className="cyber-input" placeholder="Ex: /bomdia" value={shortcut} onChange={e => setShortcut(e.target.value)} /></div>
            <div><label className="cyber-label">CATEGORY</label><div className="type-selector">{['TEXT', 'AI', 'CODE'].map((type) => (<div key={type} className={`type-option ${appCategory === type ? 'active' : ''}`} onClick={() => setAppCategory(type)} style={type === 'AI' && appCategory === 'AI' ? { borderColor: '#a855f7', color: '#a855f7', boxShadow: '0 0 10px #a855f7' } : {}}>{type}</div>))}</div></div>
          </div>

          <div>
            <label className="cyber-label">DATA_CONTENT</label>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', flexWrap: 'wrap', background: 'rgba(0, 0, 0, 0.3)', padding: '0.5rem', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.1)' }}>
              
              {appCategory === 'AI' ? (
                // AI SELECT (Embrulhado em Fragment)
                <ToolButton label="AI SELECT" svgPath={<><path d="M20 12v6M12 20h6M12 4H6M4 12V6M2 2L22 22M12 12l8-8M12 12L4 20" /></>} onClick={() => insertTag('{selection}')} color="#a855f7" />
              ) : (
                <>
                  {/* CURSOR (Embrulhado em Fragment) */}
                  <ToolButton label="CURSOR" svgPath={<><path d="M5 3h14M5 21h14M12 3v18" /></>} onClick={() => insertTag('[cursor]')} color="var(--neon-cyan)" />
                  {/* CLIPBOARD (Embrulhado em Fragment) */}
                  <ToolButton label="CLIPBOARD" svgPath={<><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></>} onClick={() => insertTag('[paste]')} color="var(--neon-cyan)" />
                </>
              )}
              <div style={{ width: '1px', background: 'rgba(255,255,255,0.2)', margin: '0 0.2rem' }}></div>
              
              {/* AGENTE (Embrulhado em Fragment) */}
              <ToolButton label="AGENTE" svgPath={<><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></>} onClick={() => insertTag('[agente]')} color="var(--neon-purple)" />
              
              {/* INPUT (Embrulhado em Fragment) */}
              <ToolButton label="INPUT" svgPath={<><path d="M12 19l7-7 3 3-7 7-3-3z"></path><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"></path><path d="M2 2l7.586 7.586"></path><circle cx="11" cy="11" r="2"></circle></>} onClick={() => { const tag = '[input:Título]'; if (textareaRef.current) { const start = textareaRef.current.selectionStart; const text = content; const newText = text.substring(0, start) + tag + text.substring(textareaRef.current.selectionEnd); setContent(newText); setTimeout(() => { if (textareaRef.current) { textareaRef.current.focus(); textareaRef.current.setSelectionRange(start + 7, start + 7 + 6); } }, 0); } }} color="var(--neon-pink)" />
              <div style={{ width: '1px', background: 'rgba(255,255,255,0.2)', margin: '0 0.2rem' }}></div>

              {/* DOM (Embrulhado em Fragment) */}
              <ToolButton label="DOM" svgPath={<><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></>} onClick={() => insertTag('[dom:.classe]')} color="#f59e0b" />
              
              <div style={{ position: 'relative' }}>
                {/* KEYPRESS (Embrulhado em Fragment) */}
                <ToolButton label="KEYPRESS" svgPath={<><rect x="2" y="4" width="20" height="16" rx="2" ry="2"></rect><line x1="6" y1="8" x2="6" y2="8"></line><line x1="10" y1="8" x2="10" y2="8"></line><line x1="14" y1="8" x2="14" y2="8"></line><line x1="18" y1="8" x2="18" y2="8"></line><line x1="6" y1="12" x2="6" y2="12"></line><line x1="10" y1="12" x2="10" y2="12"></line><line x1="14" y1="12" x2="14" y2="12"></line><line x1="18" y1="12" x2="18" y2="12"></line><line x1="6" y1="16" x2="18" y2="16"></line></>} onClick={() => setShowKeypressMenu(!showKeypressMenu)} color="var(--neon-cyan)" />
                {showKeypressMenu && (
                  <div style={{ position: 'absolute', bottom: '110%', left: 0, background: '#05050a', border: '1px solid var(--neon-cyan)', display: 'grid', gridTemplateColumns:'1fr 1fr', gap: '2px', padding: '4px', zIndex: 10, boxShadow: '0 0 15px rgba(0,243,255,0.3)', minWidth: '180px' }}>
                    {keysList.map(key => (
                      <button key={key} onClick={() => { insertTag(`[key:${key}]`); setShowKeypressMenu(false); }} style={{ background: 'rgba(0, 243, 255, 0.1)', border: 'none', color: '#fff', padding: '6px', cursor: 'pointer', fontFamily: 'JetBrains Mono', textAlign: 'center', fontSize: '0.7rem', textTransform: 'uppercase' }} className="hover-cyan">
                        {key}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              <div style={{ position: 'relative' }}>
                {/* WAIT (Embrulhado em Fragment) */}
                <ToolButton label="WAIT..." svgPath={<><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></>} onClick={() => setShowWaitMenu(!showWaitMenu)} color="var(--neon-pink)" />
                {showWaitMenu && (
                  <div style={{ position: 'absolute', bottom: '110%', left: 0, background: '#05050a', border: '1px solid var(--neon-pink)', display: 'flex', flexDirection: 'column', gap: '2px', padding: '4px', zIndex: 10, boxShadow: '0 0 15px rgba(255,0,85,0.3)', minWidth: '80px' }}>
                    {[1, 2, 3, 5].map(sec => (
                      <button key={sec} onClick={() => { insertTag(`[wait:${sec}]`); setShowWaitMenu(false); }} style={{ background: 'rgba(255, 0, 85, 0.1)', border: 'none', color: '#fff', padding: '6px', cursor: 'pointer', fontFamily: 'JetBrains Mono', textAlign: 'center', fontSize: '0.8rem' }} className="hover-pink">
                        {sec}s
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <textarea ref={textareaRef} className="cyber-input cyber-textarea" placeholder={appCategory === 'AI' ? "Digite o prompt para a IA... Use {selection} para o texto selecionado." : "Digite o texto da macro... Use [input:Nome] para variáveis."} value={content} onChange={e => setContent(e.target.value)} style={{ minHeight: '180px', fontFamily: 'monospace', fontSize: '0.9rem', lineHeight: '1.5' }} />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
            <button onClick={handleSave} disabled={loading} className="cyber-btn-main" style={{ minWidth: '150px' }}>{loading ? 'PROCESSING...' : (macroToEdit ? 'SAVE_CHANGES' : 'COMPILE_MACRO')}</button>
          </div>
        </div>
      </div>
      <style>{`.hover-pink:hover { background: var(--neon-pink) !important; color: #000 !important; } .hover-cyan:hover { background: var(--neon-cyan) !important; color: #000 !important; }`}</style>
    </div>
  );
}

function ToolButton({ label, svgPath, onClick, color }: any) {
  const finalColor = color || 'var(--neon-cyan)';
  return (
    <button onClick={onClick} title={`Inserir ${label}`} style={{ background: `rgba(0,0,0,0.3)`, border: `1px solid ${finalColor}`, color: finalColor, borderRadius: '2px', padding: '6px 10px', cursor: 'pointer', fontFamily: 'JetBrains Mono', fontSize: '0.7rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s', boxShadow: `0 0 5px ${finalColor}20` }} onMouseEnter={(e) => { const target = e.currentTarget as HTMLButtonElement; target.style.background = finalColor; target.style.color = '#000'; target.style.boxShadow = `0 0 15px ${finalColor}`; }} onMouseLeave={(e) => { const target = e.currentTarget as HTMLButtonElement; target.style.background = 'rgba(0,0,0,0.3)'; target.style.color = finalColor; target.style.boxShadow = `0 0 5px ${finalColor}20`; }}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        {svgPath}
      </svg>
      <span>{label}</span>
    </button>
  );
}