import { Search, X, SlidersHorizontal, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { Category } from '../types';

interface FilterSectionProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  statusFilter: string;
  setStatusFilter: (status: string) => void;
  franchiseFilter: string;
  setFranchiseFilter: (franchise: string) => void;
  finishFilter: string;
  setFinishFilter: (finish: string) => void;
  scaleFilter: string;
  setScaleFilter: (scale: string) => void;
  categories: Category[];
  availableFinishes: string[];
  availableScales: string[];
}

export function FilterSection({
  searchQuery,
  setSearchQuery,
  statusFilter,
  setStatusFilter,
  franchiseFilter,
  setFranchiseFilter,
  finishFilter,
  setFinishFilter,
  scaleFilter,
  setScaleFilter,
  categories,
  availableFinishes,
  availableScales,
}: FilterSectionProps) {
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  
  // Only display top-level categories in the quick filter for simplicity
  const topLevelCategories = categories.filter(c => !c.parentId);
  
  const activeFiltersCount = 
    (statusFilter !== 'all' ? 1 : 0) + 
    (franchiseFilter !== 'all' ? 1 : 0) + 
    (finishFilter !== 'all' ? 1 : 0) + 
    (scaleFilter !== 'all' ? 1 : 0);
  
  return (
    <section className="px-5 md:px-12 py-8 border-b border-outline-variant/20 bg-surface-container-lowest/60 relative">
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
          <div className="flex items-center gap-2 relative">
            <button 
              onClick={() => setIsFilterMenuOpen(!isFilterMenuOpen)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                isFilterMenuOpen 
                  ? 'bg-primary border border-primary text-on-primary-fixed' 
                  : 'bg-surface-container border border-primary/40 text-primary hover:bg-surface-container-high'
              }`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span>Filtrar catálogo</span>
              {activeFiltersCount > 0 && (
                <span className={`ml-1 w-4 h-4 rounded-full text-[10px] flex items-center justify-center font-bold ${
                  isFilterMenuOpen ? 'bg-on-primary-fixed text-primary' : 'bg-primary text-on-primary-fixed'
                }`}>
                  {activeFiltersCount}
                </span>
              )}
            </button>
            
            {/* Filter Menu Dropdown */}
            {isFilterMenuOpen && (
              <div className="absolute top-full left-0 mt-2 w-72 bg-surface-container-low border border-primary/30 rounded-xl shadow-xl z-30 p-4 space-y-4 animate-in fade-in slide-in-from-top-2">
                
                {/* Category Filter */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-primary uppercase tracking-wider">Categoría</label>
                  <select 
                    value={franchiseFilter} 
                    onChange={(e) => setFranchiseFilter(e.target.value)}
                    className="w-full p-2 bg-surface-container border border-outline-variant/30 rounded-lg text-sm text-on-surface outline-none focus:border-primary"
                  >
                    <option value="all">Todas las categorías</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.parentId ? `└ ${c.name}` : c.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                {/* Status Filter */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-primary uppercase tracking-wider">Estado</label>
                  <select 
                    value={statusFilter} 
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full p-2 bg-surface-container border border-outline-variant/30 rounded-lg text-sm text-on-surface outline-none focus:border-primary"
                  >
                    <option value="all">Cualquier estado</option>
                    <option value="disponible">Disponible</option>
                    <option value="consultar">Consultar / Edición por encargo</option>
                    <option value="proximamente">Próximamente</option>
                  </select>
                </div>

                {/* Finish Filter */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-primary uppercase tracking-wider">Acabado</label>
                  <select 
                    value={finishFilter} 
                    onChange={(e) => setFinishFilter(e.target.value)}
                    className="w-full p-2 bg-surface-container border border-outline-variant/30 rounded-lg text-sm text-on-surface outline-none focus:border-primary"
                  >
                    <option value="all">Todos los acabados</option>
                    {availableFinishes.map(finish => (
                      <option key={finish} value={finish}>{finish}</option>
                    ))}
                  </select>
                </div>
                
                {/* Scale Filter */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-primary uppercase tracking-wider">Escala</label>
                  <select 
                    value={scaleFilter} 
                    onChange={(e) => setScaleFilter(e.target.value)}
                    className="w-full p-2 bg-surface-container border border-outline-variant/30 rounded-lg text-sm text-on-surface outline-none focus:border-primary"
                  >
                    <option value="all">Todas las escalas</option>
                    {availableScales.map(scale => (
                      <option key={scale} value={scale}>{scale}</option>
                    ))}
                  </select>
                </div>
                
                <div className="pt-2 border-t border-outline-variant/20 flex justify-end">
                  <button 
                    onClick={() => {
                      setFranchiseFilter('all');
                      setStatusFilter('all');
                      setFinishFilter('all');
                      setScaleFilter('all');
                    }}
                    className="text-xs font-semibold text-on-surface-variant hover:text-primary transition-colors"
                  >
                    Limpiar filtros
                  </button>
                </div>
              </div>
            )}
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

        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-2 snap-x">
          <button
            onClick={() => setFranchiseFilter('all')}
            className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold transition-all snap-start ${
              franchiseFilter === 'all'
                ? 'bg-surface-container border border-primary text-primary shadow-sm'
                : 'bg-surface-container-low border border-outline-variant/30 text-on-surface-variant hover:text-on-surface hover:border-outline'
            }`}
          >
            Todas
          </button>
          {topLevelCategories.map((c) => (
            <button
              key={c.id}
              onClick={() => setFranchiseFilter(c.id)}
              className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold transition-all snap-start ${
                franchiseFilter === c.id
                  ? 'bg-surface-container border border-primary text-primary shadow-sm'
                  : 'bg-surface-container-low border border-outline-variant/30 text-on-surface-variant hover:text-on-surface hover:border-outline'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>
      
      {/* Click away overlay for filter menu */}
      {isFilterMenuOpen && (
        <div 
          className="fixed inset-0 z-20"
          onClick={() => setIsFilterMenuOpen(false)}
        />
      )}
    </section>
  );
}
