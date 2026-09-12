import { ArrowRight, PlusCircle } from 'lucide-react';
import { Product, Category } from '../types';

interface CatalogProps {
  products: Product[];
  categories: Category[];
  onSelectProduct: (product: Product) => void;
}

export function Catalog({ products, categories, onSelectProduct }: CatalogProps) {
  return (
    <section id="catalogo" className="px-5 md:px-12 py-12">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 pb-4 border-b border-outline-variant/20 gap-2">
        <div>
          <span className="text-[10px] font-bold text-primary tracking-widest uppercase">Galería Oficial</span>
          <h2 className="font-serif text-3xl font-medium text-on-surface mt-1">Catálogo de Colección</h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-400"></span>
          <span className="text-xs font-semibold text-on-surface-variant">{products.length} figuras disponibles</span>
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
