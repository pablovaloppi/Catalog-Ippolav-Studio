import { useState, useEffect } from 'react';
import { ArrowUp } from 'lucide-react';

export function ScrollToCatalogButton() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // Muestra el botón cuando el usuario ha hecho scroll hacia abajo
      if (window.scrollY > 200) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    // Verificación inicial por si ya está scrolleado
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToCatalog = () => {
    const catalogElement = document.getElementById('catalogo');
    if (catalogElement) {
      // Consideramos los 64px del header fijo + margen de respiración
      const headerOffset = 70;
      const elementPosition = catalogElement.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

      window.scrollTo({
        top: Math.max(0, offsetPosition),
        behavior: 'smooth',
      });
    } else {
      window.scrollTo({
        top: 0,
        behavior: 'smooth',
      });
    }
  };

  return (
    <div
      className={`fixed right-4 sm:right-6 md:right-8 bottom-6 sm:bottom-8 z-40 transition-all duration-300 ${
        isVisible
          ? 'opacity-100 translate-y-0 pointer-events-auto'
          : 'opacity-0 translate-y-6 pointer-events-none'
      }`}
    >
      <button
        type="button"
        id="btn-scroll-to-catalog"
        onClick={scrollToCatalog}
        aria-label="Volver a la parte superior del catálogo"
        title="Volver a la parte superior del catálogo"
        className="group relative flex items-center justify-center w-12 h-12 rounded-full bg-surface-container-high/90 hover:bg-primary text-primary hover:text-on-primary-fixed border border-primary/40 shadow-2xl backdrop-blur-md transition-all duration-200 hover:scale-110 active:scale-95 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-surface cursor-pointer"
      >
        <ArrowUp className="w-5 h-5 transition-transform duration-200 group-hover:-translate-y-0.5" />

        {/* Tooltip flotante a la izquierda para pantallas medianas/grandes */}
        <span className="hidden md:block absolute right-full mr-3 px-3 py-1.5 rounded-lg bg-surface-container-lowest/95 text-on-surface text-xs font-semibold whitespace-nowrap shadow-xl border border-outline-variant/30 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
          Subir al catálogo
        </span>
      </button>
    </div>
  );
}
