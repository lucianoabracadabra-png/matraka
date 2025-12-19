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
  
  // Estado local para controlar visualmente o que está marcado, sem depender de re-fetch lento
  const [localMacroKits, setLocalMacroKits] = useState<Set<string>>(new Set(macroKits));

  useEffect(() => {
    if (isOpen && userId) {
      fetchKits();
      setLocalMacroKits(new Set(macroKits));
    }
  }, [isOpen, userId, macroKits]);

  const fetchKits = async () => {
    const { data } = await supabase.from('kits').select('*').eq('user_id', userId).order('created_at');
    if (data) setKits(data);
  };

  const toggleKit = async (kitId: string) => {
    if (!macroId) return;
    
    // Se já tem, remove
    if (localMacroKits.has(kitId)) {
      // Atualiza visualmente primeiro (Otimista)
      const prevSet = new Set(localMacroKits);
      const newSet = new Set(localMacroKits);
      newSet.delete(kitId);
      setLocalMacroKits(newSet);

      const { error } = await supabase.from('kit_items').delete().eq('kit_id', kitId).eq('macro_id', macroId);
      if (error) {
        setLocalMacroKits(prevSet); // Reverte se der erro
        addToast('ERRO AO REMOVER', 'error');
      } else {
        addToast('REMOVIDO DO KIT', 'info');
      }
    } 
    // Se não tem, adiciona
    else {
      // Atualiza visualmente primeiro (Otimista)
      const prevSet = new Set(localMacroKits);
      const newSet = new Set(localMacroKits);
      newSet.add(kitId);
      setLocalMacroKits(newSet);

      const { error } = await supabase.from('kit_items').insert({ kit_id: kitId, macro_id: macroId });
      if (error) {
        setLocalMacroKits(prevSet); // Reverte se der erro
        addToast('ERRO AO ADICIONAR', 'error');
      } else {
        addToast('SALVO NO KIT', 'success');
      }
    }
  };

  const handleCreateKit = async () => {
    if (!newKitName.trim()) return;
    setLoading(true);

    // 1. Cria o Kit no Banco
    const { data: newKit, error: createError } = await supabase
      .from('kits')
      .insert({ name: newKitName, user_id: userId })
      .select()
      .single();

    if (createError) {
      addToast('ERRO AO CRIAR KIT', 'error');
      setLoading(false);
      return;
    }

    // 2. Se tiver sucesso e tivermos uma macro para linkar
    if (newKit) {
      // Atualiza a lista de kits imediatamente para o usuário ver
      setKits(prev => [...prev, newKit]);
      
      if (macroId) {
        // Tenta linkar a macro ao novo kit
        const { error: linkError } = await supabase
          .from('kit_items')
          .insert({ kit_id: newKit.id, macro_id: macroId });

        if (linkError) {
          addToast('KIT CRIADO, MAS FALHA AO VINCULAR', 'error'); // Corrigido warning -> error
        } else {
          // SUCESSO TOTAL: Atualiza o set local para ficar VERDE imediatamente
          setLocalMacroKits(prev => {
            const next = new Set(prev);
            next.add(newKit.id);
            return next;
          });
          addToast('KIT CRIADO E VINCULADO!', 'success');
        }
      } else {
        addToast('KIT CRIADO COM SUCESSO', 'success');
      }
    }

    setNewKitName('');
    setLoading(false);
    
    // Garante sincronia final com o banco
    setTimeout(() => fetchKits(), 500); 
  };

  if (!isOpen) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)', backgroundColor: 'rgba(0, 0, 0, 0.8)' }}>
      
      <style>{`
        .kit-item {
          display: flex; justify-content: space-between; alignItems: center;
          padding: 10px 15px; border: 1px solid #222; background: #080808;
          margin-bottom: 8px; border-radius: 2px; transition: all 0.2s;
        }
        .kit-item:hover { border-color: #444; background: #111; }
        
        .kit-name-group { display: flex; align-items: center; gap: 10px; color: #fff; font-family: 'JetBrains Mono'; font-size: 0.9rem; }
        
        .btn-toggle-kit {
          background: transparent; border: 1px solid; padding: 4px 10px;
          font-size: 0.7rem; font-weight: bold; font-family: 'JetBrains Mono';
          cursor: pointer; transition: all 0.2s; border-radius: 2px; min-width: 80px; text-align: center;
        }
        
        .status-add { border-color: var(--neon-cyan); color: var(--neon-cyan); }
        .status-add:hover { background: var(--neon-cyan); color: #000; box-shadow: 0 0 10px var(--neon-cyan); }
        
        .status-added { border-color: var(--neon-green); background: rgba(0,255,0,0.1); color: var(--neon-green); }
        .status-added:hover { background: var(--neon-green); color: #000; box-shadow: 0 0 10px var(--neon-green); }

        .btn-create-kit-action {
          background: var(--neon-pink); color: #000; border: none;
          font-weight: 900; font-family: 'JetBrains Mono'; padding: 0 1.5rem;
          cursor: pointer; transition: all 0.2s;
        }
        .btn-create-kit-action:hover { background: #fff; box-shadow: 0 0 15px var(--neon-pink); }
        .btn-create-kit-action:disabled { opacity: 0.5; cursor: not-allowed; }
      `}</style>

      <div className="cyber-modal" style={{ width: '90%', maxWidth: '500px', display: 'flex', flexDirection: 'column' }}>
        
        <div className="modal-header">
          <div>
            <span style={{ fontSize: '0.65rem', color: 'var(--neon-purple)', fontFamily: 'JetBrains Mono', display: 'block', marginBottom: '4px', letterSpacing:'1px' }}>SYSTEM: ORGANIZE</span>
            <h2 className="title" style={{ fontSize: '1.5rem', margin: 0, color: '#fff' }}>MANAGE_KITS</h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
        </div>

        <div className="modal-body" style={{ maxHeight: '300px', paddingBottom: '0' }}>
          {kits.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#666', fontFamily: 'JetBrains Mono', fontSize: '0.8rem' }}>
              NO_KITS_FOUND // CREATE ONE BELOW
            </div>
          ) : (
            kits.map(kit => {
              const isAdded = localMacroKits.has(kit.id);
              return (
                <div key={kit.id} className="kit-item">
                  <div className="kit-name-group">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
                    {kit.name}
                  </div>
                  <button onClick={() => toggleKit(kit.id)} className={`btn-toggle-kit ${isAdded ? 'status-added' : 'status-add'}`}>
                    {isAdded ? '[ ADDED ]' : '[ ADD + ]'}
                  </button>
                </div>
              )
            })
          )}
        </div>

        <div style={{ padding: '1.5rem', borderTop: '1px solid #222', marginTop: 'auto', background: '#080808' }}>
          <label className="input-label">CREATE_NEW_COLLECTION</label>
          <div style={{ display: 'flex', gap: '10px' }}>
            <input 
              className="cyber-field" 
              placeholder="NOME DO KIT..." 
              value={newKitName} 
              onChange={e => setNewKitName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreateKit()}
            />
            <button 
              onClick={handleCreateKit} 
              disabled={loading || !newKitName.trim()}
              className="btn-create-kit-action"
            >
              {loading ? '...' : 'CREATE'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}