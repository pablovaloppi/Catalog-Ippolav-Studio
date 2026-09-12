export function HowToBuy() {
  return (
    <section id="proceso" className="px-5 md:px-12 py-16 border-t border-outline-variant/20 bg-surface">
      <div className="max-w-4xl mx-auto space-y-10">
        <div className="text-center space-y-1">
          <span className="text-[10px] font-bold text-primary tracking-widest uppercase">Proceso de Adquisición</span>
          <h2 className="font-serif text-3xl font-medium text-on-surface">Cómo Comprar en IPPOLAV</h2>
          <p className="text-sm text-on-surface-variant max-w-md mx-auto">Cuatro pasos sencillos para sumar una obra maestra a tu vitrina personal.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="p-5 rounded-xl bg-surface-container-low border border-outline-variant/30 relative space-y-3">
            <div className="w-10 h-10 rounded-full bg-surface-container-high border border-primary/40 flex items-center justify-center font-serif text-primary font-bold text-lg">
              1
            </div>
            <h4 className="font-serif text-xl font-semibold text-on-surface">Elegí tu figura</h4>
            <p className="text-xs text-on-surface-variant">Explorá los modelos en nuestro catálogo online o solicitanos un personaje que no figure en lista.</p>
          </div>

          <div className="p-5 rounded-xl bg-surface-container-low border border-outline-variant/30 relative space-y-3">
            <div className="w-10 h-10 rounded-full bg-surface-container-high border border-primary/40 flex items-center justify-center font-serif text-primary font-bold text-lg">
              2
            </div>
            <h4 className="font-serif text-xl font-semibold text-on-surface">Consultá disponibilidad</h4>
            <p className="text-xs text-on-surface-variant">Escribinos directamente por WhatsApp con la pieza de tu interés para confirmar stock o cupos de encargo.</p>
          </div>

          <div className="p-5 rounded-xl bg-surface-container-low border border-outline-variant/30 relative space-y-3">
            <div className="w-10 h-10 rounded-full bg-surface-container-high border border-primary/40 flex items-center justify-center font-serif text-primary font-bold text-lg">
              3
            </div>
            <h4 className="font-serif text-xl font-semibold text-on-surface">Coordinamos los detalles</h4>
            <p className="text-xs text-on-surface-variant">Definimos la escala deseada, acabados personalizados, detalles de pintura y plazos de entrega del taller.</p>
          </div>

          <div className="p-5 rounded-xl bg-surface-container-low border border-outline-variant/30 relative space-y-3">
            <div className="w-10 h-10 rounded-full bg-surface-container-high border border-primary/40 flex items-center justify-center font-serif text-primary font-bold text-lg">
              4
            </div>
            <h4 className="font-serif text-xl font-semibold text-on-surface">Recibí tu figura</h4>
            <p className="text-xs text-on-surface-variant">Envío ultra-protegido con embalaje de alta seguridad a todo el país o retiro acordado en showroom.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
