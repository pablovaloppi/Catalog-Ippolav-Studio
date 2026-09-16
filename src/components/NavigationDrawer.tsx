import { X, Home, Palette, Shapes, HelpCircle, MessageCircle } from 'lucide-react';

interface NavigationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NavigationDrawer({ isOpen, onClose }: NavigationDrawerProps) {
  return (
    <>
      <div
        className={`fixed inset-0 bg-black/80 backdrop-blur-sm z-50 transition-opacity duration-300 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />
      <aside
        className={`fixed inset-y-0 left-0 w-72 max-w-[85vw] z-50 bg-surface-container-low shadow-2xl border-r border-outline-variant/30 transform transition-transform duration-300 ease-out flex flex-col justify-between p-6 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-outline-variant/30">
            <div className="flex items-center gap-2.5">
              <picture>
                <source srcSet="/logo-ippolav.webp" type="image/webp" />
                <img
                  src="/logo-ippolav.webp"
                  alt="Emblema IPPOLAV"
                  width="32"
                  height="32"
                  className="w-8 h-8 object-contain"
                />
              </picture>
              <span className="font-serif text-lg tracking-widest text-primary uppercase font-bold">
                IPPOLAV STUDIO
              </span>
            </div>
            <button
              onClick={onClose}
              aria-label="Cerrar menú"
              title="Cerrar menú"
              className="text-on-surface-variant hover:text-primary p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <nav className="space-y-1">
            <a
              href="#hero"
              onClick={onClose}
              className="flex items-center gap-3 bg-surface-container text-primary border-l-2 border-primary font-semibold px-4 py-3 rounded-r active:opacity-80 transition-opacity text-sm"
            >
              <Home className="w-5 h-5" />
              <span>Inicio</span>
            </a>
            <a
              href="#catalogo"
              onClick={onClose}
              className="flex items-center gap-3 text-on-surface-variant hover:text-primary hover:bg-surface-container-high/40 px-4 py-3 rounded active:opacity-80 transition-all text-sm font-semibold"
            >
              <Palette className="w-5 h-5" />
              <span>Catálogo Completo</span>
            </a>
            <a
              href="#franquicias"
              onClick={onClose}
              className="flex items-center gap-3 text-on-surface-variant hover:text-primary hover:bg-surface-container-high/40 px-4 py-3 rounded active:opacity-80 transition-all text-sm font-semibold"
            >
              <Shapes className="w-5 h-5" />
              <span>Franquicias</span>
            </a>
            <a
              href="#proceso"
              onClick={onClose}
              className="flex items-center gap-3 text-on-surface-variant hover:text-primary hover:bg-surface-container-high/40 px-4 py-3 rounded active:opacity-80 transition-all text-sm font-semibold"
            >
              <HelpCircle className="w-5 h-5" />
              <span>Cómo Comprar</span>
            </a>
            <a
              href="#contacto"
              onClick={onClose}
              className="flex items-center gap-3 text-on-surface-variant hover:text-primary hover:bg-surface-container-high/40 px-4 py-3 rounded active:opacity-80 transition-all text-sm font-semibold"
            >
              <MessageCircle className="w-5 h-5" />
              <span>Contacto</span>
            </a>
          </nav>
        </div>
      </aside>
    </>
  );
}
