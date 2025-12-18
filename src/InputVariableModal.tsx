import { useState, useEffect, useRef } from 'react';
import { useToast } from './ToastContext';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  variables: string[];
  originalText: string;
}

export function InputVariableModal({ isOpen, onClose, variables, originalText }: Props) {
  const { addToast } = useToast();
  const [values, setValues] = useState<Record<string, string>>({});
  const firstInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setValues({});
      setTimeout(() => firstInputRef.current?.focus(), 100);
    }
  }, [isOpen, variables]);

  const handleInputChange = (variable: string, value: string) => {
    setValues(prev => ({ ...prev, [variable]: value }));
  };

  const handleProcessAndCopy = () => {
    let finalText = originalText;

    variables.forEach(variable => {
      const valueToInsert = values[variable] || ''; 
      // SINTAXE NOVA: [input:VARIAVEL]
      // Precisamos escapar os colchetes na regex, pois são especiais
      const regex = new RegExp(`\\[input:${variable}\\]`, 'gi');
      finalText = finalText.replace(regex, valueToInsert);
    });
    
    // Tratamento básico para HTML entities se necessário
    const txt = document.createElement('textarea');
    txt.innerHTML = finalText;
    finalText = txt.value;

    navigator.clipboard.writeText(finalText)
      .then(() => {
        addToast('MACRO PROCESSADA E COPIADA!', 'success');
        onClose();
      })
      .catch(() => addToast('ERRO AO COPIAR', 'error'));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleProcessAndCopy();
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 300,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      backdropFilter: 'blur(5px)', backgroundColor: 'rgba(0, 0, 0, 0.8)'
    }}>
      <div className="cyber-modal" style={{ width: '90%', maxWidth: '400px', padding: '2rem' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 className="title" style={{ fontSize: '1.2rem', margin: 0, color: 'var(--neon-pink)' }}>
            INPUT_REQUIRED
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer' }}>✕</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {variables.map((variable, index) => (
            <div key={variable}>
              <label className="cyber-label" style={{ color: 'var(--neon-cyan)' }}>
                {variable.toUpperCase()}
              </label>
              <input
                ref={index === 0 ? firstInputRef : null}
                className="cyber-input"
                placeholder={`Valor para ${variable}...`}
                value={values[variable] || ''}
                onChange={e => handleInputChange(variable, e.target.value)}
                onKeyDown={handleKeyDown}
                autoComplete="off"
              />
            </div>
          ))}
        </div>

        <button 
          onClick={handleProcessAndCopy}
          className="cyber-btn-main"
          style={{ marginTop: '1.5rem', width: '100%', background: 'var(--neon-pink)', color: '#000' }}
        >
          PROCESS & COPY
        </button>

      </div>
    </div>
  );
}