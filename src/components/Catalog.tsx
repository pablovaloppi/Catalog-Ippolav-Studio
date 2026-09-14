import { useRef, useEffect, useCallback } from 'react';
import { ArrowRight, PlusCircle, Loader2 } from 'lucide-react';
import { Product, Category } from '../types';

interface CatalogProps {
  products: Product[];
  categories: Category[];
  onSelectProduct: (product: Product) => void;
  hasMore?: boolean;
  loadingMore?: boolean;
  onLoadMore?: () => void;
}

export function Catalog({
  products,
  categories,
  onSelectProduct,
  hasMore = false,
  loadingMore = false,
  onLoadMore,
}: CatalogProps) {
  const observerTarget = useRef<HTMLDivElement>(null);

  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const target = entries[0];
      if (target.isIntersecting && hasMore && !loadingMore && onLoadMore) {
        onLoadMore();
      }
    },
    [hasMore, loadingMore, onLoadMore]
  );

  useEffect(() => {
    const observer = new IntersectionObserver(handleObserver, {
      root: null,
      rootMargin: '350px', // Load more slightly before reaching the bottom
      threshold: 0.1,
    });

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [handleObserver]);

  return (
    <section id="catalogo" className="px-5 md:px-12 py-12">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 pb-4 border-b border-outline-variant/20 gap-2">
        <div>
          <span className="text-[10px] font-bold text-primary tracking-widest uppercase">Galería Oficial</span>
          <h2 className="font-serif text-3xl font-medium text-on-surface mt-1">Catálogo de Colección</h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-400"></span>
          <span className="text-xs font-semibold text-on-surface-variant">
            {products.length} {products.length === 1 ? 'figura' : 'figuras'}{hasMore ? ' (deslizá para ver más)' : ''}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map((product) => (
          <article
            key={product.id}
            onClick={() => onSelectProduct(product)}
            className="group bg-surface-container-low rounded-xl border border-outline-variant/30 overflow-hidden flex flex-col justify-between gold-border-glow transition-all duration-300 cursor-pointer"
          >
            <div className="relative aspect-[3/4] bg-surface-container-lowest overflow-hidden">
              <img
                src={product.imageUrls?.[0] || ''}
                alt={product.title}
                loading="lazy"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute top-3 left-3 flex flex-col gap-1.5">
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
            </div>
            <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold text-primary tracking-wider uppercase block">
                  {categories.find(c => c.id === product.franchiseId)?.name || product.franchiseId}
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
        ))}
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

      {/* Invisible element / loader to trigger loading more items from Firestore */}
      {hasMore && (
        <div ref={observerTarget} className="mt-8 py-6 flex flex-col items-center justify-center gap-3">
          {loadingMore ? (
            <div className="flex items-center gap-2 text-primary text-sm font-semibold">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Cargando más figuras...</span>
            </div>
          ) : (
            <button
              onClick={onLoadMore}
              className="px-5 py-2 rounded-lg border border-outline-variant/40 bg-surface-container-low hover:border-primary text-xs font-semibold text-on-surface-variant hover:text-primary transition-all active:scale-95"
            >
              Cargar más figuras
            </button>
          )}
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
