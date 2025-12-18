import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import { ToastProvider } from './ToastContext.tsx' // <--- Import novo

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ToastProvider> {/* <--- Abraça o App */}
      <App />
    </ToastProvider>
  </React.StrictMode>,
)