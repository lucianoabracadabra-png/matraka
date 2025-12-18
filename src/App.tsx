import { useEffect, useState, useCallback } from 'react';
import { supabase } from './supabaseClient';
import { Auth } from './Auth';
import { CreateMacroModal } from './CreateMacroModal';
import { SnippetCard } from './SnippetCard';
import { ProfileModal } from './ProfileModal';
import type { Session } from '@supabase/supabase-js';
import './index.css';

interface Snippet {
  id: string;
  user_id: string;
  name: string;
  shortcut?: string;
  text?: string;
  app?: string;
  sourceFile: string;
  folderName: string;
  likes_count: number;
  liked_by_me: boolean;
  author: string;
  created_at: string;
}

function App() {
  const [activeTab, setActiveTab] = useState('ALL');
  const [session, setSession] = useState<Session | null>(null);
  const [allSnippets, setAllSnippets] = useState<Snippet[]>([]);
  const [filteredSnippets, setFilteredSnippets] = useState<Snippet[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  
  // MODAIS & STATES
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [macroToEdit, setMacroToEdit] = useState<Snippet | null>(null);

  const [myUsername, setMyUsername] = useState('Loading...');

  // --- 1. GERENCIAMENTO DE SESSÃO (Corrigido) ---
  useEffect(() => {
    // Pega a sessão inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchUserProfile(session.user.id);
    });

    // Escuta mudanças (Login/Logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchUserProfile(session.user.id);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserProfile = async (userId: string) => {
    const { data } = await supabase.from('profiles').select('username, email').eq('id', userId).single();
    if (data) {
      setMyUsername(data.username || data.email?.split('@')[0] || 'Unknown');
    }
  };

  // --- 2. BUSCA DE DADOS ---
  const fetchMacros = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    
    const { data: macrosData, error: macrosError } = await supabase
      .from('macros')
      .select('*, macro_likes(count), profiles!macros_user_id_fkey(username, email)')
      .order('created_at', { ascending: false });

    const { data: myLikesData, error: likesError } = await supabase
      .from('macro_likes')
      .select('macro_id')
      .eq('user_id', session.user.id);

    if (macrosError || likesError) {
      console.error('Erro ao buscar dados:', macrosError || likesError);
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
        created_at: macro.created_at 
      }));
      
      setAllSnippets(mappedSnippets);
      setFilteredSnippets(mappedSnippets);
    }
    setLoading(false);
  }, [session]);

  useEffect(() => {
    fetchMacros();
  }, [fetchMacros]);

  // --- 3. ACTIONS ---
  const handleEdit = (snippet: Snippet) => {
    setMacroToEdit(snippet);
    setIsModalOpen(true);
  };

  const handleCreateNew = () => {
    setMacroToEdit(null);
    setIsModalOpen(true);
  };

  // --- 4. FILTRO HÍBRIDO (BUSCA + ABAS) ---
  useEffect(() => {
    const term = searchTerm.toLowerCase();
    
    // Filtra por texto
    let filtered = allSnippets.filter(snippet => 
      (snippet.name && snippet.name.toLowerCase().includes(term)) ||
      (snippet.shortcut && snippet.shortcut.toLowerCase().includes(term)) ||
      (snippet.text && snippet.text?.toLowerCase().includes(term)) ||
      (snippet.author && snippet.author.toLowerCase().includes(term))
    );

    // Filtra por Aba
    if (activeTab === 'MINE') {
      filtered = filtered.filter(s => s.user_id === session?.user.id);
    } else if (activeTab === 'FAVS') {
      filtered = filtered.filter(s => s.liked_by_me);
    } else if (activeTab === 'AI') {
      filtered = filtered.filter(s => s.app === 'AI');
    } else if (activeTab === 'TEXT') {
      filtered = filtered.filter(s => s.app === 'TEXT' || !s.app);
    }

    setFilteredSnippets(filtered);
  }, [searchTerm, allSnippets, activeTab, session]);

  const groupedSnippets = filteredSnippets.reduce((groups, snippet) => {
    const file = snippet.sourceFile;
    if (!groups[file]) groups[file] = [];
    groups[file].push(snippet);
    return groups;
  }, {} as Record<string, Snippet[]>);

  if (!session) {
    return (
      <>
        <div className="cyber-grid"></div><div className="cyber-glow"></div>
        <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
          <Auth />
        </div>
      </>
    );
  }

  return (
    <>
      <div className="cyber-grid"></div>
      <div className="cyber-glow"></div>

      <div className="container">
        
        <div className="header">
          <div className="header-top" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
              
              {/* LOGO */}
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
                <h1 className="title" style={{ margin: 0, fontSize: '3rem', lineHeight: 1 }}>MATRAKA</h1>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.5rem' }}>
                  <p className="subtitle" style={{ margin: 0, fontFamily: 'JetBrains Mono' }}>
                    SYSTEM.USER: <span style={{color: '#fff', fontWeight: 'bold'}}>{myUsername}</span>
                  </p>
                  <button onClick={() => setIsProfileOpen(true)} className="btn-neon" style={{ fontSize: '0.7rem', padding: '2px 8px', borderColor: 'var(--neon-purple)', color: 'var(--neon-purple)' }}>SETUP_ID</button>
                  <button onClick={() => supabase.auth.signOut()} className="btn-neon" style={{ fontSize: '0.7rem', padding: '2px 8px' }}>LOGOUT</button>
                </div>
              </div>
            </div>

            {/* BOTÃO + (CRIAR NOVA) */}
            <button onClick={handleCreateNew} className="btn-create" title="Nova Macro" style={{ flexShrink: 0 }}>+</button>
          </div>

          <div className="search-box" style={{ marginTop: '2rem', position: 'relative' }}>
            <svg className="search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.35-4.35"></path></svg>
            <input type="text" className="search-input" placeholder="SEARCH_DATABASE..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            <span className="search-count" style={{position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--neon-cyan)'}}>{filteredSnippets.length} RECORDS_FOUND</span>
          </div>

          {/* BARRA DE NAVEGAÇÃO TÁTICA (ABAS) - AGORA DENTRO DO HEADER */}
          <div style={{ 
            display: 'flex', gap: '1rem', marginTop: '1.5rem', 
            borderBottom: '1px solid rgba(0, 243, 255, 0.2)', paddingBottom: '0.5rem',
            overflowX: 'auto'
          }}>
            {['ALL', 'MINE', 'FAVS', 'AI', 'TEXT'].map((tab) => {
              const isActive = activeTab === tab;
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  style={{
                    background: isActive ? 'var(--neon-cyan)' : 'transparent',
                    color: isActive ? '#000' : 'var(--neon-cyan)',
                    border: 'none',
                    padding: '0.5rem 1rem',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    fontFamily: 'JetBrains Mono',
                    fontSize: '0.9rem',
                    clipPath: 'polygon(10% 0, 100% 0, 90% 100%, 0% 100%)',
                    transition: 'all 0.2s',
                    minWidth: '80px'
                  }}
                >
                  {tab}
                </button>
              )
            })}
          </div>
        </div>

        {loading && <div className="loading"><div className="spinner"></div><p>LOADING_SYSTEM...</p></div>}

        {!loading && Object.entries(groupedSnippets).map(([fileName, snippets]) => (
          <div key={fileName} className="file-group">
            <div className="file-header"><span className="file-title">{fileName}</span></div>
            <div className="snippets-grid">
              {snippets.map((snippet) => (
                <SnippetCard 
                  key={snippet.id} 
                  snippet={snippet} 
                  userId={session.user.id} 
                  onDelete={() => fetchMacros()}
                  onEdit={handleEdit}
                  initialLikes={snippet.likes_count}
                  initialLiked={snippet.liked_by_me}
                />
              ))}
            </div>
          </div>
        ))}

        <CreateMacroModal 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)}
          onSuccess={() => fetchMacros()}
          userId={session.user.id}
          macroToEdit={macroToEdit}
        />

        <ProfileModal 
          isOpen={isProfileOpen}
          onClose={() => setIsProfileOpen(false)}
          userId={session.user.id}
          onUpdate={() => { fetchUserProfile(session.user.id); fetchMacros(); }}
        />
      </div>
    </>
  );
}

export default App;