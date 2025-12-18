import { useEffect, useState, useCallback } from 'react';
import { supabase } from './supabaseClient';
import { Auth } from './Auth';
import { CreateMacroModal } from './CreateMacroModal';
import { SnippetCard } from './SnippetCard';
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
}

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [allSnippets, setAllSnippets] = useState<Snippet[]>([]);
  const [filteredSnippets, setFilteredSnippets] = useState<Snippet[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // --- GERENCIAMENTO DE SESSÃO ---
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
    return () => subscription.unsubscribe();
  }, []);

  // --- BUSCA DE DADOS ---
  const fetchMacros = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    
    // 1. Busca as macros e CONTA os likes
    const { data: macrosData, error: macrosError } = await supabase
      .from('macros')
      .select('*, macro_likes(count)')
      .order('created_at', { ascending: false });

    // 2. Busca quais macros EU curti
    const { data: myLikesData, error: likesError } = await supabase
      .from('macro_likes')
      .select('macro_id')
      .eq('user_id', session.user.id);

    if (macrosError || likesError) {
      console.error('Erro:', macrosError || likesError);
    } else if (macrosData) {
      const myLikedIds = new Set(myLikesData?.map((l: any) => l.macro_id) || []);

// Dentro de fetchMacros...
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
        
        // --- ESTA LINHA É A CHAVE ---
        created_at: macro.created_at 
        // ---------------------------
      }));
      
      setAllSnippets(mappedSnippets);
      setFilteredSnippets(mappedSnippets);
    }
    setLoading(false);
  }, [session]);

  useEffect(() => {
    fetchMacros();
  }, [fetchMacros]);

  // --- FILTRO ---
  useEffect(() => {
    const term = searchTerm.toLowerCase();
    const filtered = allSnippets.filter(snippet => 
      (snippet.name && snippet.name.toLowerCase().includes(term)) ||
      (snippet.shortcut && snippet.shortcut.toLowerCase().includes(term)) ||
      (snippet.text && snippet.text?.toLowerCase().includes(term))
    );
    setFilteredSnippets(filtered);
  }, [searchTerm, allSnippets]);

  // --- AGRUPAMENTO ---
  const groupedSnippets = filteredSnippets.reduce((groups, snippet) => {
    const file = snippet.sourceFile;
    if (!groups[file]) groups[file] = [];
    groups[file].push(snippet);
    return groups;
  }, {} as Record<string, Snippet[]>);

  // --- RENDERIZAÇÃO: LOGIN ---
  if (!session) {
    return (
      <>
        <div className="cyber-grid"></div>
        <div className="cyber-glow"></div>
        <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
          <Auth />
        </div>
      </>
    );
  }

  // --- RENDERIZAÇÃO: APP PRINCIPAL ---
  return (
    <>
      <div className="cyber-grid"></div>
      <div className="cyber-glow"></div>

      <div className="container">
        
        {/* HEADER CYBERPUNK */}
        <div className="header">
          {/* CORREÇÃO AQUI: Adicionado display: 'flex' e alignItems: 'center' */}
          <div className="header-top" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            
            <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
              
{/* LOGO MATRAKA BIRD (Versão 2.0 - Falcão Geométrico) */}
              <div style={{ 
                width: '64px', height: '64px', 
                background: 'rgba(5, 5, 10, 0.8)', 
                border: '1px solid var(--neon-cyan)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 0 20px rgba(0, 243, 255, 0.2)',
                transform: 'skewX(-10deg)', // Dá uma inclinada "rápida"
                position: 'relative'
              }}>
                {/* Detalhe decorativo no canto */}
                <div style={{ position: 'absolute', top: '-1px', right: '-1px', width: '10px', height: '10px', background: 'var(--neon-pink)', clipPath: 'polygon(0 0, 100% 0, 100% 100%)' }}></div>
                
                <svg width="42" height="42" viewBox="0 0 100 100" fill="none" strokeWidth="2" style={{ transform: 'skewX(10deg)' }}>
                  {/* Cabeça e Bico (Polígono Principal) */}
                  <path 
                    d="M30 30 L60 30 L90 50 L60 60 L60 80 L30 70 Z" 
                    stroke="var(--neon-cyan)" 
                    fill="rgba(0, 243, 255, 0.1)"
                    strokeLinejoin="round"
                  />
                  
                  {/* Olho Cibernético (Triângulo Rosa) */}
                  <path d="M55 40 L65 40 L60 50 Z" fill="var(--neon-pink)" stroke="none" />
                  
                  {/* Linha de velocidade/Asa (Roxa) */}
                  <path d="M10 50 L40 50 L50 60" stroke="var(--neon-purple)" strokeWidth="3" strokeLinecap="round" />
                  
                  {/* Detalhe Tech embaixo */}
                  <path d="M30 85 L70 85" stroke="var(--neon-cyan)" strokeDasharray="2 4" />
                </svg>
              </div>

              <div>
                <h1 className="title" style={{ margin: 0, fontSize: '3rem', lineHeight: 1 }}>
                  MATRAKA
                </h1>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <p className="subtitle" style={{ margin: 0 }}>
                    SYSTEM.USER: <span style={{color: '#fff'}}>{session.user.email?.split('@')[0]}</span>
                  </p>
                  <button 
                    onClick={() => supabase.auth.signOut()}
                    className="btn-neon"
                    style={{ fontSize: '0.7rem', padding: '2px 8px' }}
                  >
                    LOGOUT
                  </button>
                </div>
              </div>
            </div>

            {/* BOTÃO DE CRIAR MACRO (Agora vai ficar na direita corretamente) */}
            <button 
              onClick={() => setIsModalOpen(true)}
              className="btn-create"
              title="Nova Macro"
              style={{ flexShrink: 0 }} // Garante que o botão não suma se a tela for pequena
            >
              +
            </button>
          </div>

          <div className="search-box" style={{ marginTop: '2rem', position: 'relative' }}>
            <svg className="search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.35-4.35"></path></svg>
            <input 
              type="text" className="search-input" placeholder="SEARCH_DATABASE..."
              value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            />
            {/* CORREÇÃO AQUI: Adicionado right: '1rem' para travar na direita */}
            <span className="search-count" style={{position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--neon-cyan)'}}>
              {filteredSnippets.length} RECORDS_FOUND
            </span>
          </div>
        </div>

        {loading && <div className="loading"><div className="spinner"></div><p>LOADING_SYSTEM...</p></div>}

        {!loading && Object.entries(groupedSnippets).map(([fileName, snippets]) => (
          <div key={fileName} className="file-group">
            <div className="file-header">
              <span className="file-title">{fileName}</span>
            </div>
            
            <div className="snippets-grid">
              {snippets.map((snippet) => (
                <SnippetCard 
                  key={snippet.id} 
                  snippet={snippet} 
                  userId={session.user.id} 
                  onDelete={() => fetchMacros()}
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
        />
      </div>
    </>
  );
}

export default App;