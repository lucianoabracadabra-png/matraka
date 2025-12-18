import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { useToast } from './ToastContext';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  macroId: string | null;
  macroKits?: string[];
}

export function AddToKitModal({ isOpen, onClose, userId, macroId, macroKits = [] }: Props) {
  const { addToast } = useToast();
  const [kits, setKits] = useState<any[]>([]);
  const [newKitName, setNewKitName] = useState('');
  const [loading, setLoading] = useState(false);
  const [localMacroKits, setLocalMacroKits] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen) {
      fetchKits();
      setLocalMacroKits(macroKits);
    }
  }, [isOpen, macroKits]);

  const fetchKits = async () => {
    const { data } = await supabase.from('kits').select('*').eq('user_id', userId).order('created_at');
    if (data) setKits(data);
  };

  const handleCreateKit = async () => {
    if (!newKitName) return;
    setLoading(true);
    const { data, error } = await supabase.from('kits').insert({ user_id: userId, name: newKitName }).select();
    if (error) {
      addToast('ERRO AO CRIAR KIT', 'error');
    } else {
      setKits([...kits, data[0]]);
      setNewKitName('');
    }
    setLoading(false);
  };

  const handleToggleKit = async (kitId: string) => {
    if (!macroId) return;
    setLoading(true);

    const isAdded = localMacroKits.includes(kitId);

    if (isAdded) {
      const { error } = await supabase.from('kit_items').delete().eq('kit_id', kitId).eq('macro_id', macroId);
      if (error) addToast('ERRO AO REMOVER', 'error');
      else {
        setLocalMacroKits(prev => prev.filter(id => id !== kitId));
        addToast('REMOVIDO DO KIT', 'info');
      }
    } else {
      const { error } = await supabase.from('kit_items').insert({ kit_id: kitId, macro_id: macroId });
      if (error) addToast('ERRO AO ADICIONAR', 'error');
      else {
        setLocalMacroKits(prev => [...prev, kitId]);
        addToast('ADICIONADO AO KIT', 'success');
      }
    }
    setLoading(false);
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 300,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      backdropFilter: 'blur(5px)', backgroundColor: 'rgba(0, 0, 0, 0.8)'
    }}>
      <div className="cyber-modal" style={{ width: '90%', maxWidth: '450px', padding: '2rem' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <span style={{ fontSize: '0.7rem', color: 'var(--neon-purple)', fontFamily: 'JetBrains Mono' }}>SYSTEM: ORGANIZE</span>
            <h2 className="title" style={{ fontSize: '1.5rem', margin: 0, color: '#fff' }}>MANAGE_KITS</h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--neon-pink)', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
        </div>

        <div style={{ maxHeight: '250px', overflowY: 'auto', marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingRight: '5px' }}>
          {kits.length === 0 && <p style={{ color: '#666', fontSize: '0.8rem', textAlign: 'center', padding: '1rem', fontFamily:'JetBrains Mono' }}>NO_KITS_FOUND</p>}
          
          {kits.map(kit => {
            const isAdded = localMacroKits.includes(kit.id);
            return (
              <button
                key={kit.id}
                onClick={() => handleToggleKit(kit.id)}
                disabled={loading}
                style={{
                  background: isAdded ? 'rgba(0, 255, 0, 0.15)' : 'rgba(0, 0, 0, 0.3)',
                  border: isAdded ? '1px solid #00ff00' : '1px solid #444',
                  color: isAdded ? '#00ff00' : '#888',
                  padding: '12px', borderRadius: '2px',
                  textAlign: 'left', cursor: 'pointer', fontFamily: 'JetBrains Mono',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  transition: 'all 0.2s',
                  boxShadow: isAdded ? '0 0 10px rgba(0, 255, 0, 0.2)' : 'none'
                }}
                onMouseEnter={(e) => {
                   if(!isAdded) {
                     e.currentTarget.style.borderColor = 'var(--neon-cyan)';
                     e.currentTarget.style.color = '#fff';
                     e.currentTarget.style.background = 'rgba(0, 243, 255, 0.05)';
                   }
                }}
                onMouseLeave={(e) => {
                   if(!isAdded) {
                     e.currentTarget.style.borderColor = '#444';
                     e.currentTarget.style.color = '#888';
                     e.currentTarget.style.background = 'rgba(0, 0, 0, 0.3)';
                   }
                }}
              >
                <span style={{ fontWeight: 'bold' }}>📁 {kit.name}</span>
                <span style={{ fontSize: '0.7rem', fontWeight: 'bold', opacity: isAdded ? 1 : 0.6 }}>
                  {isAdded ? '[ LINKED ]' : '[ ADD ]'}
                </span>
              </button>
            )
          })}
        </div>

        <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1.5rem' }}>
          <label className="cyber-label">CREATE_NEW_FOLDER</label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input 
              className="cyber-input" 
              value={newKitName} 
              onChange={e => setNewKitName(e.target.value)} 
              placeholder="NOME DO KIT..."
              style={{ padding: '10px', fontFamily:'JetBrains Mono', fontSize:'0.8rem' }}
            />
            <button 
              onClick={handleCreateKit}
              disabled={loading || !newKitName}
              className="cyber-btn-main"
              style={{ padding: '0 20px', fontSize: '0.8rem', minWidth: 'auto' }}
            >
              CRIAR
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}