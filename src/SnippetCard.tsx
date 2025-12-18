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
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCloning, setIsCloning] = useState(false);
  const [likesCount, setLikesCount] = useState(initialLikes);
  const [isLiked, setIsLiked] = useState(initialLiked);
  const [isLikeLoading, setIsLikeLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  useEffect(() => {
    if (deleteConfirm) {
      const timer = setTimeout(() => setDeleteConfirm(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [deleteConfirm]);

  const decodeHtml = (html: string | undefined) => {
    if (!html) return '';
    const txt = document.createElement('textarea');
    txt.innerHTML = html;
    return txt.value;
  };

  const applyDynamicTranslations = (text: string) => {
    if (!text) return '';
    let newText = text;
    newText = newText.replace(/\{client\}/gi, '<span class="macro-tag tag-client">[Cliente]</span>');
    newText = newText.replace(/\{agent\}/gi, '<span class="macro-tag tag-theme">[Agente]</span>');
    newText = newText.replace(/\{cursor\}/gi, '<span class="macro-tag tag-cursor">[Cursor]</span>');
    newText = newText.replace(/\{clipboard\}/gi, '<span class="macro-tag tag-clipboard">[Ctrl+V]</span>');
    newText = newText.replace(/\{date\}/gi, '<span class="macro-tag tag-wait">[Data]</span>');
    newText = newText.replace(/\{key:enter\}/gi, '<span class="macro-tag tag-wait">[Enter]</span>');
    newText = newText.replace(/\{wait:\s*(\w+)\}/gi, '<span class="macro-tag tag-wait">[Wait $1]</span>');
    newText = newText.replace(/\{input:([a-zA-Z0-9_\s]+)\}/gi, '<span class="macro-tag" style="border-color:var(--neon-pink); color:var(--neon-pink)">[Input: $1]</span>');
    return newText;
  };

  const formatAsChat = (rawText: string) => {
    if (!rawText) return [];
    const messages = rawText.split(/\{key:\s*enter\}/gi);
    return messages.map((msg) => {
      if (!msg.trim()) return null;
      let processedContent = applyDynamicTranslations(msg);
      processedContent = processedContent.replace(/\n/g, '<br>');
      return processedContent;
    }).filter(Boolean);
  };

  const handleCopy = () => {
    const textToCopy = decodeHtml(snippet.text);
    const regex = /\{input:([a-zA-Z0-9_\s]+)\}/gi;
    const matches = Array.from(textToCopy.matchAll(regex));

    if (matches.length > 0) {
      const variables = [...new Set(matches.map(m => m[1]))];
      onProcessVariables(snippet, variables);
      return; 
    }

    navigator.clipboard.writeText(textToCopy)
      .then(() => addToast('COPIADO PARA O CLIPBOARD!', 'success'))
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
      type: 'text',
      is_public: false
    });

    if (error) {
      addToast('FALHA NA CLONAGEM: ' + error.message, 'error');
    } else {
      addToast('MACRO CLONADA COM SUCESSO!', 'success');
      onDelete(); 
    }
    setIsCloning(false);
  };

  const handleDeleteClick = async () => {
    if (!deleteConfirm) {
      setDeleteConfirm(true);
      return; 
    }
    setIsDeleting(true);
    const { error } = await supabase.from('macros').delete().eq('id', snippet.id);
    if (error) {
      addToast('ERRO AO DELETAR: ' + error.message, 'error');
      setIsDeleting(false);
    } else {
      addToast('MACRO DELETADA.', 'info');
      onDelete();
    }
  };

  let formattedDate = '...'; 
  if (snippet.created_at) {
    try {
      const safeDateString = String(snippet.created_at).replace(' ', 'T');
      const dateObj = new Date(safeDateString);
      if (!isNaN(dateObj.getTime())) {
        formattedDate = dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
      }
    } catch (e) { }
  }

  const rawDecodedText = decodeHtml(snippet.text);
  const chatMessages = formatAsChat(rawDecodedText);
  const appType = (snippet.app || 'TEXT').toUpperCase();
  const cardClass = appType === 'AI' ? 'card-ai' : 'card-text';
  const isOwner = snippet.user_id === userId;

  return (
    <div className={`snippet-card ${cardClass}`} style={{ opacity: isDeleting ? 0.5 : 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
        <h3 className="snippet-name" style={{ margin: 0 }}>{snippet.name}</h3>
        {snippet.shortcut && <span className="snippet-shortcut">{snippet.shortcut}</span>}
      </div>

      <div style={{ marginBottom: '0.5rem' }}>
        <span style={{ fontSize: '0.7rem', fontWeight: 'bold', padding: '2px 6px', borderRadius: '4px', background: appType === 'AI' ? 'rgba(255, 0, 255, 0.1)' : 'rgba(0, 243, 255, 0.1)', color: appType === 'AI' ? 'var(--neon-pink)' : 'var(--neon-cyan)', border: `1px solid ${appType === 'AI' ? 'var(--neon-pink)' : 'var(--neon-cyan)'}` }}>
          {appType} MODE
        </span>
      </div>

      <div style={{ fontFamily: 'JetBrains Mono', fontSize: '0.75rem', color: '#64748b', marginBottom: '1rem', textTransform: 'uppercase' }}>
        DEV_ID: <span style={{ color: '#94a3b8' }}>{snippet.author}</span>
      </div>

      <div 
        className="snippet-content" 
        style={{ flex: 1, marginBottom: '1rem', cursor: 'pointer' }}
        onClick={handleCopy}
        title="Clique para copiar"
      >
        <div className="chat-container">
          {chatMessages.map((msgHtml, msgIdx) => (
             msgHtml && <div key={msgIdx} className="chat-message"><div className="chat-bubble" dangerouslySetInnerHTML={{ __html: msgHtml }} /></div>
          ))}
        </div>
        <div style={{ textAlign: 'center', marginTop: '0.5rem', opacity: 0.5, fontSize: '0.7rem', color: 'var(--neon-cyan)' }}>
          [ CLIQUE PARA COPIAR ]
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.1)', marginTop: 'auto' }}>
        <span style={{ fontFamily: 'monospace', fontSize: '0.7rem', color: '#64748b' }}>{formattedDate}</span>
        
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          
          <button 
            onClick={() => onAddToKit(snippet.id)}
            style={{ 
              background: isInKit ? 'rgba(0, 255, 0, 0.1)' : 'rgba(255, 255, 255, 0.05)', 
              border: isInKit ? '1px solid #00ff00' : '1px solid #666', 
              color: isInKit ? '#00ff00' : '#fff', 
              cursor: 'pointer', padding: '4px 8px', borderRadius: '4px', 
              fontSize: '0.75rem', fontFamily: 'JetBrains Mono',
              display: 'flex', alignItems: 'center', gap: '4px'
            }} 
            title={isInKit ? "Gerenciar Kits (Adicionado)" : "Adicionar a um Kit"}
          >
            {isInKit ? '✓ KIT' : '+ KIT'}
          </button>

          {!isOwner && (
            <button 
              onClick={handleClone} 
              disabled={isCloning} 
              style={{ 
                background: 'rgba(0, 243, 255, 0.1)', 
                border: '1px solid var(--neon-cyan)', 
                color: 'var(--neon-cyan)', 
                cursor: 'pointer', 
                padding: '4px 8px', 
                borderRadius: '4px', 
                fontSize: '0.75rem', 
                fontFamily: 'JetBrains Mono', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '4px' 
              }} 
              title="FORK"
            >
              {isCloning ? '...' : <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2-2v1"></path></svg></>}
            </button>
          )}

          <button onClick={handleToggleLike} style={{ background: 'rgba(30, 41, 59, 0.5)', border: `1px solid ${isLiked ? '#ec4899' : '#475569'}`, color: isLiked ? '#ec4899' : '#94a3b8', cursor: 'pointer', padding: '4px 8px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem' }}>
            <span>{isLiked ? '❤️' : '🤍'}</span><span style={{ fontFamily: 'JetBrains Mono' }}>{likesCount}</span>
          </button>

          {isOwner && (
            <>
              <button onClick={() => onEdit(snippet)} style={{ background: 'rgba(255, 255, 0, 0.1)', border: '1px solid rgba(255, 255, 0, 0.5)', color: '#ffff00', cursor: 'pointer', padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem' }} title="EDIT">
                ✎
              </button>
              
              {/* BOTÃO DELETE CORRIGIDO PARA USAR PINK AO INVÉS DE RED */}
              <button 
                onClick={handleDeleteClick} 
                className="btn-delete-neon"
                style={{ 
                  borderRadius: '4px', padding: '4px 8px', fontSize: '0.75rem', 
                  fontFamily: 'JetBrains Mono', cursor: 'pointer',
                  fontWeight: deleteConfirm ? 'bold' : 'normal',
                  // Se estiver confirmando, fica rosa sólido com texto preto
                  background: deleteConfirm ? 'var(--neon-pink)' : undefined,
                  color: deleteConfirm ? '#000' : undefined
                }} 
                title="DELETE"
              >
                {deleteConfirm ? 'CONFIRM?' : '✕'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}