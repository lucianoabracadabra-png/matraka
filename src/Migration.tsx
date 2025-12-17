import { useState } from 'react';
import { supabase } from './supabaseClient';

const JSON_FILES = [
  'MacroLuciano.json',
  'RioMinhaPasta.json',
  'RioMinhasMacros.json',
  'RioPersonal.json',
  'Geraldim.json',
  'GeraldimBetGuardians.json',
];

export function Migration() {
  const [userId, setUserId] = useState('');
  const [status, setStatus] = useState('Aguardando...');
  const [isMigrating, setIsMigrating] = useState(false);

  const handleMigration = async () => {
    if (!userId) {
      alert('Por favor, cole o User UID do Supabase primeiro!');
      return;
    }

    setIsMigrating(true);
    setStatus('Iniciando leitura dos arquivos...');

    let totalInserted = 0;
    let errors = 0;

    for (const fileName of JSON_FILES) {
      try {
        setStatus(`Lendo ${fileName}...`);
        const response = await fetch(`/${fileName}`);
        const data = await response.json();

        if (data.folders && data.folders.length > 0) {
          const folder = data.folders[0];
          // Pega snippets ou prompts
          const items = folder.snippets || folder.prompts || [];
          const folderAppType = folder.app || 'TEXT';

          // Prepara os dados para o formato do Banco
          const macrosToInsert = items.map((item: any) => ({
            user_id: userId, // O ID que você copiou
            title: item.name,
            content: item.text,
            html_preview: item.html || null,
            shortcut: item.shortcut,
            type: item.type || 'text',
            app_category: item.app || folderAppType, // Herda da pasta se não tiver
            is_public: true // Vamos deixar público por padrão para testar
          }));

          if (macrosToInsert.length > 0) {
            const { error } = await supabase.from('macros').insert(macrosToInsert);
            
            if (error) {
              console.error(`Erro ao inserir ${fileName}:`, error);
              errors++;
            } else {
              totalInserted += macrosToInsert.length;
            }
          }
        }
      } catch (err) {
        console.error(`Erro ao processar arquivo ${fileName}`, err);
        errors++;
      }
    }

    setStatus(`Finalizado! ${totalInserted} macros inseridas. Erros: ${errors}`);
    setIsMigrating(false);
    
    // Recarrega a página para ver os dados novos
    setTimeout(() => {
        window.location.reload();
    }, 2000);
  };

  return (
    <div style={{
      padding: '2rem',
      background: '#0f172a',
      border: '1px solid #334155',
      borderRadius: '12px',
      margin: '2rem auto',
      maxWidth: '600px',
      textAlign: 'center'
    }}>
      <h2 style={{color: '#fff', marginBottom: '1rem'}}>⚡ Painel de Migração</h2>
      
      <div style={{marginBottom: '1rem'}}>
        <label style={{display: 'block', color: '#94a3b8', marginBottom: '0.5rem'}}>
          Cole o User UID aqui (Auth &gt; Users):
        </label>
        <input 
          type="text" 
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          placeholder="ex: a1b2c3d4-..."
          style={{
            width: '100%',
            padding: '0.8rem',
            background: '#1e293b',
            border: '1px solid #475569',
            color: '#fff',
            borderRadius: '6px'
          }}
        />
      </div>

      <button 
        onClick={handleMigration}
        disabled={isMigrating}
        style={{
          background: isMigrating ? '#475569' : 'linear-gradient(135deg, #10b981, #059669)',
          color: '#fff',
          border: 'none',
          padding: '1rem 2rem',
          borderRadius: '8px',
          fontWeight: 'bold',
          cursor: isMigrating ? 'not-allowed' : 'pointer',
          width: '100%'
        }}
      >
        {isMigrating ? 'Migrando...' : 'INICIAR UPLOAD PARA O BANCO'}
      </button>

      <p style={{marginTop: '1rem', color: '#cbd5e1', fontFamily: 'monospace'}}>
        Status: {status}
      </p>
    </div>
  );
}