import { Menu, Palette, Heart } from 'lucide-react';

interface HeaderProps {
  onOpenDrawer: () => void;
  favoritesCount?: number;
  onOpenFavorites?: () => void;
  isFavoritesActive?: boolean;
}

export function Header({ 
  onOpenDrawer, 
  favoritesCount = 0, 
  onOpenFavorites,
  isFavoritesActive = false 
}: HeaderProps) {
  return (
    <header className="fixed top-0 left-0 w-full z-50 flex items-center justify-between px-4 sm:px-5 md:px-12 max-w-7xl mx-auto h-16 bg-surface/90 backdrop-blur-md border-b border-outline-variant/30 shadow-sm transition-all duration-300">
      <div className="flex items-center gap-2.5 sm:gap-3">
        <button
          onClick={onOpenDrawer}
          aria-label="Abrir menú"
          className="text-primary p-2 active:scale-95 transition-transform duration-150 rounded-lg hover:bg-surface-container-high"
        >
          <Menu className="w-6 h-6" />
        </button>
        <a href="#hero" className="flex items-center gap-2 sm:gap-2.5">
          <picture>
            <source srcSet="/logo-ippolav.webp" type="image/webp" />
            <img
              src="/logo-ippolav.webp"
              alt="IPPOLAV STUDIO Crest"
              width="36"
              height="36"
              loading="eager"
              decoding="async"
              fetchPriority="high"
              className="w-8 h-8 sm:w-9 sm:h-9 object-contain rounded border border-primary/30 p-0.5 bg-surface-container-lowest"
            />
          </picture>
          <span className="font-serif text-base sm:text-lg md:text-xl tracking-wider text-primary uppercase font-bold truncate">
            IPPOLAV STUDIO
          </span>
        </a>
      </div>

      <nav className="hidden md:flex items-center gap-6">
        <a href="#hero" className="text-primary font-bold border-b border-primary py-1 text-xs tracking-widest uppercase">
          Inicio
        </a>
        <a href="#catalogo" className="text-on-surface-variant hover:text-primary transition-colors duration-200 py-1 text-xs tracking-widest uppercase font-semibold">
          Catálogo Completo
        </a>
        <a href="#franquicias" className="text-on-surface-variant hover:text-primary transition-colors duration-200 py-1 text-xs tracking-widest uppercase font-semibold">
          Franquicias
        </a>
        <a href="#proceso" className="text-on-surface-variant hover:text-primary transition-colors duration-200 py-1 text-xs tracking-widest uppercase font-semibold">
          Cómo Comprar
        </a>
        <a href="#contacto" className="text-on-surface-variant hover:text-primary transition-colors duration-200 py-1 text-xs tracking-widest uppercase font-semibold">
          Contacto
        </a>
      </nav>

      <div className="flex items-center gap-2">
        {onOpenFavorites && (
          <button
            type="button"
            onClick={onOpenFavorites}
            className={`px-3 py-1.5 rounded-lg border text-xs font-semibold tracking-wider transition-all duration-200 active:scale-95 flex items-center gap-1.5 shadow-sm ${
              isFavoritesActive
                ? 'border-rose-500 bg-rose-950/80 text-rose-300 shadow-rose-950/40'
                : 'border-rose-500/40 bg-surface-container-low text-rose-400 hover:bg-rose-950/30'
            }`}
            title="Ver mis figuras favoritas guardadas"
            aria-label="Ver mis favoritos"
          >
            <Heart className={`w-4 h-4 ${favoritesCount > 0 ? 'fill-rose-500 text-rose-500' : 'text-rose-400'}`} />
            <span className="hidden sm:inline">Favoritos</span>
            {favoritesCount > 0 && (
              <span className="ml-0.5 px-1.5 py-0.2 rounded-full bg-rose-500 text-white font-bold text-[10px]">
                {favoritesCount}
              </span>
            )}
          </button>
        )}

        <a
          href="#catalogo"
          className="hidden sm:flex px-3.5 py-1.5 rounded-lg border border-primary/40 bg-surface-container-low text-primary hover:bg-primary hover:text-on-primary text-xs font-semibold tracking-wider transition-all duration-200 active:scale-95 items-center gap-1.5 shadow-sm"
        >
          <Palette className="w-4 h-4" />
          <span>Catálogo</span>
        </a>
      </div>
    </header>
  );
}
