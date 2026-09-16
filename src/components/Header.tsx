import { Menu, Palette } from 'lucide-react';

interface HeaderProps {
  onOpenDrawer: () => void;
}

export function Header({ onOpenDrawer }: HeaderProps) {
  return (
    <header className="fixed top-0 left-0 w-full z-50 flex items-center justify-between px-5 md:px-12 max-w-7xl mx-auto h-16 bg-surface/90 backdrop-blur-md border-b border-outline-variant/30 shadow-sm transition-all duration-300">
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenDrawer}
          aria-label="Abrir menú"
          className="text-primary p-2 active:scale-95 transition-transform duration-150 rounded-lg hover:bg-surface-container-high"
        >
          <Menu className="w-6 h-6" />
        </button>
        <a href="#hero" className="flex items-center gap-2.5">
          <picture>
            <source srcSet="/logo-ippolav.webp" type="image/webp" />
            <img
              src="/logo-ippolav.webp"
              alt="IPPOLAV STUDIO Crest"
              width="36"
              height="36"
              className="w-9 h-9 object-contain rounded border border-primary/30 p-0.5 bg-surface-container-lowest"
            />
          </picture>
          <span className="font-serif text-lg md:text-xl tracking-wider text-primary uppercase font-bold">
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

      <a
        href="#catalogo"
        className="px-3.5 py-1.5 rounded-lg border border-primary/40 bg-surface-container-low text-primary hover:bg-primary hover:text-on-primary text-xs font-semibold tracking-wider transition-all duration-200 active:scale-95 flex items-center gap-1.5 shadow-sm"
      >
        <Palette className="w-4 h-4" />
        <span>Ver catálogo</span>
      </a>
    </header>
  );
}
