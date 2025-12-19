import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { useToast } from './ToastContext';

interface Props {
  snippet: any;
  userId: string;
  onDelete: () => void;
  onEdit: (snippet: any) => void;
  onProcessVariables: (snippet: any, variables: string[]) => void;
  onAddToKit: (id: string) => void;
  initialLikes: number;
  initialLiked: boolean;
  isInKit?: boolean;
}

export function SnippetCard({ snippet, userId, onDelete, onEdit, onProcessVariables, onAddToKit, initialLikes, initialLiked, isInKit }: Props) {
  const { addToast } = useToast();
  const [isCloning, setIsCloning] = useState(false);
  const [likesCount, setLikesCount] = useState(initialLikes);
  const [isLiked, setIsLiked] = useState(initialLiked);
  const [isLikeLoading, setIsLikeLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  // --- ADMIN LIST ---
  const ADMIN_IDS = ['8c0bdcd1-336a-4de9-bd64-7d87f1ee36f2', 'b3545b7e-8819-4728-a1ec-f991e1fd732d', 'b6b523ce-569a-4110-9906-8f04127a89a8'];
  const isAdmin = ADMIN_IDS.includes(snippet.user_id);

  useEffect(() => {
    if (deleteConfirm) {
      const timer = setTimeout(() => setDeleteConfirm(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [deleteConfirm]);

  // --- ACTIONS ---
  const handleCopy = () => {
    const textToCopy = snippet.text || '';
    const regex = /\[input:([^\]]+)\]/gi;
    const matches = Array.from(textToCopy.matchAll(regex));

    if (matches.length > 0) {
      const variables = [...new Set(matches.map(m => (m as any)[1]))];
      onProcessVariables(snippet, variables);
      return; 
    }

    navigator.clipboard.writeText(textToCopy)
      .then(() => addToast('COPIADO!', 'success'))
      .catch(() => addToast('ERRO AO COPIAR', 'error'));
  };

  const handleToggleLike = async () => {
    if (isLikeLoading) return;
    setIsLikeLoading(true);
    const newLikedState = !isLiked;
    setIsLiked(newLikedState);
    setLikesCount(prev => newLikedState ? prev + 1 : prev - 1);

    try {
      if (newLikedState) {
        await supabase.from('macro_likes').insert({ user_id: userId, macro_id: snippet.id });
      } else {
        await supabase.from('macro_likes').delete().eq('user_id', userId).eq('macro_id', snippet.id);
      }
    } catch (error) {
      setIsLiked(!newLikedState);
      setLikesCount(prev => !newLikedState ? prev + 1 : prev - 1);
      addToast('ERRO AO CURTIR', 'error');
    } finally {
      setIsLikeLoading(false);
    }
  };

  const handleClone = async () => {
    if (isCloning) return;
    setIsCloning(true);
    const { error } = await supabase.from('macros').insert({
      user_id: userId,
      title: `${snippet.name} (Copy)`,
      content: snippet.text,
      shortcut: snippet.shortcut ? `${snippet.shortcut}_copy` : '',
      app_category: snippet.app || 'TEXT',
      type: snippet.app === 'AI' ? 'ai' : 'text',
      is_public: false
    });

    if (error) { addToast('FALHA NA CLONAGEM', 'error'); } 
    else { addToast('MACRO COPIADA!', 'success'); }
    setIsCloning(false);
  };

  const handleDeleteClick = async () => {
    if (!deleteConfirm) { setDeleteConfirm(true); return; }
    const { error } = await supabase.from('macros').delete().eq('id', snippet.id);
    if (error) { addToast('ERRO AO DELETAR', 'error'); } 
    else { addToast('MACRO DELETADA', 'info'); onDelete(); }
  };

  // --- FORMAT DATE ---
  let formattedDate = '...'; 
  if (snippet.created_at) {
    try {
      const dateObj = new Date(String(snippet.created_at).replace(' ', 'T'));
      if (!isNaN(dateObj.getTime())) {
        formattedDate = dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
      }
    } catch (e) { }
  }

  const appType = (snippet.app || 'TEXT').toUpperCase();
  const cardClass = appType === 'AI' ? 'card-ai' : 'card-text';
  const isOwner = snippet.user_id === userId;
  const mainColor = appType === 'AI' ? 'var(--neon-pink)' : 'var(--neon-cyan)';

  // --- RENDERIZADOR DE TAGS (COM ÍCONES) ---
  const renderMessageContent = (text: string) => {
    const parts = text.split(/(\[.*?\]|\{.*?\})/g);

    return parts.map((part, index) => {
      // INPUT (Pen Icon)
      if (part.match(/^\[input:/i)) {
        const label = part.replace(/^\[input:|\]$/gi, '');
        return <TagBadge key={index} color="var(--neon-pink)" icon={<><path d="M12 19l7-7 3 3-7 7-3-3z"></path><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"></path><path d="M2 2l7.586 7.586"></path><circle cx="11" cy="11" r="2"></circle></>} label={label} />;
      }
      
      // WAIT (Clock Icon)
      if (part.match(/^\[wait/i)) {
        let time = '...';
        if (part.includes(':')) time = part.split(':')[1].replace(']', '') + 's';
        if (part.includes('+')) time = '+' + part.split('+')[1].replace(']', ''); 
        return <TagBadge key={index} color="var(--neon-pink)" icon={<><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></>} label={`WAIT ${time}`} />;
      }

      // AGENTE (User Icon)
      if (part.toLowerCase() === '[agente]') {
        return <TagBadge key={index} color="var(--neon-purple)" icon={<><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></>} label="AGENTE" />;
      }

      // PASTE (Clipboard Icon) - Amarelo
      if (part.toLowerCase() === '[paste]') {
        return <TagBadge key={index} color="#ffff00" icon={<><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></>} label="PASTE" />;
      }

      // CURSOR (I-Beam)
      if (part.toLowerCase() === '[cursor]') {
        return <TagBadge key={index} color="var(--neon-cyan)" icon={<path d="M5 3h14M5 21h14M12 3v18"/>} label="CURSOR" />;
      }

      // DOM (Code Icon)
      if (part.match(/^\[dom:/i)) {
        const selector = part.replace(/^\[dom:|\]$/gi, '');
        return <TagBadge key={index} color="#f59e0b" icon={<><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></>} label={`DOM: ${selector}`} />;
      }

      // KEYS (Keyboard Icon) - Exceto Enter
      if (part.match(/^\[key:/i) && !part.toLowerCase().includes('enter')) {
        const keyName = part.replace(/^\[key:|\]$/gi, '').toUpperCase();
        return <TagBadge key={index} color="var(--neon-cyan)" icon={<><rect x="2" y="4" width="20" height="16" rx="2" ry="2"/><line x1="6" y1="12" x2="18" y2="12"/></>} label={keyName} />;
      }

      // AI SELECTION (Sparkles)
      if (part.toLowerCase() === '{selection}') {
        return <TagBadge key={index} color="#a855f7" icon={<path d="M20 12v6M12 20h6M12 4H6M4 12V6M2 2L22 22M12 12l8-8M12 12L4 20" />} label="SELECTION" />;
      }

      // TEXTO NORMAL
      return <span key={index}>{part}</span>;
    });
  };

  const rawText = snippet.text || '';
  const chatBubbles = rawText.split(/\[key:enter\]/gi);

  return (
    <div className={`snippet-card ${cardClass}`} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      
      <style>{`
        /* --- CARD STYLES --- */
        .snippet-card {
          background: #000000;
          border: 1px solid #333;
          border-radius: 4px;
          position: relative;
          overflow: hidden;
          transition: all 0.2s ease;
        }
        
        .card-text { border-left: 3px solid var(--neon-cyan) !important; }
        .card-ai { border-left: 3px solid var(--neon-pink) !important; }

        .card-text:hover { border-color: var(--neon-cyan); box-shadow: 0 0 15px rgba(0, 243, 255, 0.1); }
        .card-ai:hover { border-color: var(--neon-pink); box-shadow: 0 0 15px rgba(255, 0, 255, 0.1); }

        /* --- BOTÕES (FIXED HOVER) --- */
        .cyber-action-btn {
          display: flex; align-items: center; gap: 6px;
          padding: 6px 10px; border-radius: 2px;
          font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; font-weight: bold;
          cursor: pointer; transition: all 0.2s;
          background: rgba(255,255,255,0.03); 
          border: 1px solid #444; 
          color: #888;
        }
        .cyber-action-btn svg { width: 14px; height: 14px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; transition: all 0.2s; }

        /* KIT (Verde) */
        .btn-kit { border-color: #00ff00; color: #00ff00; }
        .btn-kit:hover, .btn-kit.active { background: #00ff00; color: #000; box-shadow: 0 0 15px #00ff00; border-color: #00ff00; }

        /* COPY (Ciano) */
        .btn-copy { border-color: var(--neon-cyan); color: var(--neon-cyan); }
        .btn-copy:hover { background: var(--neon-cyan); color: #000; box-shadow: 0 0 15px var(--neon-cyan); border-color: var(--neon-cyan); }

        /* LIKE (Rosa) */
        .btn-like { border-color: var(--neon-pink); color: var(--neon-pink); }
        .btn-like:hover, .btn-like.active { background: var(--neon-pink); color: #000; box-shadow: 0 0 15px var(--neon-pink); border-color: var(--neon-pink); }

        /* EDIT (Amarelo) */
        .btn-edit { border-color: #ffff00; color: #ffff00; }
        .btn-edit:hover { background: #ffff00; color: #000; box-shadow: 0 0 15px #ffff00; border-color: #ffff00; }

        /* DELETE (Vermelho) */
        .btn-delete { border-color: #ff2a2a; color: #ff2a2a; }
        .btn-delete:hover { background: #ff2a2a; color: #000; box-shadow: 0 0 15px #ff2a2a; border-color: #ff2a2a; }

        /* --- TAGS & BUBBLES --- */
        .tag-badge { 
          display: inline-flex; align-items: center; gap: 4px; padding: 2px 6px; 
          border-radius: 2px; font-family: 'JetBrains Mono', monospace; font-size: 0.7rem; font-weight: bold; 
          background: #000; border: 1px solid; margin: 0 2px; vertical-align: middle; 
          white-space: nowrap; /* IMPEDE QUEBRA DE LINHA */
        }
        .tag-badge svg { width: 10px; height: 10px; stroke-width: 2.5; }
        
        .chat-bubble { background: #0a0a0a; border: 1px solid #222; padding: 10px; margin-bottom: 8px; font-family: monospace; font-size: 0.85rem; color: #ccc; border-radius: 4px; position: relative; }
      `}</style>

      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
        <h3 className="snippet-name" style={{ margin: 0, color: '#fff', textTransform:'uppercase', letterSpacing:'1px', textShadow: '0 0 10px rgba(0,0,0,0.5)' }}>{snippet.name}</h3>
        {snippet.shortcut && <span className="snippet-shortcut" style={{background:'#000', border:`1px solid ${mainColor}`, color:mainColor, borderRadius:'2px', fontSize:'0.75rem', padding:'2px 6px', fontWeight:'bold', boxShadow:`0 0 5px ${mainColor}20`}}>{snippet.shortcut}</span>}
      </div>

      {/* BADGES SUPERIORES */}
      <div style={{ marginBottom: '0.5rem', display:'flex', gap:'8px', alignItems:'center' }}>
        <span style={{ fontSize: '0.7rem', fontWeight: 'bold', padding: '2px 6px', borderRadius:'2px', background: '#000', color: appType === 'AI' ? '#a855f7' : 'var(--neon-cyan)', border: `1px solid ${appType === 'AI' ? '#a855f7' : 'var(--neon-cyan)'}` }}>
          {appType === 'AI' ? 'AI' : 'TXT'}
        </span>
        {!snippet.is_public && (
          <span style={{ fontSize: '0.7rem', fontWeight: 'bold', padding: '2px 6px', borderRadius:'2px', background: '#000', color: 'var(--neon-pink)', border: '1px solid var(--neon-pink)', display:'flex', alignItems:'center', gap:'4px' }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg> LOCKED
          </span>
        )}
      </div>

      <div style={{ fontFamily: 'JetBrains Mono', fontSize: '0.75rem', color: '#888', marginBottom: '1rem', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span>DEV_ID: <span style={{ color: '#aaa' }}>{snippet.author}</span></span>
        {isAdmin && <span style={{ border: '1px solid #ffd700', color: '#ffd700', background: '#000', padding: '2px 6px', fontSize: '0.65rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '3px' }}><svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg> OFICIAL</span>}
      </div>

      {/* CONTEÚDO (CHAT) */}
      <div className="snippet-content" style={{ flex: 1, marginBottom: '1rem', cursor: 'pointer' }} onClick={handleCopy} title="Clique para copiar">
        <div className="chat-container">
          {chatBubbles.map((msg: string, idx: number) => {
            const isLast = idx === chatBubbles.length - 1;
            if (isLast && msg === '' && chatBubbles.length > 1) return null;
            
            return (
              <div key={idx} className="chat-message">
                <div className="chat-bubble">
                  {renderMessageContent(msg)}
                  {!isLast && (
                    <div style={{ marginTop: '6px', opacity: 0.9, display:'flex', justifyContent:'flex-end' }}>
                      <TagBadge color="var(--neon-cyan)" icon={<><rect x="2" y="4" width="20" height="16" rx="2" ry="2"/><line x1="6" y1="12" x2="18" y2="12"/></>} label="ENTER" />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ textAlign: 'center', marginTop: '0.5rem', opacity: 0.5, fontSize: '0.7rem', color: 'var(--neon-cyan)' }}>[ CLIQUE PARA COPIAR ]</div>
      </div>

      {/* FOOTER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.75rem', borderTop: '1px solid #222', marginTop: 'auto' }}>
        <span style={{ fontFamily: 'monospace', fontSize: '0.7rem', color: '#666' }}>{formattedDate}</span>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={() => onAddToKit(snippet.id)} className={`cyber-action-btn btn-kit ${isInKit ? 'active' : ''}`} title={isInKit ? "Gerenciar Kits" : "Adicionar a um Kit"}>
            <svg viewBox="0 0 24 24" style={{ fill: isInKit ? 'currentColor' : 'none' }}            >
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
            </svg>
            {isInKit ? 'SAVED' : 'KIT'}
          </button>
          {!isOwner && (
            <button onClick={handleClone} disabled={isCloning} className="cyber-action-btn btn-copy" title="Copiar Macro">
              <svg viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2-2v1"></path></svg>
              {isCloning ? '...' : 'COPY'}
            </button>
          )}
          <button onClick={handleToggleLike} className={`cyber-action-btn btn-like ${isLiked ? 'active' : ''}`}>
            <svg viewBox="0 0 24 24" style={{fill: isLiked ? 'currentColor' : 'none'}}><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
            {likesCount}
          </button>
          {isOwner && (
            <>
              <button onClick={() => onEdit(snippet)} className="cyber-action-btn btn-edit" title="Editar">
                <svg viewBox="0 0 24 24"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
              </button>
              <button onClick={handleDeleteClick} className="cyber-action-btn btn-delete" title="Deletar">
                {deleteConfirm ? 'CONFIRM?' : '✕'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// TAG BADGE (COM WHITE-SPACE: NOWRAP)
function TagBadge({ icon, label, color }: any) {
  return (
    <span className="tag-badge" style={{ borderColor: color, color: color }}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        {icon}
      </svg>
      {label}
    </span>
  );
}