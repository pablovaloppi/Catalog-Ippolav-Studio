import { SiteConfig } from '../types';

export function Footer({ config }: { config: SiteConfig | null }) {
  const whatsappUrl = config?.whatsapp ? `https://wa.me/${config.whatsapp}` : "https://wa.me/5491100000000";
  
  return (
    <footer className="w-full px-5 md:px-12 py-16 max-w-7xl mx-auto flex flex-col items-center text-center space-y-6 bg-surface-container-lowest border-t border-outline-variant/20">
      <a href="#hero" className="flex flex-col items-center space-y-3 group">
        <picture>
          <source srcSet="/logo-ippolav.webp" type="image/webp" />
          <img
            src="/logo-ippolav.png"
            alt="IPPOLAV STUDIO Logo"
            width="96"
            height="96"
            loading="lazy"
            decoding="async"
            className="w-24 h-24 object-contain transition-transform duration-300 group-hover:scale-105"
          />
        </picture>
        <span className="font-serif text-2xl tracking-widest text-primary uppercase font-bold">
          IPPOLAV STUDIO
        </span>
      </a>

      <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2 max-w-xl text-[10px] font-bold tracking-widest">
        <a href="#catalogo" className="text-on-surface-variant hover:text-primary transition-colors py-1 px-1.5 inline-block">Catálogo</a>
        <a href="#franquicias" className="text-on-surface-variant hover:text-primary transition-colors py-1 px-1.5 inline-block">Franquicias</a>
        <a href="#proceso" className="text-on-surface-variant hover:text-primary transition-colors py-1 px-1.5 inline-block">Proceso de Compra</a>
        <a href="#contacto" className="text-on-surface-variant hover:text-primary transition-colors py-1 px-1.5 inline-block">Bespoke Commissions</a>
        <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="text-on-surface-variant hover:text-primary transition-colors py-1 px-1.5 inline-block">WhatsApp</a>
        {config?.instagram && <a href={config.instagram} target="_blank" rel="noopener noreferrer" className="text-on-surface-variant hover:text-primary transition-colors py-1 px-1.5 inline-block">Instagram</a>}
        {config?.facebook && <a href={config.facebook} target="_blank" rel="noopener noreferrer" className="text-on-surface-variant hover:text-primary transition-colors py-1 px-1.5 inline-block">Facebook</a>}
        {config?.youtube && <a href={config.youtube} target="_blank" rel="noopener noreferrer" className="text-on-surface-variant hover:text-primary transition-colors py-1 px-1.5 inline-block">YouTube</a>}
      </nav>

      <div className="space-y-1">
        <p className="text-xs text-outline max-w-md">
          © 2024 IPPOLAV STUDIO. Piezas artesanales de edición limitada.
        </p>
        <p className="text-[10px] text-outline uppercase tracking-widest font-bold">
          Argentina • Envíos Nacionales e Internacionales
        </p>
      </div>
    </footer>
  );
}
