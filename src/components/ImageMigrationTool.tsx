import React, { useState } from 'react';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';
import { Product } from '../types';

export function ImageMigrationTool() {
  const [migrating, setMigrating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [total, setTotal] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const addLog = (msg: string) => {
    setLogs(prev => [...prev, msg]);
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
              // Extraer tipo MIME y base64 puro
              const matches = url.match(/^data:(image\/\w+);base64,(.*)$/);
              let contentType = 'image/jpeg';
              if (matches && matches.length === 3) {
                contentType = matches[1];
              }
              const extension = contentType.split('/')[1] || 'jpg';
              
              const imageRef = ref(storage, `figures/${figure.id}/image_${i}_${Date.now()}.${extension}`);
              addLog(`  -> Subiendo imagen ${i + 1} a Storage...`);
              
              await uploadString(imageRef, url, 'data_url');
              const downloadUrl = await getDownloadURL(imageRef);
              updatedUrls.push(downloadUrl);
              addLog(`  -> Subida exitosa.`);
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
        <h2 className="text-xl font-bold text-on-surface">Herramienta de Migración a Storage</h2>
      </div>
      
      <p className="text-on-surface-variant text-sm leading-relaxed">
        Si ves que la aplicación carga lento o consume muchos datos, es porque hay figuras con imágenes guardadas directamente en el texto de la base de datos (Base64). 
        Esta herramienta detectará automáticamente esas imágenes, las subirá de forma segura a <b>Firebase Storage</b> y actualizará tu base de datos para usar enlaces rápidos y optimizados.
      </p>

      {!migrating && total === 0 && logs.length === 0 && (
        <div className="pt-2">
          <button 
            onClick={startMigration}
            className="px-6 py-3 bg-primary text-on-primary rounded-lg font-semibold shadow hover:bg-primary/90 transition-all flex items-center gap-2"
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
          <div className="mt-3 text-xs opacity-90 p-3 bg-error/20 rounded">
            <strong>⚠️ IMPORTANTE:</strong> Si el error indica "unauthorized" o "CORS", debes asegurarte de ir a la consola de Firebase:
            <ul className="list-disc ml-5 mt-1">
              <li>Ir a <b>Storage</b> y darle click a "Comenzar" (si aún no lo has activado).</li>
              <li>Asegurarte de que las <a href="https://console.firebase.google.com/" target="_blank" rel="noreferrer" className="underline font-bold">Reglas de Seguridad (Rules)</a> de Storage permitan escritura temporalmente.</li>
            </ul>
          </div>
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
