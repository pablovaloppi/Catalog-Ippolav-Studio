import React, { useState, useEffect, useRef } from 'react';
import { X, MessageCircle, HelpCircle, View, ChevronLeft, ChevronRight, Heart, ZoomIn, ZoomOut, RotateCcw, Share2, Check } from 'lucide-react';
import { Product, SiteConfig } from '../types';
import { getOptimizedCloudinaryUrl, getCloudinarySrcSet } from '../cloudinaryUtils';
import { shareFigure } from '../urlUtils';

interface ProductModalProps {
  product: Product | null;
  categoryName?: string;
  designerName?: string;
  onClose: () => void;
  config?: SiteConfig | null;
  isLiked?: boolean;
  onToggleLike?: (productId: string) => void;
  initialFullScreen?: boolean;
  initialImageIndex?: number;
}

export function ProductModal({ 
  product, 
  categoryName, 
  designerName, 
  onClose, 
  config, 
  isLiked, 
  onToggleLike,
  initialFullScreen = false,
  initialImageIndex = 0
}: ProductModalProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(initialImageIndex);
  const [isFullScreen, setIsFullScreen] = useState(initialFullScreen);
  const [shareStatus, setShareStatus] = useState<'idle' | 'copied' | 'shared'>('idle');
  const startFullScreenRef = useRef(initialFullScreen);
  
  // Manejador para compartir mediante la Web Share API nativa (con fallback a portapapeles)
  const handleShare = async () => {
    if (!product) return;
    const res = await shareFigure(product, categoryName);
    if (res.shared || res.method === 'clipboard') {
      setShareStatus('copied');
      setTimeout(() => {
        setShareStatus('idle');
      }, 2500);
    }
  };
  
  // Estados para Zoom y Pan (correr la imagen para ver partes ampliadas)
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isInteracting, setIsInteracting] = useState(false);

  const scaleRef = useRef(1);
  scaleRef.current = scale;
  const panRef = useRef({ x: 0, y: 0 });
  panRef.current = pan;

  const fullscreenContainerRef = useRef<HTMLDivElement>(null);
  const lastTapTimeRef = useRef<number>(0);
  const lastTapPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const touchStartPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const panStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const pinchStartDistRef = useRef<number>(0);
  const pinchStartScaleRef = useRef<number>(1);
  const isPinchingRef = useRef<boolean>(false);
  const touchMovedRef = useRef<boolean>(false);
  const lastTouchActionTimeRef = useRef<number>(0);

  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const isFullScreenRef = useRef(false);
  isFullScreenRef.current = isFullScreen;
  const isClosingFullScreenManually = useRef(false);
  const isClosingModalManually = useRef(false);
  const closedByHistoryRef = useRef(false);

  // Cálculo de límites máximos de desplazamiento (pan)
  const getMaxPan = (currentScale: number) => {
    if (!fullscreenContainerRef.current || currentScale <= 1) {
      return { maxX: 0, maxY: 0 };
    }
    const rect = fullscreenContainerRef.current.getBoundingClientRect();
    const maxX = Math.max(0, (rect.width * (currentScale - 1)) / 2);
    const maxY = Math.max(0, (rect.height * (currentScale - 1)) / 2);
    return { maxX, maxY };
  };

  const resetZoom = () => {
    setScale(1);
    setPan({ x: 0, y: 0 });
  };

  // Reset de zoom al cambiar de imagen
  useEffect(() => {
    resetZoom();
  }, [currentImageIndex]);

  // Apertura de zoom apilando un estado en el historial
  const openFullScreen = () => {
    resetZoom();
    setIsFullScreen(true);
    window.history.pushState({ modal: 'image-zoom', productId: product?.id }, '');
  };

  // Cierre de zoom manual
  const closeFullScreen = () => {
    resetZoom();
    if (isFullScreenRef.current) {
      setIsFullScreen(false);
      if (startFullScreenRef.current) {
        closeModal();
      } else if (window.history.state?.modal === 'image-zoom') {
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
    setCurrentImageIndex(initialImageIndex);
    setIsFullScreen(initialFullScreen);
    startFullScreenRef.current = initialFullScreen;
    closedByHistoryRef.current = false;
    isClosingFullScreenManually.current = false;
    isClosingModalManually.current = false;

    // Bloquear scroll de fondo en la web mientras el modal está abierto
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Insertar estado de la figura en el historial
    window.history.pushState({ modal: 'product-modal', productId: product.id }, '');
    if (initialFullScreen) {
      window.history.pushState({ modal: 'image-zoom', productId: product.id }, '');
    }

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
        if (startFullScreenRef.current) {
          closedByHistoryRef.current = true;
          onClose();
        }
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

  const handleDoubleTapOrClick = (clientX: number, clientY: number) => {
    if (scaleRef.current > 1.05) {
      resetZoom();
    } else {
      const targetScale = 2.5;
      if (fullscreenContainerRef.current) {
        const rect = fullscreenContainerRef.current.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const dx = clientX - cx;
        const dy = clientY - cy;
        const targetX = -dx * (targetScale - 1);
        const targetY = -dy * (targetScale - 1);
        const { maxX, maxY } = getMaxPan(targetScale);
        setScale(targetScale);
        setPan({
          x: Math.min(maxX, Math.max(-maxX, targetX)),
          y: Math.min(maxY, Math.max(-maxY, targetY)),
        });
      } else {
        setScale(targetScale);
      }
    }
  };

  const handleOverlayTouchStart = (e: React.TouchEvent) => {
    lastTouchActionTimeRef.current = Date.now();

    if (e.touches.length === 2) {
      // Inicio de Pinch con dos dedos
      isPinchingRef.current = true;
      setIsInteracting(true);
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      pinchStartDistRef.current = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      pinchStartScaleRef.current = scaleRef.current;
      return;
    }

    if (e.touches.length === 1) {
      isPinchingRef.current = false;
      const touch = e.touches[0];
      touchStartPosRef.current = { x: touch.clientX, y: touch.clientY };
      panStartRef.current = { ...panRef.current };
      touchMovedRef.current = false;
      if (scaleRef.current > 1.05) {
        setIsInteracting(true);
      }
    }
  };

  const handleOverlayTouchMove = (e: React.TouchEvent) => {
    lastTouchActionTimeRef.current = Date.now();

    if (e.touches.length === 2 && isPinchingRef.current) {
      // Zoom por gesto de pinza (pinch)
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      if (pinchStartDistRef.current > 0) {
        const factor = dist / pinchStartDistRef.current;
        const nextScale = Math.min(4, Math.max(1, pinchStartScaleRef.current * factor));
        setScale(nextScale);
        if (nextScale <= 1) {
          setPan({ x: 0, y: 0 });
        } else {
          const { maxX, maxY } = getMaxPan(nextScale);
          setPan((prev) => ({
            x: Math.min(maxX, Math.max(-maxX, prev.x)),
            y: Math.min(maxY, Math.max(-maxY, prev.y)),
          }));
        }
      }
      return;
    }

    if (e.touches.length === 1 && !isPinchingRef.current) {
      const touch = e.touches[0];
      const dx = touch.clientX - touchStartPosRef.current.x;
      const dy = touch.clientY - touchStartPosRef.current.y;

      if (Math.hypot(dx, dy) > 8) {
        touchMovedRef.current = true;
      }

      if (scaleRef.current > 1.05) {
        // CORRER LA IMAGEN (Desplazamiento / Pan fluido en todas direcciones)
        const nextX = panStartRef.current.x + dx;
        const nextY = panStartRef.current.y + dy;
        const { maxX, maxY } = getMaxPan(scaleRef.current);
        setPan({
          x: Math.min(maxX, Math.max(-maxX, nextX)),
          y: Math.min(maxY, Math.max(-maxY, nextY)),
        });
      }
    }
  };

  const handleOverlayTouchEnd = (e: React.TouchEvent) => {
    lastTouchActionTimeRef.current = Date.now();
    setIsInteracting(false);

    if (isPinchingRef.current) {
      if (e.touches.length < 2) {
        isPinchingRef.current = false;
      }
      return;
    }

    const changedTouch = e.changedTouches[0];
    if (!changedTouch) return;

    const dx = changedTouch.clientX - touchStartPosRef.current.x;
    const dy = changedTouch.clientY - touchStartPosRef.current.y;
    const movedDistance = Math.hypot(dx, dy);

    // Si fue un toque sin arrastrar (tap)
    if (movedDistance < 15) {
      const now = Date.now();
      const timeSinceLastTap = now - lastTapTimeRef.current;
      const distFromLastTap = Math.hypot(
        changedTouch.clientX - lastTapPosRef.current.x,
        changedTouch.clientY - lastTapPosRef.current.y
      );

      // Doble toque detectado
      if (timeSinceLastTap > 40 && timeSinceLastTap < 380 && distFromLastTap < 55) {
        lastTapTimeRef.current = 0;
        lastTapPosRef.current = { x: 0, y: 0 };
        handleDoubleTapOrClick(changedTouch.clientX, changedTouch.clientY);
        return;
      }

      lastTapTimeRef.current = now;
      lastTapPosRef.current = { x: changedTouch.clientX, y: changedTouch.clientY };

      // Un solo toque NO hace zoom
      return;
    }

    // Si la imagen no está en zoom (1x), swipe horizontal cambia de imagen
    if (scaleRef.current <= 1.05) {
      const minSwipeDistance = 50;
      if (dx < -minSwipeDistance) {
        handleNextImage();
      } else if (dx > minSwipeDistance) {
        handlePrevImage();
      }
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (Date.now() - lastTouchActionTimeRef.current < 800) return;
    if (e.button !== 0) return;
    touchStartPosRef.current = { x: e.clientX, y: e.clientY };
    panStartRef.current = { ...panRef.current };
    touchMovedRef.current = false;
    if (scaleRef.current > 1.05) {
      setIsInteracting(true);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (Date.now() - lastTouchActionTimeRef.current < 800) return;
    if (!isInteracting || scaleRef.current <= 1.05) return;
    const dx = e.clientX - touchStartPosRef.current.x;
    const dy = e.clientY - touchStartPosRef.current.y;
    if (Math.hypot(dx, dy) > 4) touchMovedRef.current = true;

    const nextX = panStartRef.current.x + dx;
    const nextY = panStartRef.current.y + dy;
    const { maxX, maxY } = getMaxPan(scaleRef.current);
    setPan({
      x: Math.min(maxX, Math.max(-maxX, nextX)),
      y: Math.min(maxY, Math.max(-maxY, nextY)),
    });
  };

  const handleMouseUp = () => {
    setIsInteracting(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.15 : 0.87;
    const nextScale = Math.min(4, Math.max(1, scaleRef.current * factor));
    setScale(nextScale);
    if (nextScale <= 1) {
      setPan({ x: 0, y: 0 });
    } else {
      const { maxX, maxY } = getMaxPan(nextScale);
      setPan((prev) => ({
        x: Math.min(maxX, Math.max(-maxX, prev.x)),
        y: Math.min(maxY, Math.max(-maxY, prev.y)),
      }));
    }
  };

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
                    ? 'bg-rose-950/80 border-rose-500/70 text-rose-300 shadow-sm shadow-rose-950/50'
                    : 'bg-surface-container border-outline-variant/40 text-on-surface hover:text-rose-400 hover:border-rose-500/40'
                }`}
                title={isLiked ? 'Quitar de tus favoritos guardados' : 'Guardar en tus favoritos'}
              >
                <Heart className={`w-3.5 h-3.5 transition-transform ${isLiked ? 'fill-rose-500 text-rose-500 scale-105' : ''}`} />
                <span>{isLiked ? 'Guardado en Favoritos' : 'Favorito'} ({product.likesCount || 0})</span>
              </button>
            )}
            <button
              type="button"
              onClick={handleShare}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all active:scale-95 border ${
                shareStatus === 'copied'
                  ? 'bg-emerald-950/80 border-emerald-500/70 text-emerald-300 shadow-sm shadow-emerald-950/50'
                  : 'bg-surface-container border-outline-variant/40 text-on-surface hover:text-primary hover:border-primary/50'
              }`}
              title="Compartir enlace directo a esta figura"
            >
              {shareStatus === 'copied' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>¡Enlace copiado!</span>
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5 text-primary" />
                  <span>Compartir</span>
                </>
              )}
            </button>
          </div>
        </div>

        <div 
          className="relative aspect-[4/3] rounded-lg overflow-hidden bg-surface-container-lowest border border-outline-variant/30 group select-none"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEndEvent}
        >
          <button 
            type="button" 
            onClick={() => {
              openFullScreen();
            }} 
            className="w-full h-full cursor-zoom-in"
          >
            <img 
              src={getOptimizedCloudinaryUrl(currentImageUrl, 1400, 'good')} 
              srcSet={getCloudinarySrcSet(currentImageUrl, [720, 960, 1200, 1600, 2000], 'good')}
              sizes="(max-width: 768px) 100vw, 700px"
              alt={product.title} 
              loading="eager"
              decoding="async"
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
                <img 
                  src={getOptimizedCloudinaryUrl(url, 240, 'good')} 
                  alt={`Vista ${i + 1}`} 
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover hover:scale-110 transition-transform pointer-events-none" 
                />
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
            <span className="text-[10px] font-bold text-outline uppercase block">Escala</span>
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

          <button
            type="button"
            onClick={handleShare}
            className={`w-full text-xs font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 border transition-all active:scale-95 shadow-sm ${
              shareStatus === 'copied'
                ? 'bg-emerald-950/70 border-emerald-500/80 text-emerald-300'
                : 'bg-surface-container hover:bg-surface-container-high border-outline-variant/40 hover:border-primary/50 text-on-surface'
            }`}
          >
            {shareStatus === 'copied' ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                <span>¡Enlace directo a la figura copiado!</span>
              </>
            ) : (
              <>
                <Share2 className="w-4 h-4 text-primary" />
                <span>Compartir enlace a esta pieza</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Full screen image overlay con Zoom por Pinch/Doble-Toque y Desplazamiento (Pan) */}
      {isFullScreen && (
        <div 
          ref={fullscreenContainerRef}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-md overflow-hidden select-none touch-none"
          onClick={(e) => {
            if (Date.now() - lastTouchActionTimeRef.current < 800) return;
            // Clic en el fondo cuando no hay zoom o cuando no se estaba arrastrando
            if (e.target === e.currentTarget && scale <= 1.05 && !touchMovedRef.current) {
              closeFullScreen();
            }
          }}
          onTouchStart={handleOverlayTouchStart}
          onTouchMove={handleOverlayTouchMove}
          onTouchEnd={handleOverlayTouchEnd}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onWheel={handleWheel}
        >
          {/* Botón cerrar */}
          <button 
            className="absolute top-5 right-5 text-on-surface-variant hover:text-white bg-surface-container/60 hover:bg-surface-container p-2.5 rounded-full transition-colors z-30 shadow-lg"
            onClick={(e) => { e.stopPropagation(); closeFullScreen(); }}
            title="Cerrar vista completa (Esc)"
          >
            <X className="w-6 h-6" />
          </button>
          
          {/* Botones de navegación de imágenes */}
          {product.imageUrls && product.imageUrls.length > 1 && (
            <>
              <button 
                onClick={handlePrevImage}
                className={`absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/90 transition-all z-30 shadow-lg ${scale > 1.2 ? 'opacity-30 hover:opacity-100' : 'opacity-80 hover:opacity-100'}`}
                title="Imagen anterior"
              >
                <ChevronLeft className="w-8 h-8" />
              </button>
              <button 
                onClick={handleNextImage}
                className={`absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/90 transition-all z-30 shadow-lg ${scale > 1.2 ? 'opacity-30 hover:opacity-100' : 'opacity-80 hover:opacity-100'}`}
                title="Imagen siguiente"
              >
                <ChevronRight className="w-8 h-8" />
              </button>
              
              <div className="absolute top-6 left-6 flex items-center gap-1.5 z-30 bg-black/50 backdrop-blur-sm px-3 py-1 rounded-full border border-white/10 text-xs text-white/80 font-mono">
                <span>{currentImageIndex + 1}</span>
                <span>/</span>
                <span>{product.imageUrls.length}</span>
              </div>
            </>
          )}

          {/* Contenedor interactivo de la imagen con soporte de pan y zoom */}
          <div 
            className="w-full h-full flex items-center justify-center pointer-events-auto"
            onDoubleClick={(e) => {
              e.stopPropagation();
              if (Date.now() - lastTouchActionTimeRef.current < 800) return;
              handleDoubleTapOrClick(e.clientX, e.clientY);
            }}
          >
            <img 
              src={getOptimizedCloudinaryUrl(currentImageUrl, 2400, 'best')} 
              alt="Vista Completa" 
              draggable={false}
              decoding="async"
              className="max-w-full max-h-[92vh] object-contain select-none will-change-transform"
              style={{
                transform: `translate3d(${pan.x}px, ${pan.y}px, 0px) scale(${scale})`,
                transition: isInteracting ? 'none' : 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                cursor: scale > 1.05 ? (isInteracting ? 'grabbing' : 'grab') : 'zoom-in',
              }}
            />
          </div>

          {/* Barra inferior de controles de zoom y guía visual */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 z-30 pointer-events-auto">
            <div className="flex items-center gap-1.5 bg-surface-container/85 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-outline-variant/50 shadow-2xl">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const nextScale = Math.max(1, scale - 0.5);
                  setScale(nextScale);
                  if (nextScale <= 1) setPan({ x: 0, y: 0 });
                }}
                disabled={scale <= 1.05}
                className="p-1.5 rounded-full hover:bg-white/15 disabled:opacity-30 text-white transition-colors"
                title="Alejar (-)"
              >
                <ZoomOut className="w-4 h-4" />
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (scale > 1.05) {
                    resetZoom();
                  } else {
                    handleDoubleTapOrClick(window.innerWidth / 2, window.innerHeight / 2);
                  }
                }}
                className="px-2 py-0.5 font-mono text-xs font-bold text-primary hover:text-primary/80 transition-colors"
                title="Alternar zoom"
              >
                {Math.round(scale * 100)}%
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const nextScale = Math.min(4, scale + 0.5);
                  setScale(nextScale);
                }}
                disabled={scale >= 4}
                className="p-1.5 rounded-full hover:bg-white/15 disabled:opacity-30 text-white transition-colors"
                title="Acercar (+)"
              >
                <ZoomIn className="w-4 h-4" />
              </button>

              {scale > 1.05 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    resetZoom();
                  }}
                  className="flex items-center gap-1 ml-1 pl-2 border-l border-white/20 text-[11px] text-on-surface-variant hover:text-white transition-colors"
                  title="Restablecer vista a 100%"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Restablecer</span>
                </button>
              )}
            </div>

            <span className="text-[10px] text-on-surface-variant/80 font-medium bg-black/40 px-3 py-0.5 rounded-full backdrop-blur-sm pointer-events-none hidden sm:inline-block">
              {scale > 1.05 ? 'Arrastra para recorrer la escultura • Doble toque para 1x' : 'Pellizca con 2 dedos o toca 2 veces para zoom'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
