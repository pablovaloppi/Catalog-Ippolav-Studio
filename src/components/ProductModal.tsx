import React, { useState, useEffect, useRef } from 'react';
import { X, MessageCircle, HelpCircle, View, ChevronLeft, ChevronRight, Heart } from 'lucide-react';
import { Product, SiteConfig } from '../types';

interface ProductModalProps {
  product: Product | null;
  categoryName?: string;
  designerName?: string;
  onClose: () => void;
  config?: SiteConfig | null;
  isLiked?: boolean;
  onToggleLike?: (productId: string) => void;
}

export function ProductModal({ product, categoryName, designerName, onClose, config, isLiked, onToggleLike }: ProductModalProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const isFullScreenRef = useRef(false);
  isFullScreenRef.current = isFullScreen;
  const isClosingFullScreenManually = useRef(false);
  const isClosingModalManually = useRef(false);
  const closedByHistoryRef = useRef(false);

  // Apertura de zoom apilando un estado en el historial
  const openFullScreen = () => {
    setIsFullScreen(true);
    window.history.pushState({ modal: 'image-zoom', productId: product.id }, '');
  };

  // Cierre de zoom manual (botón X o tap exterior en zoom)
  const closeFullScreen = () => {
    if (isFullScreenRef.current) {
      setIsFullScreen(false);
      if (window.history.state?.modal === 'image-zoom') {
        isClosingFullScreenManually.current = true;
        window.history.back();
      }
    }
  };

  // Cierre del modal manual (botón X o tap exterior en modal)
  const closeModal = () => {
    if (isFullScreenRef.current) {
      setIsFullScreen(false);
    }
    isClosingModalManually.current = true;
    closedByHistoryRef.current = true;
    onClose();

    if (window.history.state?.modal === 'image-zoom') {
      window.history.go(-2);
    } else if (window.history.state?.modal === 'product-modal') {
      window.history.back();
    }
  };

  // Manejo del historial del navegador/móvil para retroceso en múltiples capas (zoom -> modal -> catálogo)
  useEffect(() => {
    if (!product) return;

    // Resetear índices y banderas al abrir nuevo producto
    setCurrentImageIndex(0);
    setIsFullScreen(false);
    closedByHistoryRef.current = false;
    isClosingFullScreenManually.current = false;
    isClosingModalManually.current = false;

    // Bloquear scroll de fondo en la web mientras el modal está abierto
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Insertar estado de la figura en el historial
    window.history.pushState({ modal: 'product-modal', productId: product.id }, '');

    const handlePopState = () => {
      // Si se cerró manualmente la imagen en zoom por clic en X, ignorar el popstate provocado por history.back()
      if (isClosingFullScreenManually.current) {
        isClosingFullScreenManually.current = false;
        return;
      }

      // Si se cerró manualmente el modal por clic en X o fondo, ignorar el popstate provocado por history.back()
      if (isClosingModalManually.current) {
        isClosingModalManually.current = false;
        return;
      }

      // 1. Si estaba viendo el zoom de la imagen y presionó 'Atrás' en el celular:
      if (isFullScreenRef.current) {
        // El navegador ya hizo pop de 'image-zoom' volviendo a 'product-modal'. Solo cerramos el zoom:
        setIsFullScreen(false);
        return;
      }

      // 2. Si estaba en la ventana de datos de la figura y presionó 'Atrás' en el celular:
      // El navegador ya hizo pop de 'product-modal' volviendo al catálogo. Cerramos el modal:
      closedByHistoryRef.current = true;
      onClose();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isFullScreenRef.current) {
          closeFullScreen();
        } else {
          closeModal();
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('keydown', handleKeyDown);

      // Si se desmontó sin navegación hacia atrás (ej. cambio forzado de estado del padre)
      if (!closedByHistoryRef.current && !isClosingModalManually.current) {
        if (window.history.state?.modal === 'image-zoom') {
          window.history.go(-2);
        } else if (window.history.state?.modal === 'product-modal') {
          window.history.back();
        }
      }
    };
  }, [product?.id, onClose]);

  if (!product) return null;

  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEndEvent = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    
    if (isLeftSwipe) {
      handleNextImage();
    } else if (isRightSwipe) {
      handlePrevImage();
    }
  };

  const handleNextImage = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!product?.imageUrls?.length) return;
    setCurrentImageIndex((prev) => (prev === product.imageUrls!.length - 1 ? 0 : prev + 1));
  };

  const handlePrevImage = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!product?.imageUrls?.length) return;
    setCurrentImageIndex((prev) => (prev === 0 ? product.imageUrls!.length - 1 : prev - 1));
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'disponible': return 'Disponible para reserva';
      case 'consultar': return 'Edición por encargo / Consultar';
      case 'proximamente': return 'En lista de espera';
      default: return 'Consultar disponibilidad';
    }
  };

  const baseMessage = config?.whatsappMessageTemplate 
    ? config.whatsappMessageTemplate.replace('{figura}', product.title).replace('{codigo}', product.numericId || '') 
    : `Hola IPPOLAV STUDIO, me interesa encargar la figura ${product.title}${product.numericId ? ` (${product.numericId})` : ''}. ¿Tienen disponibilidad?`;

  const whatsappMessage = encodeURIComponent(baseMessage);
  
  const whatsappNumber = config?.whatsapp || "5491100000000";
  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${whatsappMessage}`;
  
  const currentImageUrl = product.imageUrls?.[currentImageIndex] || '';

  return (
    <div 
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/85 backdrop-blur-md p-0 md:p-6 transition-opacity duration-300"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          closeModal();
        }
      }}
    >
      <div className="bg-surface-container-low w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-t-2xl md:rounded-xl border border-primary/30 shadow-2xl p-6 relative space-y-6 animate-in slide-in-from-bottom-4 fade-in duration-300">
        
        <button
          onClick={closeModal}
          className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-surface-container flex items-center justify-center text-on-surface hover:text-primary border border-outline-variant/40"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="pr-10">
          <span className="text-[10px] font-bold text-primary tracking-widest uppercase">{categoryName || product.franchiseId}</span>
          <h2 className="font-serif text-2xl font-semibold text-on-surface mt-1">{product.title}</h2>
          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-primary"></span>
              <span className="text-xs font-semibold text-primary">{getStatusText(product.status)}</span>
            </div>
            {onToggleLike && (
              <button
                type="button"
                onClick={() => onToggleLike(product.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all active:scale-95 border ${
                  isLiked
                    ? 'bg-rose-950/80 border-rose-500/60 text-rose-300'
                    : 'bg-surface-container border-outline-variant/40 text-on-surface hover:text-rose-400'
                }`}
                title={isLiked ? 'Ya te gusta esta figura (clic para quitar)' : 'Me gusta esta figura'}
              >
                <Heart className={`w-3.5 h-3.5 ${isLiked ? 'fill-rose-500 text-rose-500' : ''}`} />
                <span>{product.likesCount || 0} {product.likesCount === 1 ? 'corazón' : 'corazones'}</span>
              </button>
            )}
          </div>
        </div>

        <div 
          className="relative aspect-[4/3] rounded-lg overflow-hidden bg-surface-container-lowest border border-outline-variant/30 group select-none"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEndEvent}
        >
          <button type="button" onClick={openFullScreen} className="w-full h-full cursor-zoom-in">
            <img 
              src={currentImageUrl} 
              alt={product.title} 
              className="w-full h-full object-cover transition-transform hover:scale-105 pointer-events-none" 
            />
          </button>
          
          {product.imageUrls && product.imageUrls.length > 1 && (
            <>
              <button 
                onClick={handlePrevImage}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/75"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button 
                onClick={handleNextImage}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/75"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
              
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
                {product.imageUrls.map((_, i) => (
                  <div key={i} className={`w-1.5 h-1.5 rounded-full transition-colors ${i === currentImageIndex ? 'bg-primary' : 'bg-white/50'}`} />
                ))}
              </div>
            </>
          )}

          <div className="absolute bottom-2 right-2 bg-black/75 px-2.5 py-1 rounded text-xs text-on-surface font-mono border border-primary/30 pointer-events-none">
            ACABADO PREMIUM
          </div>
        </div>

        <div className="space-y-2">
          <span className="text-[10px] font-bold text-outline uppercase tracking-wider block">Ángulos y Detalles de Escultura</span>
          <div className="flex gap-2 overflow-x-auto pb-2 snap-x">
            {product.imageUrls?.map((url, i) => (
              <button 
                key={i} 
                onClick={() => setCurrentImageIndex(i)} 
                className={`flex-shrink-0 w-20 aspect-square rounded border ${i === currentImageIndex ? 'border-primary shadow-[0_0_8px_rgba(255,215,0,0.4)]' : 'border-outline-variant/40 hover:border-primary/70'} overflow-hidden bg-surface-container-lowest transition-all snap-start`}
              >
                <img src={url} alt={`Vista ${i + 1}`} className="w-full h-full object-cover hover:scale-110 transition-transform pointer-events-none" />
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
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full gold-shimmer text-on-primary-fixed text-sm font-bold py-3.5 px-4 rounded-lg flex items-center justify-center gap-2 shadow-lg tracking-wider uppercase hover:brightness-110 active:scale-95 transition-all"
            >
              <MessageCircle className="w-5 h-5" />
              <span>Quiero esta figura</span>
            </a>
          ) : (
            <a
              href={whatsappUrl}
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
      {isFullScreen && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-md p-4 animate-in fade-in select-none"
          onClick={closeFullScreen}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEndEvent}
        >
          <button 
            className="absolute top-6 right-6 text-on-surface-variant hover:text-white bg-surface-container/50 hover:bg-surface-container p-2 rounded-full transition-colors z-10"
            onClick={(e) => { e.stopPropagation(); closeFullScreen(); }}
          >
            <X className="w-6 h-6" />
          </button>
          
          {product.imageUrls && product.imageUrls.length > 1 && (
            <>
              <button 
                onClick={handlePrevImage}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/80 transition-colors z-10"
              >
                <ChevronLeft className="w-8 h-8" />
              </button>
              <button 
                onClick={handleNextImage}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/80 transition-colors z-10"
              >
                <ChevronRight className="w-8 h-8" />
              </button>
              
              <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2 z-10">
                {product.imageUrls.map((_, i) => (
                  <div key={i} className={`w-2 h-2 rounded-full transition-colors ${i === currentImageIndex ? 'bg-primary' : 'bg-white/50'}`} />
                ))}
              </div>
            </>
          )}

          <img 
            src={currentImageUrl} 
            alt="Vista Completa" 
            className="max-w-full max-h-[95vh] object-contain cursor-zoom-out pointer-events-none"
          />
        </div>
      )}
    </div>
  );
}
