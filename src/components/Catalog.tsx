import React, { useRef, useState, useEffect, memo } from 'react';
import { ArrowRight, PlusCircle, Heart } from 'lucide-react';
import { Product, Category } from '../types';
import { getOptimizedCloudinaryUrl, getCloudinarySrcSet } from '../cloudinaryUtils';

// Memoria global de URLs de imágenes ya cargadas durante la sesión del usuario
const globalLoadedImages = new Set<string>();

// IntersectionObserver único y compartido de alto rendimiento para el catálogo completo
type ObserverCallback = () => void;
const observerCallbacks = new Map<Element, ObserverCallback>();

let sharedImageObserver: IntersectionObserver | null = null;

function getSharedImageObserver(): IntersectionObserver | null {
  if (typeof window === 'undefined') return null;
  if (!sharedImageObserver && 'IntersectionObserver' in window) {
    sharedImageObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const callback = observerCallbacks.get(entry.target);
            if (callback) {
              callback();
              observerCallbacks.delete(entry.target);
              sharedImageObserver?.unobserve(entry.target);
            }
          }
        });
      },
      {
        root: null,
        // Anticipación de 800px: comienza a descargar ~1.5 a 2 filas antes de llegar al viewport
        rootMargin: '800px 0px 800px 0px',
        threshold: 0,
      }
    );
  }
  return sharedImageObserver;
}

function registerImageObserver(element: Element, callback: ObserverCallback): () => void {
  const observer = getSharedImageObserver();
  if (!observer) {
    callback();
    return () => {};
  }
  observerCallbacks.set(element, callback);
  observer.observe(element);

  return () => {
    observerCallbacks.delete(element);
    observer.unobserve(element);
  };
}

interface CatalogCardProps {
  product: Product;
  index: number;
  categoryName?: string;
  onSelect: (product: Product) => void;
  articleRef?: React.Ref<HTMLElement>;
  isLiked?: boolean;
  onToggleLike?: (productId: string) => void;
}

const CatalogCard = memo(function CatalogCard({
  product,
  index,
  categoryName,
  onSelect,
  articleRef,
  isLiked = false,
  onToggleLike,
}: CatalogCardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageUrl = product.imageUrls?.[0] || '';
  const isCritical = index === 0;
  const isPriority = index < 2;
  const isAlreadyCached = imageUrl ? globalLoadedImages.has(imageUrl) : false;

  const [shouldLoad, setShouldLoad] = useState<boolean>(() => isPriority || isAlreadyCached);
  const [isImageReady, setIsImageReady] = useState<boolean>(() => isAlreadyCached);

  useEffect(() => {
    if (isPriority || (imageUrl && globalLoadedImages.has(imageUrl))) {
      setShouldLoad(true);
      if (imageUrl && globalLoadedImages.has(imageUrl)) {
        setIsImageReady(true);
      }
      return;
    }

    if (shouldLoad || !imageUrl) return;

    const el = containerRef.current;
    if (!el) return;

    return registerImageObserver(el, () => {
      setShouldLoad(true);
    });
  }, [shouldLoad, isPriority, imageUrl]);

  const handleLoad = () => {
    if (imageUrl) {
      globalLoadedImages.add(imageUrl);
    }
    setIsImageReady(true);
  };

  const likesCount = product.likesCount || 0;
  const optimizedSrc = getOptimizedCloudinaryUrl(imageUrl, 600);
  const srcSet = getCloudinarySrcSet(imageUrl, [380, 520, 720, 960]);

  return (
    <article
      ref={articleRef}
      onClick={() => onSelect(product)}
      className="group bg-surface-container-low rounded-xl border border-outline-variant/30 overflow-hidden flex flex-col justify-between gold-border-glow transition-all duration-300 cursor-pointer relative"
    >
      <div ref={containerRef} className="relative aspect-[3/4] bg-surface-container-lowest overflow-hidden">
        {(!shouldLoad || !isImageReady) && (
          <div className="absolute inset-0 bg-surface-container-high/40 animate-pulse flex items-center justify-center">
            <div className="w-8 h-8 rounded-full border-2 border-primary/20 border-t-primary animate-spin"></div>
          </div>
        )}
        {shouldLoad && imageUrl ? (
          <img
            src={optimizedSrc}
            srcSet={srcSet}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 380px"
            alt={product.title}
            loading={isPriority ? 'eager' : 'lazy'}
            decoding="async"
            fetchPriority={isCritical ? 'high' : 'auto'}
            onLoad={handleLoad}
            className={`absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-all duration-300 ${
              isImageReady ? 'opacity-100' : 'opacity-0'
            }`}
          />
        ) : null}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10 pointer-events-none">
          {product.status === 'disponible' && (
            <span className="px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 text-[10px] uppercase font-bold tracking-wider">
              Disponible
            </span>
          )}
          {product.status === 'consultar' && (
            <span className="px-2 py-0.5 rounded bg-amber-950/80 border border-amber-500/50 text-amber-300 text-[10px] uppercase font-bold tracking-wider">
              Consultar
            </span>
          )}
          {product.status === 'proximamente' && (
            <span className="px-2 py-0.5 rounded bg-stone-900 border border-outline-variant text-on-surface-variant text-[10px] uppercase font-bold tracking-wider">
              Próximamente
            </span>
          )}
        </div>

        {/* Botón de corazón con contador de me gusta */}
        {onToggleLike && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleLike(product.id);
            }}
            className={`absolute top-3 right-3 z-20 flex items-center gap-1.5 px-2.5 py-1.5 rounded-full backdrop-blur-md transition-all duration-200 active:scale-90 shadow-md ${
              isLiked
                ? 'bg-rose-950/85 border border-rose-500/70 text-rose-300 shadow-rose-950/50'
                : 'bg-black/60 hover:bg-black/80 border border-white/20 text-white/90 hover:text-rose-400'
            }`}
            title={isLiked ? 'Ya te gusta esta figura (clic para quitar)' : 'Me gusta esta figura'}
            aria-label={`${likesCount} me gusta`}
          >
            <Heart
              className={`w-3.5 h-3.5 transition-transform duration-200 ${
                isLiked ? 'fill-rose-500 text-rose-500 scale-110' : 'hover:scale-110'
              }`}
            />
            <span className="text-xs font-bold font-mono tracking-tight select-none">
              {likesCount}
            </span>
          </button>
        )}
      </div>
      <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
        <div>
          <span className="text-[10px] font-bold text-primary tracking-wider uppercase block">
            {categoryName || product.franchiseId}
          </span>
          <h3 className="font-serif text-xl font-semibold text-on-surface mt-0.5">{product.title}</h3>
        </div>
        <div className="pt-3 border-t border-outline-variant/20 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-outline uppercase block">Acabado</span>
            <span className="text-xs font-semibold text-on-surface">{product.finish}</span>
          </div>
          <button
            className="px-3 py-1.5 rounded gold-shimmer text-on-primary-fixed text-xs font-bold transition-all active:scale-95 flex items-center gap-1 shadow-md"
          >
            <span>Ver figura</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </article>
  );
});

interface CatalogProps {
  products: Product[];
  categories: Category[];
  onSelectProduct: (product: Product) => void;
  hasMore?: boolean;
  loadingMore?: boolean;
  onLoadMore?: () => void;
  totalFiguresInDb?: number | null;
  likedFigureIds?: Set<string>;
  onToggleLike?: (productId: string) => void;
}

export function Catalog({
  products,
  categories,
  onSelectProduct,
  hasMore = false,
  loadingMore = false,
  onLoadMore,
  totalFiguresInDb,
  likedFigureIds,
  onToggleLike,
}: CatalogProps) {
  // Punto de anticipación de carga de figuras:
  // Se activa en la 6ª figura cargada (índice 5), y luego 3 figuras antes de finalizar cada lote
  const triggerIndex = products.length >= 6
    ? Math.max(5, products.length - 3)
    : products.length - 1;

  const triggerTargetRef = useRef<HTMLElement | null>(null);
  const bottomSentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!hasMore || loadingMore || !onLoadMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          onLoadMore();
        }
      },
      {
        root: null,
        // Anticipa 600px antes de que la tarjeta o el centinela entre en pantalla
        rootMargin: '600px',
        threshold: 0,
      }
    );

    const triggerEl = triggerTargetRef.current;
    const bottomEl = bottomSentinelRef.current;

    if (triggerEl) {
      observer.observe(triggerEl);
    }
    if (bottomEl) {
      observer.observe(bottomEl);
    }

    return () => {
      if (triggerEl) observer.unobserve(triggerEl);
      if (bottomEl) observer.unobserve(bottomEl);
      observer.disconnect();
    };
  }, [hasMore, loadingMore, onLoadMore, triggerIndex, products.length]);

  const displayTotal = totalFiguresInDb !== null && totalFiguresInDb !== undefined
    ? totalFiguresInDb
    : products.length;

  return (
    <section id="catalogo" className="px-5 md:px-12 py-12">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 pb-4 border-b border-outline-variant/20 gap-3">
        <div>
          <span className="text-[10px] font-bold text-primary tracking-widest uppercase">Galería Oficial</span>
          <h2 className="font-serif text-3xl font-medium text-on-surface mt-1">Catálogo de Colección</h2>
        </div>
        <div className="flex items-center gap-2 bg-surface-container-low px-3.5 py-1.5 rounded-full border border-outline-variant/30 w-fit shadow-sm">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-400"></span>
          <span className="text-xs font-semibold text-on-surface-variant">
            <span className="text-on-surface font-bold">{displayTotal}</span> {displayTotal === 1 ? 'figura en catálogo' : 'figuras en catálogo'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map((product, index) => {
          const isTrigger = index === triggerIndex;
          return (
            <CatalogCard
              key={product.id}
              product={product}
              index={index}
              categoryName={categories.find((c) => c.id === product.franchiseId)?.name}
              onSelect={onSelectProduct}
              articleRef={isTrigger ? (el) => { triggerTargetRef.current = el; } : undefined}
              isLiked={likedFigureIds ? likedFigureIds.has(product.id) : false}
              onToggleLike={onToggleLike}
            />
          );
        })}
      </div>
      
      {products.length === 0 && !loadingMore && (
        <div className="py-16 text-center space-y-3">
          <p className="text-on-surface-variant text-base">No se encontraron figuras con esos filtros.</p>
          {hasMore && onLoadMore && (
            <button
              onClick={onLoadMore}
              className="px-4 py-2 rounded-lg bg-primary text-on-primary font-bold text-xs hover:brightness-110 transition-all"
            >
              Buscar en más figuras del catálogo
            </button>
          )}
        </div>
      )}

      {/* Centinela invisible de precarga: la carga ocurre silenciosamente sin spinners que interrumpan el scroll */}
      {hasMore && (
        <div ref={bottomSentinelRef} className="h-4 w-full pointer-events-none opacity-0" />
      )}

      {!hasMore && products.length > 0 && (
        <div className="mt-8 py-4 text-center">
          <span className="text-xs text-on-surface-variant/80 font-medium tracking-wide">
            ✓ Has explorado todas las figuras disponibles ({displayTotal})
          </span>
        </div>
      )}

      <div className="mt-12 text-center">
        <a
          href="#contacto"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border border-primary/40 bg-surface-container-low text-primary hover:bg-surface-container-high transition-all text-sm font-semibold tracking-wider"
        >
          <PlusCircle className="w-5 h-5" />
          <span>¿Buscás otro personaje o diseño custom? Consultanos aquí</span>
        </a>
      </div>
    </section>
  );
}
