import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { useToast } from './ToastContext';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  macroId: string | null;
  macroKits: string[]; 
}

interface Kit {
  id: string;
  name: string;
}

export function AddToKitModal({ isOpen, onClose, userId, macroId, macroKits }: Props) {
  const { addToast } = useToast();
  const [kits, setKits] = useState<Kit[]>([]);
  const [newKitName, setNewKitName] = useState('');
  const [loading, setLoading] = useState(false);
  
  // ESTADO VISUAL: A verdade absoluta enquanto o modal está aberto
  const [localMacroKits, setLocalMacroKits] = useState<Set<string>>(new Set());

  // EFEITO 1: Carregar a lista de kits (pastas) apenas ao abrir
  useEffect(() => {
    if (isOpen && userId) {
      fetchKits();
    }
  }, [isOpen, userId]);

  // EFEITO 2: Sincronizar o estado visual APENAS quando muda a Macro ou abre o modal
  // Removemos 'macroKits' das dependências diretas para evitar o "Flash" de reset
  useEffect(() => {
    if (isOpen && macroId) {
      setLocalMacroKits(new Set(macroKits));
    }
  }, [macroId, isOpen]); 

  const fetchKits = async () => {
    const { data } = await supabase.from('kits').select('*').eq('user_id', userId).order('created_at');
    if (data) setKits(data);
  };

  // --- TOGGLE INSTANTÂNEO (SEM MEDO) ---
  const toggleKit = (kitId: string) => {
    if (!macroId) return;
    
    // 1. OTIMISMO PURO: Atualiza a interface AGORA.
    const isCurrentlyAdded = localMacroKits.has(kitId);
    
    setLocalMacroKits(prev => {
      const next = new Set(prev);
      if (isCurrentlyAdded) next.delete(kitId);
      else next.add(kitId);
      return next;
    });

    // 2. DISPARA PARA O BANCO (Background)
    if (isCurrentlyAdded) {
      // Remover
      supabase.from('kit_items').delete().eq('kit_id', kitId).eq('macro_id', macroId)
        .then(({ error }) => {
          if (error) { 
            // Se der erro real, aí sim revertemos
            addToast('ERRO AO SALVAR', 'error');
            setLocalMacroKits(prev => { const n = new Set(prev); n.add(kitId); return n; });
          }
        });
    } else {
      // Adicionar
      supabase.from('kit_items').insert({ kit_id: kitId, macro_id: macroId })
        .then(({ error }) => {
          if (error) {
            addToast('ERRO AO SALVAR', 'error');
            setLocalMacroKits(prev => { const n = new Set(prev); n.delete(kitId); return n; });
          } else {
            addToast('SALVO NO KIT', 'success');
          }
        });
    }
  };

  // --- CRIAR E VINCULAR NA HORA ---
  const handleCreateKit = async () => {
    if (!newKitName.trim()) return;
    setLoading(true);

    try {
      // 1. Criar o Kit
      const { data: newKit, error: createError } = await supabase
        .from('kits')
        .insert({ name: newKitName, user_id: userId })
        .select()
        .single();

      if (createError || !newKit) throw new Error("Erro ao criar pasta");

      // 2. ATUALIZAÇÃO VISUAL IMEDIATA DA LISTA
      setKits(prev => [...prev, newKit]);
      setNewKitName(''); 

      // 3. SE TEM MACRO, MARCA COMO VINCULADO VISUALMENTE AGORA
      if (macroId) {
        // Marca visualmente ANTES de ir pro banco
        setLocalMacroKits(prev => {
          const next = new Set(prev);
          next.add(newKit.id); 
          return next;
        });

        // 4. ENVIA O VÍNCULO PARA O BANCO (Background)
        supabase.from('kit_items').insert({ kit_id: newKit.id, macro_id: macroId })
          .then(({ error }) => {
            if(error) {
               addToast('ERRO AO VINCULAR', 'error');
               // Reverte visualmente se falhar
               setLocalMacroKits(prev => { const n = new Set(prev); n.delete(newKit.id); return n; });
            } else {
               addToast('KIT CRIADO E VINCULADO!', 'success');
            }
          });
      } else {
        addToast('KIT CRIADO COM SUCESSO', 'success');
      }

    } catch (err: any) {
      addToast('ERRO AO PROCESSAR', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)', backgroundColor: 'rgba(0, 0, 0, 0.8)' }}>
      
      <div className="cyber-modal" style={{ width: '90%', maxWidth: '500px', display: 'flex', flexDirection: 'column' }}>
        
        <div className="modal-header">
          <div>
            <span style={{ fontSize: '0.65rem', color: 'var(--neon-purple)', fontFamily: 'JetBrains Mono', display: 'block', marginBottom: '4px', letterSpacing:'1px' }}>SYSTEM: ORGANIZE</span>
            <h2 className="title" style={{ fontSize: '1.5rem', margin: 0, color: '#fff' }}>MANAGE_KITS</h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
        </div>

        <div className="modal-body" style={{ maxHeight: '350px', paddingBottom: '0', overflowY: 'auto' }}>
          {kits.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#444', fontFamily: 'JetBrains Mono', fontSize: '0.8rem', border: '1px dashed #333' }}>
              [ EMPTY DATABASE ]<br/>CREATE YOUR FIRST KIT BELOW
            </div>
          ) : (
            kits.map(kit => {
              const isAdded = localMacroKits.has(kit.id);
              return (
                <div 
                  key={kit.id} 
                  className="kit-item" 
                  style={{
                    borderLeftColor: isAdded ? 'var(--neon-green)' : '#444',
                    borderColor: isAdded ? 'rgba(0,255,0,0.3)' : '#333'
                  }}
                >
                  <div className="kit-name-group">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={isAdded ? "var(--neon-green)" : "#f59e0b"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                    </svg>
                    <span style={isAdded ? { color: '#fff', fontWeight: 'bold', textShadow: '0 0 10px rgba(0,255,0,0.3)' } : { color: '#aaa' }}>
                      {kit.name}
                    </span>
                  </div>
                  
                  <button 
                    onClick={() => toggleKit(kit.id)} 
                    className={`btn-toggle-kit ${isAdded ? 'status-added' : 'status-add'}`}
                  >
                    {isAdded ? 'SAVED' : 'ADD +'}
                  </button>
                </div>
              )
            })
          )}
        </div>

        <div style={{ padding: '1.5rem', borderTop: '1px solid #222', marginTop: 'auto', background: '#050505' }}>
          <label className="input-label">CREATE_NEW_COLLECTION</label>
          <div style={{ display: 'flex', gap: '0', height: '40px' }}>
            <input 
              className="cyber-field" 
              placeholder="NOME DO NOVO KIT..." 
              value={newKitName} 
              onChange={e => setNewKitName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreateKit()}
              style={{ borderRight: 'none', borderTopRightRadius: 0, borderBottomRightRadius: 0 }}
            />
            <button 
              onClick={handleCreateKit} 
              disabled={loading || !newKitName.trim()}
              className="btn-create-kit-action"
              style={{ borderTopLeftRadius: 0, borderBottomLeftRadius: 0 }}
            >
              {loading ? '...' : 'CREATE'}
            </button>
          </div>
        </div>

      </div>
      
      <style>{`
        .kit-item {
          display: flex; justify-content: space-between; alignItems: center;
          padding: 10px 14px; background: #000;
          border: 1px solid #333; border-left: 3px solid #444; 
          margin-bottom: 8px; border-radius: 2px; 
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .kit-item:hover { transform: translateX(2px); background: #0a0a0a; }
        
        .kit-name-group { display: flex; align-items: center; gap: 10px; font-family: 'JetBrains Mono'; font-size: 0.9rem; }
        
        .btn-toggle-kit {
          background: transparent; border: 1px solid; padding: 6px 12px;
          font-size: 0.7rem; font-weight: bold; font-family: 'JetBrains Mono';
          cursor: pointer; transition: all 0.2s; border-radius: 2px; min-width: 80px; text-align: center;
          text-transform: uppercase;
        }
        
        .status-add { border-color: #444; color: #666; }
        .kit-item:hover .status-add { border-color: var(--neon-cyan); color: var(--neon-cyan); }
        .status-add:hover { background: var(--neon-cyan); color: #000 !important; box-shadow: 0 0 10px var(--neon-cyan); }
        
        .status-added { border-color: var(--neon-green); background: rgba(0, 255, 0, 0.1); color: var(--neon-green); box-shadow: 0 0 5px rgba(0, 255, 0, 0.2); }
        .status-added:hover { background: var(--neon-green); color: #000 !important; box-shadow: 0 0 15px var(--neon-green); border-color: var(--neon-green); }

        .btn-create-kit-action {
          background: var(--neon-pink); color: #000; border: none;
          font-weight: 900; font-family: 'JetBrains Mono'; padding: 0 1.5rem;
          height: 100%; cursor: pointer; transition: all 0.2s;
          text-transform: uppercase; letter-spacing: 1px;
        }
        .btn-create-kit-action:hover { background: #fff; box-shadow: 0 0 20px var(--neon-pink); }
        .btn-create-kit-action:disabled { opacity: 0.5; cursor: not-allowed; background: #333; color: #666; box-shadow: none; }
      `}</style>
    </div>
  );
}