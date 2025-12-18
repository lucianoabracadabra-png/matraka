import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { useToast } from './ToastContext';

interface Props {
  snippet: any;
  userId: string;
  onDelete: () => void;
  onEdit: (snippet: any) => void;
  initialLikes: number;
  initialLiked: boolean;
  onAddToKit: (id: string) => void; 
}

export function SnippetCard({ snippet, userId, onDelete, onEdit, onProcessVariables, onAddToKit, initialLikes, initialLiked }: Props) {  const { addToast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCloning, setIsCloning] = useState(false);
  const [likesCount, setLikesCount] = useState(initialLikes);
  const [isLiked, setIsLiked] = useState(initialLiked);
  const [isLikeLoading, setIsLikeLoading] = useState(false);

  // --- NOVO: Estado para confirmação de Delete ---
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  // Reseta o botão de confirmar após 3 segundos se o usuário não clicar
  useEffect(() => {
    if (deleteConfirm) {
      const timer = setTimeout(() => setDeleteConfirm(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [deleteConfirm]);

  // --- UTILS ---
  const decodeHtml = (html: string | undefined) => {
    if (!html) return '';
    const txt = document.createElement('textarea');
    txt.innerHTML = html;
    return txt.value;
  };

const applyDynamicTranslations = (text: string) => {
    if (!text) return '';
    let newText = text;
    
    // --- TAGS COMPLEXAS (LEGADO) ---
    newText = newText.replace(/\{site:\s*text;\s*page=[^;]+;\s*selector=\.customer-name\}/gi, '<span class="macro-tag tag-client">[Cliente]</span>');
    // ... (mantenha as outras regex antigas se quiser) ...

    // --- NOVAS TAGS SIMPLIFICADAS (BARRA DE FERRAMENTAS) ---
    newText = newText.replace(/\{client\}/gi, '<span class="macro-tag tag-client">[Cliente]</span>');
    newText = newText.replace(/\{agent\}/gi, '<span class="macro-tag tag-theme">[Agente]</span>');
    newText = newText.replace(/\{cursor\}/gi, '<span class="macro-tag tag-cursor">[Cursor]</span>');
    newText = newText.replace(/\{clipboard\}/gi, '<span class="macro-tag tag-clipboard">[Ctrl+V]</span>');
    newText = newText.replace(/\{date\}/gi, '<span class="macro-tag tag-wait">[Data Hoje]</span>');
    newText = newText.replace(/\{key:enter\}/gi, '<span class="macro-tag tag-wait">[Enter]</span>'); // Opcional, se não quebrar linha
    
    // Regex melhorada para o Wait (aceita {wait:5s} ou {wait: delay=5})
    newText = newText.replace(/\{wait:\s*(\w+)\}/gi, '<span class="macro-tag tag-wait">[Aguarde $1]</span>');
    newText = newText.replace(/\{wait:\s*delay=\+?(\w+)\}/gi, '<span class="macro-tag tag-wait">[Aguarde $1]</span>');

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

  // --- ACTIONS ---
  
  const handleCopy = () => {
    const textToCopy = decodeHtml(snippet.text);
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
    // Aqui ainda mantemos o confirm nativo por ser uma ação de criação complexa? 
    // Ou podemos usar o mesmo esquema de clique duplo. Vamos manter simples por enquanto.
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

  // --- LÓGICA DE DELETAR COM BOTÃO DUPLO ---
  const handleDeleteClick = async () => {
    // 1. Se ainda não confirmou, ativa o modo de confirmação e para por aqui
    if (!deleteConfirm) {
      setDeleteConfirm(true);
      return; 
    }

    // 2. Se já estava confirmando (clicou pela 2ª vez), deleta de verdade
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

  // --- RENDER ---
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
      {/* HEADER CARD */}
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

      {/* BODY CLICÁVEL (COPIAR) */}
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

      {/* FOOTER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.1)', marginTop: 'auto' }}>
        <span style={{ fontFamily: 'monospace', fontSize: '0.7rem', color: '#64748b' }}>{formattedDate}</span>
        
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {/* FORK */}
          {!isOwner && (
            <button onClick={handleClone} disabled={isCloning} style={{ background: 'rgba(0, 243, 255, 0.1)', border: '1px solid var(--neon-cyan)', color: 'var(--neon-cyan)', cursor: 'pointer', padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontFamily: 'JetBrains Mono', display: 'flex', alignItems: 'center', gap: '4px' }} title="FORK">
              {isCloning ? '...' : <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2-2v1"></path></svg></>}
            </button>
          )}

          {/* LIKE */}
          <button onClick={handleToggleLike} style={{ background: 'rgba(30, 41, 59, 0.5)', border: `1px solid ${isLiked ? '#ec4899' : '#475569'}`, color: isLiked ? '#ec4899' : '#94a3b8', cursor: 'pointer', padding: '4px 8px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem' }}>
            <span>{isLiked ? '❤️' : '🤍'}</span><span style={{ fontFamily: 'JetBrains Mono' }}>{likesCount}</span>
          </button>

          {/* EDIT & DELETE (Só para donos) */}
          {isOwner && (
            <>
              <button onClick={() => onEdit(snippet)} style={{ background: 'rgba(255, 255, 0, 0.1)', border: '1px solid rgba(255, 255, 0, 0.5)', color: '#ffff00', cursor: 'pointer', padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem' }} title="EDIT">
                ✎
              </button>
              
              {/* BOTÃO DE DELETAR INTELIGENTE */}
              <button 
                onClick={handleDeleteClick} 
                style={{ 
                  background: deleteConfirm ? 'rgba(255, 0, 0, 0.3)' : 'rgba(255, 0, 0, 0.1)', 
                  border: deleteConfirm ? '1px solid #ff0000' : '1px solid rgba(255, 0, 0, 0.5)', 
                  color: deleteConfirm ? '#fff' : '#ff5555', 
                  cursor: 'pointer', 
                  padding: '4px 8px', 
                  borderRadius: '4px', 
                  fontSize: '0.75rem',
                  fontWeight: deleteConfirm ? 'bold' : 'normal',
                  transition: 'all 0.2s'
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