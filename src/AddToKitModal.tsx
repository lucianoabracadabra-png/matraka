import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { useToast } from './ToastContext';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  macroId: string | null;
}

export function AddToKitModal({ isOpen, onClose, userId, macroId }: Props) {
  const { addToast } = useToast();
  const [kits, setKits] = useState<any[]>([]);
  const [newKitName, setNewKitName] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) fetchKits();
  }, [isOpen]);

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

  const handleAddToKit = async (kitId: string) => {
    if (!macroId) return;
    setLoading(true);
    const { error } = await supabase.from('kit_items').insert({ kit_id: kitId, macro_id: macroId });
    
    setLoading(false);
    if (error) {
      if (error.code === '23505') addToast('JÁ ESTÁ NESTE KIT!', 'info');
      else addToast('ERRO AO ADICIONAR', 'error');
    } else {
      addToast('ADICIONADO AO KIT COM SUCESSO!', 'success');
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 300,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      backdropFilter: 'blur(5px)', backgroundColor: 'rgba(0, 0, 0, 0.8)'
    }}>
      <div className="cyber-modal" style={{ width: '90%', maxWidth: '400px', padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <h3 style={{ margin: 0, color: '#fff' }}>ADD_TO_KIT</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer' }}>✕</button>
        </div>

        {/* LISTA DE KITS EXISTENTES */}
        <div style={{ maxHeight: '200px', overflowY: 'auto', marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {kits.length === 0 && <p style={{ color: '#666', fontSize: '0.8rem', textAlign: 'center' }}>Nenhum kit encontrado.</p>}
          
          {kits.map(kit => (
            <button
              key={kit.id}
              onClick={() => handleAddToKit(kit.id)}
              disabled={loading}
              style={{
                background: 'rgba(255,255,255,0.05)', border: '1px solid #333',
                color: 'var(--neon-cyan)', padding: '10px', borderRadius: '4px',
                textAlign: 'left', cursor: 'pointer', fontFamily: 'JetBrains Mono',
                transition: 'all 0.2s', display: 'flex', justifyContent: 'space-between'
              }}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--neon-cyan)'}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = '#333'}
            >
              <span>📁 {kit.name}</span>
              <span style={{ fontSize: '0.8rem', opacity: 0.5 }}>ADD +</span>
            </button>
          ))}
        </div>

        {/* CRIAR NOVO KIT */}
        <div style={{ borderTop: '1px solid #333', paddingTop: '1rem' }}>
          <label className="cyber-label">NEW_KIT_NAME</label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input 
              className="cyber-input" 
              value={newKitName} 
              onChange={e => setNewKitName(e.target.value)} 
              placeholder="Ex: Vendas"
              style={{ padding: '8px' }}
            />
            <button 
              onClick={handleCreateKit}
              disabled={loading || !newKitName}
              style={{
                background: 'var(--neon-cyan)', color: '#000', border: 'none',
                fontWeight: 'bold', cursor: 'pointer', padding: '0 15px', borderRadius: '2px'
              }}
            >
              CRIAR
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}