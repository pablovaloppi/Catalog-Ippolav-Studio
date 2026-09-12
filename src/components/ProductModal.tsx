import { useState } from 'react';
import { X, MessageCircle, HelpCircle, View } from 'lucide-react';
import { Product } from '../types';

interface ProductModalProps {
  product: Product | null;
  categoryName?: string;
  designerName?: string;
  onClose: () => void;
}

export function ProductModal({ product, categoryName, designerName, onClose }: ProductModalProps) {
  const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);

  if (!product) return null;

  const getStatusText = (status: string) => {
    switch (status) {
      case 'disponible': return 'Disponible para reserva';
      case 'consultar': return 'Edición por encargo / Consultar';
      case 'proximamente': return 'En lista de espera';
      default: return 'Consultar disponibilidad';
    }
  };

  const whatsappMessage = encodeURIComponent(`Hola IPPOLAV STUDIO, me interesa encargar la figura ${product.title}. ¿Tienen disponibilidad?`);

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/85 backdrop-blur-md p-0 md:p-6 transition-opacity duration-300">
      <div className="bg-surface-container-low w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-t-2xl md:rounded-xl border border-primary/30 shadow-2xl p-6 relative space-y-6 animate-in slide-in-from-bottom-4 fade-in duration-300">
        
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-surface-container flex items-center justify-center text-on-surface hover:text-primary border border-outline-variant/40"
        >
          <X className="w-5 h-5" />
        </button>

        <div>
          <span className="text-[10px] font-bold text-primary tracking-widest uppercase">{categoryName || product.franchiseId}</span>
          <h2 className="font-serif text-2xl font-semibold text-on-surface mt-1">{product.title}</h2>
          <div className="flex items-center gap-2 mt-1">
            <span className="w-2 h-2 rounded-full bg-primary"></span>
            <span className="text-xs font-semibold text-primary">{getStatusText(product.status)}</span>
          </div>
        </div>

        <div className="relative aspect-[4/3] rounded-lg overflow-hidden bg-surface-container-lowest border border-outline-variant/30">
          <button type="button" onClick={() => setFullScreenImage(product.imageUrls?.[0] || null)} className="w-full h-full cursor-zoom-in">
            <img src={product.imageUrls?.[0] || ''} alt={product.title} className="w-full h-full object-cover transition-transform hover:scale-105" />
          </button>
          <div className="absolute bottom-2 right-2 bg-black/75 px-2.5 py-1 rounded text-xs text-on-surface font-mono border border-primary/30 pointer-events-none">
            ACABADO PREMIUM
          </div>
        </div>

        <div className="space-y-2">
          <span className="text-[10px] font-bold text-outline uppercase tracking-wider block">Ángulos y Detalles de Escultura</span>
          <div className="flex gap-2 overflow-x-auto pb-2 snap-x">
            {product.imageUrls?.map((url, i) => (
              <button key={i} onClick={() => setFullScreenImage(url)} className={`flex-shrink-0 w-20 aspect-square rounded border ${i === 0 ? 'border-primary' : 'border-outline-variant/40 hover:border-primary'} overflow-hidden bg-surface-container-lowest transition-all snap-start cursor-zoom-in`}>
                <img src={url} alt={`Vista ${i + 1}`} className="w-full h-full object-cover hover:scale-110 transition-transform" />
              </button>
            ))}
            <div className="flex-shrink-0 w-20 aspect-square rounded border border-dashed border-outline-variant/50 flex flex-col items-center justify-center text-center p-1 text-outline">
              <View className="w-5 h-5 mb-1" />
              <span className="text-[9px] font-mono leading-none">360° VIEW</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 p-3.5 bg-surface-container rounded-lg border border-outline-variant/30">
          <div>
            <span className="text-[10px] font-bold text-outline uppercase block">Escala & Altura</span>
            <span className="text-xs font-semibold text-on-surface">{product.scale?.join(', ')}</span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-outline uppercase block">Material</span>
            <span className="text-xs font-semibold text-on-surface">{product.material}</span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-outline uppercase block">Acabado</span>
            <span className="text-xs font-semibold text-on-surface">{product.finish}</span>
          </div>
          {designerName && (
            <div>
              <span className="text-[10px] font-bold text-outline uppercase block">Diseñador</span>
              <span className="text-xs font-semibold text-on-surface">{designerName}</span>
            </div>
          )}
        </div>

        {product.description && (
          <div className="text-sm text-on-surface-variant leading-relaxed">
            {product.description}
          </div>
        )}

        <div className="space-y-2.5 pt-2">
          {product.status === 'disponible' ? (
            <a
              href={`https://wa.me/5491100000000?text=${whatsappMessage}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full gold-shimmer text-on-primary-fixed text-sm font-bold py-3.5 px-4 rounded-lg flex items-center justify-center gap-2 shadow-lg tracking-wider uppercase hover:brightness-110 active:scale-95 transition-all"
            >
              <MessageCircle className="w-5 h-5" />
              <span>Quiero esta figura</span>
            </a>
          ) : (
            <a
              href={`https://wa.me/5491100000000?text=${whatsappMessage}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full gold-shimmer text-on-primary-fixed text-sm font-bold py-3.5 px-4 rounded-lg flex items-center justify-center gap-2 shadow-lg tracking-wider uppercase hover:brightness-110 active:scale-95 transition-all"
            >
              <HelpCircle className="w-5 h-5" />
              <span>Consultar disponibilidad y tiempos</span>
            </a>
          )}
        </div>
      </div>

      {/* Full screen image overlay */}
      {fullScreenImage && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-md p-4 animate-in fade-in"
          onClick={() => setFullScreenImage(null)}
        >
          <button 
            className="absolute top-6 right-6 text-on-surface-variant hover:text-white bg-surface-container/50 hover:bg-surface-container p-2 rounded-full transition-colors"
            onClick={(e) => { e.stopPropagation(); setFullScreenImage(null); }}
          >
            <X className="w-6 h-6" />
          </button>
          <img 
            src={fullScreenImage} 
            alt="Vista Completa" 
            className="max-w-full max-h-[95vh] object-contain cursor-zoom-out"
          />
        </div>
      )}
    </div>
  );
}
