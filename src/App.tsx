import { useEffect, useState, useCallback } from 'react';
import { supabase } from './supabaseClient';
import { Auth } from './Auth';
import { CreateMacroModal } from './CreateMacroModal';
import { SnippetCard } from './SnippetCard';
import { ProfileModal } from './ProfileModal';
import { InputVariableModal } from './InputVariableModal';
import { AddToKitModal } from './AddToKitModal';
import { useToast } from './ToastContext';
import type { Session } from '@supabase/supabase-js';
import './index.css';

interface Snippet { id: string; user_id: string; name: string; shortcut?: string; text?: string; app?: string; sourceFile: string; folderName: string; likes_count: number; liked_by_me: boolean; author: string; created_at: string; is_public: boolean; }
interface Kit { id: string; name: string; }

function App() {
  const { addToast } = useToast();
  
  const [activeTab, setActiveTab] = useState('ALL'); 
  const [selectedKitId, setSelectedKitId] = useState<string | null>(null);
  const [showAI, setShowAI] = useState(true);
  const [showText, setShowText] = useState(true);

  const [session, setSession] = useState<Session | null>(null);
  const [allSnippets, setAllSnippets] = useState<Snippet[]>([]);
  const [filteredSnippets, setFilteredSnippets] = useState<Snippet[]>([]);
  const [myKits, setMyKits] = useState<Kit[]>([]); 
  const [kitItems, setKitItems] = useState<Record<string, Set<string>>>({}); 

  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [myUsername, setMyUsername] = useState('Loading...');
  
  const [kitDeleteConfirm, setKitDeleteConfirm] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [macroToEdit, setMacroToEdit] = useState<Snippet | null>(null);
  const [isInputModalOpen, setIsInputModalOpen] = useState(false);
  const [varsToProcess, setVarsToProcess] = useState<string[]>([]);
  const [macroToProcess, setMacroToProcess] = useState<Snippet | null>(null);
  const [isAddToKitOpen, setIsAddToKitOpen] = useState(false);
  const [macroIdToAdd, setMacroIdToAdd] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchUserProfile(session.user.id);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchUserProfile(session.user.id);
    });
    return () => subscription.unsubscribe();
  }, []);

// DEEP LINK: Verifica se a URL pede para abrir o perfil
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('profile') === 'true') {
      setIsProfileOpen(true);
      
      // Opcional: Limpa a URL para não reabrir se o usuário der F5
      // window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  useEffect(() => {
    if (kitDeleteConfirm) {
      const timer = setTimeout(() => setKitDeleteConfirm(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [kitDeleteConfirm]);

  const fetchUserProfile = async (userId: string) => {
    const { data } = await supabase.from('profiles').select('username, email').eq('id', userId).single();
    if (data) setMyUsername(data.username || data.email?.split('@')[0] || 'Unknown');
  };

const handleLogout = async () => {
    try {
      // 1. Kill-Session no Servidor
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      // 2. Limpeza Local "Bruta" (Garante que o navegador esqueça tudo)
      localStorage.removeItem('sb-nvzdtryzpbrkvggjtbiy-auth-token'); 

      // 3. Atualiza estado da aplicação
      setSession(null);
      setAllSnippets([]);
      addToast('SYSTEM DISCONNECTED', 'info');

    } catch (error: any) { // <--- A CORREÇÃO ESTÁ AQUI: (error: any)
      console.error("Erro ao fazer logout:", error.message || error);
      // Mesmo com erro, forçamos a limpeza visual
      setSession(null);
      setAllSnippets([]);
    }
  };

  const fetchMacros = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    
    const { data: macrosData, error: macrosError } = await supabase
      .from('macros')
      .select('*, macro_likes(count), profiles!macros_user_id_fkey(username, email)')
      .order('created_at', { ascending: false });

    const { data: myLikesData } = await supabase.from('macro_likes').select('macro_id').eq('user_id', session.user.id);
    const { data: kitsData } = await supabase.from('kits').select('*').eq('user_id', session.user.id).order('created_at');
    const { data: itemsData } = await supabase.from('kit_items').select('kit_id, macro_id');

    if (macrosError) {
      addToast('CONNECTION FAILED', 'error');
    } else if (macrosData) {
      const myLikedIds = new Set(myLikesData?.map((l: any) => l.macro_id) || []);

      const mappedSnippets: Snippet[] = macrosData.map((macro: any) => ({
        id: macro.id,
        user_id: macro.user_id,
        name: macro.title,
        text: macro.content,
        shortcut: macro.shortcut,
        app: macro.app_category || 'TEXT',
        sourceFile: 'Geral', 
        folderName: 'Todas as Macros',
        likes_count: macro.macro_likes?.[0]?.count || 0,
        liked_by_me: myLikedIds.has(macro.id),
        author: macro.profiles?.username || macro.profiles?.email?.split('@')[0] || 'Unknown',
        created_at: macro.created_at,
        is_public: macro.is_public
      }));
      
      setAllSnippets(mappedSnippets);
      if (kitsData) setMyKits(kitsData);
      
      const itemsMap: Record<string, Set<string>> = {};
      if (kitsData) kitsData.forEach((k: Kit) => itemsMap[k.id] = new Set());
      if (itemsData) itemsData.forEach((item: any) => {
          if (itemsMap[item.kit_id]) itemsMap[item.kit_id].add(item.macro_id);
      });
      setKitItems(itemsMap);
    }
    setLoading(false);
  }, [session, addToast]);

  useEffect(() => {
    fetchMacros();
  }, [fetchMacros]);

  const handleEdit = (snippet: Snippet) => { setMacroToEdit(snippet); setIsModalOpen(true); };
  const handleCreateNew = () => { setMacroToEdit(null); setIsModalOpen(true); };
  
  const handleProcessVariables = (snippet: Snippet, variables: string[]) => {
    setMacroToProcess(snippet);
    setVarsToProcess(variables);
    setIsInputModalOpen(true);
  };

  const handleAddToKit = (id: string) => {
    setMacroIdToAdd(id);
    setIsAddToKitOpen(true);
  };

  const handleKitAction = async (kitId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    
    if (kitDeleteConfirm === kitId) {
      const { error } = await supabase.from('kits').delete().eq('id', kitId);
      if (error) {
        addToast('ERRO AO DELETAR KIT', 'error');
      } else {
        addToast('KIT REMOVIDO', 'info');
        fetchMacros();
        if (selectedKitId === kitId) setSelectedKitId(null);
      }
      setKitDeleteConfirm(null);
    } else {
      setKitDeleteConfirm(kitId);
    }
  };

  const isMacroInAnyKit = (macroId: string) => Object.values(kitItems).some(set => set.has(macroId));
  const getMacroKits = (macroId: string | null) => {
    if (!macroId) return [];
    return Object.keys(kitItems).filter(kitId => kitItems[kitId].has(macroId));
  };

  useEffect(() => {
    const term = searchTerm.toLowerCase();
    
    let filtered = allSnippets.filter(snippet => 
      (snippet.name && snippet.name.toLowerCase().includes(term)) ||
      (snippet.shortcut && snippet.shortcut.toLowerCase().includes(term)) ||
      (snippet.text && snippet.text?.toLowerCase().includes(term)) ||
      (snippet.author && snippet.author.toLowerCase().includes(term))
    );

    filtered = filtered.filter(s => s.user_id === session?.user.id || s.is_public);

    if (activeTab === 'MINE') filtered = filtered.filter(s => s.user_id === session?.user.id);
    else if (activeTab === 'FAVS') filtered = filtered.filter(s => s.liked_by_me);
    else if (activeTab === 'KITS') {
      if (selectedKitId && kitItems[selectedKitId]) filtered = filtered.filter(s => kitItems[selectedKitId].has(s.id));
      else filtered = filtered.filter(s => s.user_id === session?.user.id);
    }

    filtered = filtered.filter(s => {
      const isAI = s.app === 'AI';
      const isText = s.app === 'TEXT' || !s.app; 
      if (isAI && !showAI) return false;
      if (isText && !showText) return false;
      return true;
    });

    setFilteredSnippets(filtered);
  }, [searchTerm, allSnippets, activeTab, selectedKitId, showAI, showText, session, kitItems]);

  const groupedSnippets = filteredSnippets.reduce((groups, snippet) => {
    const file = snippet.sourceFile;
    if (!groups[file]) groups[file] = [];
    groups[file].push(snippet);
    return groups;
  }, {} as Record<string, Snippet[]>);

  if (!session) return <div className="container" style={{display:'flex',justifyContent:'center', alignItems:'center', height:'100vh'}}><Auth /></div>;

  return (
    <>
      <div className="cyber-grid"></div>
      <div className="cyber-glow"></div>

      <div className="container">
        
        <div className="header">
          <div className="header-top" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
              <div style={{ width: '64px', height: '64px', background: 'rgba(5, 5, 10, 0.8)', border: '1px solid var(--neon-cyan)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 20px rgba(0, 243, 255, 0.2)', transform: 'skewX(-10deg)', position: 'relative', flexShrink: 0 }}>
                <div style={{ position: 'absolute', top: '-1px', right: '-1px', width: '10px', height: '10px', background: 'var(--neon-pink)', clipPath: 'polygon(0 0, 100% 0, 100% 100%)' }}></div>
                <svg width="42" height="42" viewBox="0 0 100 100" fill="none" strokeWidth="2" style={{ transform: 'skewX(10deg)' }}>
                  <path d="M30 30 L60 30 L90 50 L60 60 L60 80 L30 70 Z" stroke="var(--neon-cyan)" fill="rgba(0, 243, 255, 0.1)" strokeLinejoin="round" />
                  <path d="M55 40 L65 40 L60 50 Z" fill="var(--neon-pink)" stroke="none" />
                  <path d="M10 50 L40 50 L50 60" stroke="var(--neon-purple)" strokeWidth="3" strokeLinecap="round" />
                  <path d="M30 85 L70 85" stroke="var(--neon-cyan)" strokeDasharray="2 4" />
                </svg>
              </div>
              <div>
                <h1 className="title-glitch" data-text="MATRAKA" style={{ margin: 0, lineHeight: 1 }}>MATRAKA</h1>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginTop: '0.5rem' }}>
                    <button 
                      onClick={() => setIsProfileOpen(true)}
                      className="user-btn"
                      title="Edit Profile"
                      style={{ 
                        background: 'none', border: 'none', cursor: 'pointer', 
                        fontFamily: 'JetBrains Mono', fontSize: '1rem', color: '#fff',
                        padding: 0, textAlign: 'left', display: 'flex', alignItems: 'center', gap: '5px'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.color = 'var(--neon-cyan)'}
                      onMouseLeave={(e) => e.currentTarget.style.color = '#fff'}
                    >
                      USER: <span style={{color: '#9ca3af', fontWeight:'bold', textDecoration: 'underline', textDecorationColor: 'rgba(255,255,255,0.3)'}}>{myUsername}</span>
                      <span style={{fontSize:'0.8rem', opacity: 0.5}}>✎</span>
                    </button>
                    <button onClick={handleLogout} className="btn-logout">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                      LOGOUT
                    </button>
                </div>
              </div>
            </div>
            <button onClick={handleCreateNew} className="btn-create" title="Nova Macro" style={{ flexShrink: 0 }}>+</button>
          </div>

          <div className="search-box" style={{ marginTop: '2rem', position: 'relative' }}>
             <input type="text" className="search-input" placeholder="SEARCH_DATABASE..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginTop: '1.5rem', borderBottom: '1px solid #333', paddingBottom: '0.5rem' }}>
            <div style={{ display: 'flex', gap: '1rem', overflowX: 'auto' }}>
              {['ALL', 'MINE', 'FAVS', 'KITS'].map((tab) => {
                const isActive = activeTab === tab;
                return (
                  <button key={tab} onClick={() => { setActiveTab(tab); if(tab !== 'KITS') setSelectedKitId(null); }} 
                    style={{ background: isActive ? 'var(--neon-cyan)' : 'transparent', color: isActive ? '#000' : 'var(--neon-cyan)', border: 'none', padding: '0.5rem 1rem', cursor: 'pointer', fontWeight: 'bold', fontFamily: 'JetBrains Mono', clipPath: 'polygon(10% 0, 100% 0, 90% 100%, 0% 100%)' }}>
                    {tab}
                  </button>
                )
              })}
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button onClick={() => setShowAI(!showAI)} style={{ border: `1px solid ${showAI ? 'var(--neon-pink)' : '#444'}`, color: showAI ? 'var(--neon-pink)' : '#666', background: showAI ? '#000' : 'transparent', padding: '0.3rem 0.8rem', cursor: 'pointer', fontFamily: 'JetBrains Mono', fontSize: '0.8rem', borderRadius:'2px', boxShadow: showAI ? '0 0 10px rgba(255,0,255,0.2)' : 'none' }}>AI_MODE</button>
              <button onClick={() => setShowText(!showText)} style={{ border: `1px solid ${showText ? 'var(--neon-cyan)' : '#444'}`, color: showText ? 'var(--neon-cyan)' : '#666', background: showText ? '#000' : 'transparent', padding: '0.3rem 0.8rem', cursor: 'pointer', fontFamily: 'JetBrains Mono', fontSize: '0.8rem', borderRadius:'2px', boxShadow: showText ? '0 0 10px rgba(0,243,255,0.2)' : 'none' }}>TXT_MODE</button>
            </div>
          </div>

          {activeTab === 'KITS' && (
              <div className="kits-container">
                  <button onClick={() => setIsAddToKitOpen(true)} className="btn-add-kit">
                    + NEW KIT
                  </button>
                  
                  {myKits.map(kit => {
                    const isActive = selectedKitId === kit.id;
                    const isDeleting = kitDeleteConfirm === kit.id;
                    
                    return (
                      <div 
                        key={kit.id} 
                        className={`kit-tab ${isActive ? 'active' : ''}`}
                        style={isDeleting ? {
                          borderColor: 'var(--neon-red)',
                          backgroundColor: 'rgba(255, 42, 42, 0.1)',
                          boxShadow: '0 0 15px rgba(255, 42, 42, 0.2)'
                        } : {}}
                      >
                          <button 
                            onClick={() => setSelectedKitId(kit.id)} 
                            className="kit-tab-name"
                            // AQUI: MUDANÇA DE COR DO TEXTO NO MODO DELETE
                            style={isDeleting ? { color: 'var(--neon-red)' } : {}}
                          >
                              {kit.name} <span style={{opacity:0.5}}>({kitItems[kit.id]?.size || 0})</span>
                          </button>
                          
                          <button 
                            onClick={(e) => handleKitAction(kit.id, e)} 
                            className="btn-delete-kit" 
                            title="Delete Kit"
                            style={isDeleting ? { 
                              backgroundColor: 'var(--neon-red)', 
                              color: '#000', 
                              fontWeight: 'bold',
                              fontFamily: 'JetBrains Mono',
                              paddingRight: '12px'
                            } : {}}
                          >
                            {isDeleting ? 'CONFIRM?' : (
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                            )}
                          </button>
                      </div>
                    );
                  })}
              </div>
          )}
        </div>

        {loading && (
          <div className="loading-container">
            <div className="cyber-loader"></div>
            <div className="loading-text">LOADING_SYSTEM...</div>
          </div>
        )}

        {!loading && Object.entries(groupedSnippets).map(([fileName, snippets]) => (
          <div key={fileName} className="file-group">
            <div className="snippets-grid" style={{ marginTop: '1rem' }}>
              {snippets.map((snippet) => (
                <SnippetCard 
                  key={snippet.id} 
                  snippet={snippet} 
                  userId={session.user.id} 
                  onDelete={() => fetchMacros()}
                  onEdit={handleEdit}
                  onProcessVariables={handleProcessVariables}
                  onAddToKit={handleAddToKit}
                  initialLikes={snippet.likes_count}
                  initialLiked={snippet.liked_by_me}
                  isInKit={isMacroInAnyKit(snippet.id)}
                />
              ))}
            </div>
          </div>
        ))}

        <CreateMacroModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSuccess={() => fetchMacros()} userId={session.user.id} macroToEdit={macroToEdit} />
        <ProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} userId={session.user.id} onUpdate={() => { fetchUserProfile(session.user.id); fetchMacros(); }} />
        <InputVariableModal isOpen={isInputModalOpen} onClose={() => setIsInputModalOpen(false)} variables={varsToProcess} originalText={macroToProcess?.text || ''} />
        <AddToKitModal isOpen={isAddToKitOpen} onClose={() => { setIsAddToKitOpen(false); fetchMacros(); }} userId={session.user.id} macroId={macroIdToAdd} macroKits={getMacroKits(macroIdToAdd)} />

      </div>
      <style>{`@keyframes fadeIn { from { opacity:0; transform:translateY(-5px); } to { opacity:1; transform:translateY(0); } }`}</style>
    </>
  );
}

export default App;