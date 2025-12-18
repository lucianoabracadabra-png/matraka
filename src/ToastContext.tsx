import React, { createContext, useContext, useState, useCallback } from 'react';

// --- TIPOS ---
type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextData {
  addToast: (message: string, type?: ToastType) => void;
}

// Criação do Contexto
const ToastContext = createContext<ToastContextData>({} as ToastContextData);

// --- PROVIDER (O Componente que envolve o App) ---
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Date.now();
    
    // Adiciona o toast novo na lista
    setToasts((state) => [...state, { id, message, type }]);

    // Remove automático após 3 segundos
    setTimeout(() => {
      setToasts((state) => state.filter((toast) => toast.id !== id));
    }, 3000);
  }, []);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      
      {/* Container visual dos Toasts (Canto Superior Direito) */}
      <div style={{
        position: 'fixed', top: '20px', right: '20px', zIndex: 9999,
        display: 'flex', flexDirection: 'column', gap: '10px'
      }}>
        {toasts.map((toast) => (
          <div key={toast.id} style={{
            minWidth: '300px',
            background: 'rgba(5, 5, 10, 0.95)',
            borderLeft: `4px solid ${
              toast.type === 'success' ? '#00ff00' : 
              toast.type === 'error' ? '#ff0055' : '#00f3ff'
            }`,
            borderTop: '1px solid rgba(255,255,255,0.1)',
            borderRight: '1px solid rgba(255,255,255,0.1)',
            borderBottom: '1px solid rgba(255,255,255,0.1)',
            padding: '1rem',
            boxShadow: `0 0 15px ${
              toast.type === 'success' ? 'rgba(0,255,0,0.2)' : 
              toast.type === 'error' ? 'rgba(255,0,85,0.2)' : 'rgba(0,243,255,0.2)'
            }`,
            color: '#fff',
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: '0.9rem',
            animation: 'slideIn 0.3s ease-out forwards',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between'
          }}>
            <span>{toast.message}</span>
            <span style={{ fontSize: '1.2rem', marginLeft: '10px' }}>
              {toast.type === 'success' && '✓'}
              {toast.type === 'error' && '!'}
              {toast.type === 'info' && 'i'}
            </span>
          </div>
        ))}
      </div>
      
      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </ToastContext.Provider>
  );
}

// --- HOOK (O que você usa nos componentes) ---
// É ESSA PARTE QUE O ERRO DIZ QUE ESTAVA FALTANDO
export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}