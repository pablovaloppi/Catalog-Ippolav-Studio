import { Compass, BookOpen } from 'lucide-react';

export function Hero() {
  return (
    <section id="hero" className="relative px-5 md:px-12 pt-10 pb-16 border-b border-outline-variant/20 bg-radial-vignette">
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-80 h-80 bg-primary/10 rounded-full blur-3xl pointer-events-none"></div>
      
      <div className="relative z-10 flex flex-col items-center text-center space-y-6 max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-surface-container border border-primary/30 shadow-sm">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
          <span className="text-[10px] font-bold text-primary tracking-widest uppercase">Edición Limitada de Taller</span>
        </div>
        
        <h1 className="font-serif text-4xl md:text-6xl font-semibold text-on-surface leading-tight tracking-tight">
          Figuras que <span className="italic text-primary font-serif font-normal">cobran vida</span>
        </h1>
        
        <p className="text-base md:text-lg text-on-surface-variant max-w-lg leading-relaxed">
          Descubrí nuestro catálogo de personajes y encontrá tu próxima figura. Esculturas de colección acabadas a mano con el más alto rigor de detalle.
        </p>
        
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto pt-2">
          <a
            href="#catalogo"
            className="w-full sm:w-auto gold-shimmer text-on-primary-fixed text-sm font-bold px-8 py-3.5 rounded-lg shadow-lg hover:brightness-110 active:scale-95 transition-all duration-150 flex items-center justify-center gap-2 tracking-widest uppercase"
          >
            <Compass className="w-5 h-5" />
            <span>Explorar catálogo</span>
          </a>
          <a
            href="#proceso"
            className="w-full sm:w-auto px-6 py-3.5 rounded-lg border border-outline-variant/60 bg-surface-container-low text-on-surface hover:text-primary hover:border-primary/40 text-sm font-semibold tracking-wider transition-all duration-150 flex items-center justify-center gap-2"
          >
            <BookOpen className="w-5 h-5" />
            <span>Proceso de Creación</span>
          </a>
        </div>
      </div>
    </section>
  );
}

