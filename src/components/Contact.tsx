import { Paintbrush, MessageCircle, Camera } from 'lucide-react';
import { SiteConfig } from '../types';

export function Contact({ config }: { config: SiteConfig | null }) {
  const whatsappUrl = config?.whatsapp 
    ? `https://wa.me/${config.whatsapp}?text=${encodeURIComponent("Hola IPPOLAV STUDIO, busco asesoramiento para una figura personalizada")}` 
    : "https://wa.me/5491100000000?text=Hola%20IPPOLAV%20STUDIO,%20busco%20asesoramiento%20para%20una%20figura%20personalizada";
    
  return (
    <section id="contacto" className="px-5 md:px-12 py-16 border-t border-outline-variant/20 bg-surface-container-lowest relative overflow-hidden">
      <div className="absolute right-0 bottom-0 opacity-5 pointer-events-none w-96 h-96">
        <picture>
          <source srcSet="/logo-ippolav.webp" type="image/webp" />
          <img
            src="/logo-ippolav.webp"
            alt="Sello watermark"
            loading="lazy"
            decoding="async"
            width="384"
            height="384"
            className="w-full h-full object-contain opacity-20"
          />
        </picture>
      </div>
      
      <div className="max-w-2xl mx-auto text-center space-y-6 relative z-10">
        <div className="inline-block p-3 rounded-full bg-surface-container-low border border-primary/30">
          <Paintbrush className="text-primary w-8 h-8" />
        </div>
        
        <h2 className="font-serif text-3xl font-medium text-on-surface">¿Buscás una figura en particular?</h2>
        
        <p className="text-sm md:text-base text-on-surface-variant max-w-lg mx-auto leading-relaxed">
          Consultanos y te ayudamos a crear o encontrar el personaje que estás buscando. Realizamos comisiones personalizadas, modelado exclusivo a escala y acabados únicos de colección.
        </p>
        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto gold-shimmer text-on-primary-fixed text-sm font-bold px-8 py-3.5 rounded-lg flex items-center justify-center gap-2 shadow-xl hover:brightness-110 active:scale-95 transition-all uppercase tracking-wider"
          >
            <MessageCircle className="w-5 h-5" />
            <span>Escribir por WhatsApp</span>
          </a>
          {config?.instagram && (
            <a
              href={config.instagram}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto px-6 py-3.5 rounded-lg border border-outline-variant/60 bg-surface-container text-on-surface hover:text-primary hover:border-primary text-sm font-semibold flex items-center justify-center gap-2 transition-all"
            >
              <Camera className="w-5 h-5" />
              <span>Instagram de IPPOLAV STUDIO</span>
            </a>
          )}
        </div>
      </div>
    </section>
  );
}
