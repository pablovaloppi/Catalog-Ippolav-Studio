import { Search, X, SlidersHorizontal } from 'lucide-react';

interface FilterSectionProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  statusFilter: string;
  setStatusFilter: (status: string) => void;
  franchiseFilter: string;
  setFranchiseFilter: (franchise: string) => void;
}

export function FilterSection({
  searchQuery,
  setSearchQuery,
  statusFilter,
  setStatusFilter,
  franchiseFilter,
  setFranchiseFilter,
}: FilterSectionProps) {
  const franchises = [
    { id: 'all', label: 'Todas' },
    { id: 'marvel', label: 'Marvel' },
    { id: 'dc', label: 'DC Comics' },
    { id: 'anime', label: 'Anime / Manga' },
    { id: 'videojuegos', label: 'Videojuegos' },
    { id: 'cinema', label: 'Series & Películas' },
  ];

  return (
    <section className="px-5 md:px-12 py-8 border-b border-outline-variant/20 bg-surface-container-lowest/60">
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="relative flex items-center">
          <Search className="absolute left-4 text-on-surface-variant pointer-events-none w-5 h-5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-10 py-3.5 bg-surface-container-low border border-outline-variant/40 rounded-xl text-on-surface placeholder:text-outline focus:border-primary focus:ring-1 focus:ring-primary text-sm transition-all shadow-inner outline-none"
            placeholder="Buscar personaje o franquicia... (ej: Batman, Dragon Ball, Marvel)"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 text-outline hover:text-on-surface p-1"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-2">
            <button className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-surface-container border border-primary/40 rounded-lg text-primary text-xs font-semibold">
              <SlidersHorizontal className="w-4 h-4" />
              <span>Filtrar catálogo</span>
              <span className="ml-1 bg-primary text-on-primary-fixed w-4 h-4 rounded-full text-[10px] flex items-center justify-center font-bold">4</span>
            </button>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-2.5 py-1 text-xs rounded border font-bold ${
                statusFilter === 'all'
                  ? 'border-outline-variant/40 bg-surface-container-high text-primary'
                  : 'border-outline-variant/30 text-on-surface-variant hover:text-primary'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setStatusFilter('disponible')}
              className={`px-2.5 py-1 text-xs rounded border font-bold ${
                statusFilter === 'disponible'
                  ? 'border-outline-variant/40 bg-surface-container-high text-primary'
                  : 'border-outline-variant/30 text-on-surface-variant hover:text-primary'
              }`}
            >
              Disponible
            </button>
            <button
              onClick={() => setStatusFilter('consultar')}
              className={`px-2.5 py-1 text-xs rounded border font-bold ${
                statusFilter === 'consultar'
                  ? 'border-outline-variant/40 bg-surface-container-high text-primary'
                  : 'border-outline-variant/30 text-on-surface-variant hover:text-primary'
              }`}
            >
              Consultar
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          {franchises.map((f) => (
            <button
              key={f.id}
              onClick={() => setFranchiseFilter(f.id)}
              className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                franchiseFilter === f.id
                  ? 'bg-surface-container border border-primary text-primary'
                  : 'bg-surface-container-low border border-outline-variant/30 text-on-surface-variant hover:text-on-surface hover:border-outline'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
