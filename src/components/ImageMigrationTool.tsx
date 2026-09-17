import React, { useState } from 'react';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Product } from '../types';

export function ImageMigrationTool() {
  const [migrating, setMigrating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [total, setTotal] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState('');

  const addLog = (msg: string) => {
    setLogs(prev => [...prev, msg]);
  };

  const uploadToImgbb = async (base64Data: string, key: string) => {
    // Extraer solo la parte base64 sin el prefijo data:image/...;base64,
    const base64Clean = base64Data.split(',')[1];
    
    const formData = new FormData();
    formData.append('image', base64Clean);
    
    const response = await fetch(`https://api.imgbb.com/1/upload?key=${key}`, {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      throw new Error(`ImgBB API error: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.data.url; // Retorna la URL directa de la imagen
  };

  const startMigration = async () => {
    setMigrating(true);
    setProgress(0);
    setLogs([]);
    setError(null);

    try {
      addLog("Obteniendo todas las figuras...");
      const snapshot = await getDocs(collection(db, 'figures'));
      const figures: Product[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
      
      const figuresToMigrate = figures.filter(f => f.imageUrls?.some(url => url.startsWith('data:image/')));
      setTotal(figuresToMigrate.length);
      addLog(`Se encontraron ${figuresToMigrate.length} figuras con imágenes en Base64.`);

      let migratedCount = 0;

      for (const figure of figuresToMigrate) {
        addLog(`Migrando figura "${figure.title}" (${figure.id})...`);
        const updatedUrls: string[] = [];

        for (let i = 0; i < (figure.imageUrls?.length || 0); i++) {
          const url = figure.imageUrls![i];
          if (url.startsWith('data:image/')) {
            try {
              addLog(`  -> Subiendo imagen ${i + 1} a ImgBB (Cuenta vinculada)...`);
              const downloadUrl = await uploadToImgbb(url, apiKey.trim());
              updatedUrls.push(downloadUrl);
              addLog(`  -> Subida exitosa: ${downloadUrl}`);
              
              // Pequeña pausa para no saturar la API gratuita
              await new Promise(r => setTimeout(r, 1000));
            } catch (err: any) {
               addLog(`  -> Error subiendo imagen ${i + 1}: ${err.message}`);
               updatedUrls.push(url); // conservar la original si falla
            }
          } else {
            updatedUrls.push(url);
          }
        }

        // Actualizar Firestore
        addLog(`  -> Actualizando documento Firestore...`);
        await updateDoc(doc(db, 'figures', figure.id), {
          imageUrls: updatedUrls
        });

        migratedCount++;
        setProgress(migratedCount);
      }

      addLog("¡Migración completada exitosamente!");
    } catch (err: any) {
      setError(err.message);
      addLog(`Error fatal: ${err.message}`);
    } finally {
      setMigrating(false);
    }
  };

  return (
    <div className="p-6 bg-surface-container rounded-xl space-y-4 max-w-4xl mx-auto mt-8">
      <div className="flex items-center gap-3">
        <div className="p-3 bg-primary/10 text-primary rounded-xl">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-on-surface">Herramienta de Migración a ImgBB</h2>
      </div>
      
      <p className="text-on-surface-variant text-sm leading-relaxed">
        Como Firebase Storage requiere tarjeta, esta herramienta subirá automáticamente tus imágenes pesadas en Base64 al servicio gratuito <b>ImgBB</b>. 
        Para guardar las imágenes en tu propia cuenta (y así tener el control total sobre ellas), necesitas crear una clave API gratuita.
      </p>

      {!migrating && total === 0 && logs.length === 0 && (
        <div className="pt-4 space-y-5 bg-surface-container-high p-5 rounded-lg border border-outline-variant/30">
          <div>
            <label className="block text-sm font-bold text-on-surface mb-2">
              Tu API Key de ImgBB
            </label>
            <input
              type="text"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Ej: 5e8c1ab998f4e24eb4f9408e..."
              className="w-full px-4 py-2 bg-surface text-on-surface border border-outline rounded-lg focus:outline-none focus:border-primary transition-colors"
            />
            <p className="text-xs text-on-surface-variant mt-2 leading-relaxed">
              1. Entra a <a href="https://api.imgbb.com/" target="_blank" rel="noreferrer" className="text-primary hover:underline font-semibold">api.imgbb.com</a> y crea una cuenta.<br />
              2. Crea una "Client API Key" y pégala aquí arriba.<br />
              3. ¡Listo! Todas las imágenes se guardarán en tu galería de ImgBB para siempre.
            </p>
          </div>
          
          <button 
            onClick={startMigration}
            disabled={!apiKey.trim()}
            className="px-6 py-3 bg-primary text-on-primary rounded-lg font-semibold shadow hover:bg-primary/90 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Iniciar Análisis y Migración
          </button>
        </div>
      )}

      {migrating && (
        <div className="space-y-2 pt-2">
          <p className="text-primary font-medium text-sm">Procesando... {progress} de {total} figuras migradas.</p>
          <div className="w-full bg-outline-variant/30 rounded-full h-2 overflow-hidden">
            <div 
              className="bg-primary h-2 rounded-full transition-all duration-300" 
              style={{ width: total > 0 ? `${(progress / total) * 100}%` : '0%' }}
            ></div>
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 bg-error/10 text-error rounded-lg text-sm">
          <p className="font-semibold mb-1">Hubo un problema:</p>
          {error}
        </div>
      )}

      {logs.length > 0 && (
        <div className="mt-6 p-4 bg-[#1e1e1e] rounded-lg h-80 overflow-y-auto font-mono text-[11px] sm:text-xs text-green-400 space-y-1 shadow-inner border border-black/20">
          {logs.map((log, idx) => (
            <div key={idx} className={`${log.includes('Error') ? 'text-red-400' : log.includes('Exitosa') ? 'text-blue-300' : ''}`}>
              <span className="opacity-50 mr-2">[{new Date().toLocaleTimeString()}]</span>
              {log}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
