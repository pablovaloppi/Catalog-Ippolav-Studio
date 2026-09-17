import React, { useState } from 'react';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Product, SiteConfig } from '../types';

export function ImageMigrationTool({ config }: { config?: SiteConfig }) {
  const [migrating, setMigrating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [total, setTotal] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const addLog = (msg: string) => {
    setLogs(prev => [...prev, msg]);
  };

  const uploadToCloudinary = async (fileData: string) => {
    if (!config?.cloudinaryCloudName || !config?.cloudinaryUploadPreset) {
      throw new Error('Cloudinary no está configurado en la pestaña de Configuración.');
    }

    const cloudName = config.cloudinaryCloudName.trim();
    const uploadPreset = config.cloudinaryUploadPreset.trim();

    const formData = new FormData();
    formData.append('file', fileData);
    formData.append('upload_preset', uploadPreset);
    
    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      let errorMsg = response.statusText;
      try {
        const errData = await response.json();
        if (errData.error?.message) {
          errorMsg = errData.error.message;
        }
      } catch (e) {}
      throw new Error(errorMsg);
    }
    
    const data = await response.json();
    // Insertamos f_auto (formato automático) y q_auto (compresión inteligente) a la URL final
    const optimizedUrl = data.secure_url.replace('/upload/', '/upload/f_auto,q_auto/');
    return optimizedUrl;
  };

  const startMigration = async () => {
    if (!config?.cloudinaryCloudName || !config?.cloudinaryUploadPreset) {
      setError('Por favor, ve a la pestaña "Configuración" y completa los datos de Cloud Name y Upload Preset de Cloudinary primero.');
      return;
    }

    setMigrating(true);
    setProgress(0);
    setLogs([]);
    setError(null);

    try {
      addLog("Obteniendo todas las figuras...");
      const snapshot = await getDocs(collection(db, 'figures'));
      const figures: Product[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
      
      const figuresToMigrate = figures.filter(f => f.imageUrls?.some(url => url.startsWith('data:image/') || url.includes('i.ibb.co') || url.includes('imgbb.com')));
      setTotal(figuresToMigrate.length);
      addLog(`Se encontraron ${figuresToMigrate.length} figuras con imágenes en Base64 o ImgBB.`);

      let migratedCount = 0;

      for (const figure of figuresToMigrate) {
        addLog(`Migrando figura "${figure.title}" (${figure.id})...`);
        const updatedUrls: string[] = [];
        
        // Extraer las URLs actuales que son base64 para subirlas en paralelo
        const uploadPromises = figure.imageUrls?.map(async (url, index) => {
          const isBase64 = url.startsWith('data:image/');
          const isImgbb = url.includes('i.ibb.co') || url.includes('imgbb.com');

          if (isBase64 || isImgbb) {
             try {
               addLog(`  -> Iniciando migración de imagen ${index + 1}...`);
               
               const downloadUrl = await uploadToCloudinary(url);
               addLog(`  -> Subida a Cloudinary exitosa: imagen ${index + 1}`);
               return downloadUrl;
             } catch (err: any) {
               addLog(`  -> Error migrando imagen ${index + 1}: ${err.message}`);
               return url; // conservar original si falla
             }
          }
          return url;
        }) || [];

        // Esperar a que terminen todas las imágenes de esta figura en paralelo
        const resolvedUrls = await Promise.all(uploadPromises);
        updatedUrls.push(...resolvedUrls);

        // Actualizar Firestore
        addLog(`  -> Actualizando documento Firestore...`);
        await updateDoc(doc(db, 'figures', figure.id), {
          imageUrls: updatedUrls
        });

        // Pequeña pausa opcional (50ms) entre figuras para no asfixiar el navegador
        await new Promise(r => setTimeout(r, 50));

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

  const isConfigured = Boolean(config?.cloudinaryCloudName && config?.cloudinaryUploadPreset);

  return (
    <div className="p-6 bg-surface-container rounded-xl space-y-4 max-w-4xl mx-auto mt-8">
      <div className="flex items-center gap-3">
        <div className="p-3 bg-primary/10 text-primary rounded-xl">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-on-surface">Migración a Cloudinary</h2>
      </div>
      
      <p className="text-on-surface-variant text-sm leading-relaxed">
        Cloudinary es la mejor opción profesional y gratuita para alojar imágenes. Optimiza automáticamente el formato (WebP/AVIF) y hace que tu web cargue instantáneamente.
      </p>

      {!isConfigured ? (
        <div className="p-5 bg-amber-500/10 border border-amber-500/30 rounded-xl">
          <h3 className="text-amber-500 font-bold mb-2">Falta configurar Cloudinary</h3>
          <p className="text-sm text-on-surface-variant mb-4">
            Para poder subir tus imágenes, primero debes configurar tus credenciales en la pestaña de <b>Configuración</b> del panel.
          </p>
          <ol className="text-sm text-on-surface-variant list-decimal ml-5 space-y-2">
            <li>Crea una cuenta gratuita en <a href="https://cloudinary.com/" target="_blank" rel="noreferrer" className="text-primary hover:underline">cloudinary.com</a>.</li>
            <li>En tu Dashboard, copia tu <b>Cloud Name</b>.</li>
            <li>Ve a Settings &gt; Upload, y crea un <b>Upload Preset</b>. Asegúrate de marcarlo como <b>"Unsigned"</b>.</li>
            <li>Pega ambos datos en la pestaña de Configuración de este panel y regresa aquí.</li>
          </ol>
        </div>
      ) : !migrating && total === 0 && logs.length === 0 && (
        <div className="pt-4">
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
