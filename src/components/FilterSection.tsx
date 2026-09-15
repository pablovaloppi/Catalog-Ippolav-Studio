import { 
  Search, 
  X, 
  SlidersHorizontal, 
  ChevronDown, 
  ArrowUpDown, 
  Sparkles, 
  Clock, 
  History, 
  ArrowDownAZ, 
  ArrowUpZA, 
  Palette, 
  Check,
  Heart
} from 'lucide-react';
import { useState, useMemo } from 'react';
import { Category, SortOption } from '../types';

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
  sortBy: SortOption;
  setSortBy: (sort: SortOption) => void;
  categories: Category[];
  availableFinishes: string[];
  availableScales: string[];
}

const sortOptions: {
  id: SortOption;
  label: string;
  shortLabel: string;
  description: string;
  icon: typeof Sparkles;
}[] = [
  {
    id: 'default',
    label: 'Destacados / Catálogo',
    shortLabel: 'Destacados',
    description: 'Orden predeterminado de la tienda',
    icon: Sparkles,
  },
  {
    id: 'likes-desc',
    label: 'Más corazones (Popularidad)',
    shortLabel: 'Más corazones',
    description: 'De mayor a menor cantidad de me gusta',
    icon: Heart,
  },
  {
    id: 'recent',
    label: 'Cargada más reciente',
    shortLabel: 'Más recientes',
    description: 'Últimas figuras añadidas',
    icon: Clock,
  },
  {
    id: 'oldest',
    label: 'Cargada más antigua',
    shortLabel: 'Más antiguas',
    description: 'Primeras figuras del catálogo',
    icon: History,
  },
  {
    id: 'name-asc',
    label: 'Alfabético (A → Z)',
    shortLabel: 'Nombre (A-Z)',
    description: 'De la letra A a la Z',
    icon: ArrowDownAZ,
  },
  {
    id: 'name-desc',
    label: 'Alfabético (Z → A)',
    shortLabel: 'Nombre (Z-A)',
    description: 'De la letra Z a la A',
    icon: ArrowUpZA,
  },
  {
    id: 'finish',
    label: 'Por acabado',
    shortLabel: 'Por acabado',
    description: 'Agrupadas por estilo de pintura',
    icon: Palette,
  },
];

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
  sortBy,
  setSortBy,
  categories,
  availableFinishes,
  availableScales,
}: FilterSectionProps) {
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);
  
  // Categorías ordenadas alfabéticamente A-Z para selección precisa por teclado
  const sortedCategories = useMemo(() => {
    return categories
      .map(cat => {
        const parent = cat.parentId ? categories.find(c => c.id === cat.parentId) : null;
        const label = parent ? `${cat.name} (${parent.name})` : cat.name;
        return {
          id: cat.id,
          name: cat.name,
          parentName: parent?.name || '',
          label,
        };
      })
      .sort((a, b) => {
        const cmp = a.name.localeCompare(b.name, 'es', { sensitivity: 'base' });
        if (cmp !== 0) return cmp;
        return a.label.localeCompare(b.label, 'es', { sensitivity: 'base' });
      });
  }, [categories]);

  // Only display top-level categories in the quick filter for simplicity
  const topLevelCategories = categories.filter(c => !c.parentId);
  
  const activeFiltersCount = 
    (statusFilter !== 'all' ? 1 : 0) + 
    (franchiseFilter !== 'all' ? 1 : 0) + 
    (finishFilter !== 'all' ? 1 : 0) + 
    (scaleFilter !== 'all' ? 1 : 0);

  const currentSortOption = sortOptions.find(o => o.id === sortBy) || sortOptions[0];
  
  return (
    <section id="filter-section" className="px-5 md:px-12 py-8 border-b border-outline-variant/20 bg-surface-container-lowest/60 relative">
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

        <div className="flex items-center justify-between gap-3 pt-1">
          {/* Lado Izquierdo: Botón Filtrar Catálogo */}
          <div className="flex items-center gap-2 relative">
            <button 
              id="filter-catalog-button"
              onClick={() => {
                setIsFilterMenuOpen(!isFilterMenuOpen);
                if (isSortMenuOpen) setIsSortMenuOpen(false);
              }}
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
              <div className="absolute top-full left-0 mt-2 w-72 max-w-[90vw] bg-surface-container-low border border-primary/30 rounded-xl shadow-xl z-30 p-4 space-y-4 animate-in fade-in slide-in-from-top-2">
                
                {/* Category Filter */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-primary uppercase tracking-wider">Categoría</label>
                  <select 
                    value={franchiseFilter} 
                    onChange={(e) => setFranchiseFilter(e.target.value)}
                    className="w-full p-2 bg-surface-container border border-outline-variant/30 rounded-lg text-sm text-on-surface outline-none focus:border-primary"
                  >
                    <option value="all">Todas las categorías (A-Z)</option>
                    {sortedCategories.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.label}
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

          {/* Lado Derecho: Filtro rápido de estado y Botón Ordenar */}
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1.5">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-2.5 py-1 text-xs rounded border font-bold transition-all ${
                  statusFilter === 'all'
                    ? 'border-outline-variant/40 bg-surface-container-high text-primary'
                    : 'border-outline-variant/30 text-on-surface-variant hover:text-primary'
                }`}
              >
                Todos
              </button>
              <button
                onClick={() => setStatusFilter('disponible')}
                className={`px-2.5 py-1 text-xs rounded border font-bold transition-all ${
                  statusFilter === 'disponible'
                    ? 'border-outline-variant/40 bg-surface-container-high text-primary'
                    : 'border-outline-variant/30 text-on-surface-variant hover:text-primary'
                }`}
              >
                Disponible
              </button>
              <button
                onClick={() => setStatusFilter('consultar')}
                className={`px-2.5 py-1 text-xs rounded border font-bold transition-all ${
                  statusFilter === 'consultar'
                    ? 'border-outline-variant/40 bg-surface-container-high text-primary'
                    : 'border-outline-variant/30 text-on-surface-variant hover:text-primary'
                }`}
              >
                Consultar
              </button>
            </div>

            {/* Botón Ordenar (A la altura de Filtrar Catálogo del lado derecho) */}
            <div className="relative">
              <button
                id="sort-catalog-button"
                onClick={() => {
                  setIsSortMenuOpen(!isSortMenuOpen);
                  if (isFilterMenuOpen) setIsFilterMenuOpen(false);
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  isSortMenuOpen || sortBy !== 'default'
                    ? 'bg-primary border border-primary text-on-primary-fixed'
                    : 'bg-surface-container border border-primary/40 text-primary hover:bg-surface-container-high'
                }`}
                title="Ordenar catálogo"
              >
                <ArrowUpDown className="w-4 h-4 shrink-0" />
                <span className="hidden md:inline font-normal opacity-80">Ordenar:</span>
                <span className="font-bold">{currentSortOption.shortLabel}</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isSortMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Sort Menu Dropdown */}
              {isSortMenuOpen && (
                <div className="absolute top-full right-0 mt-2 w-72 max-w-[90vw] bg-surface-container-low border border-primary/30 rounded-xl shadow-2xl z-30 p-2 space-y-1 animate-in fade-in slide-in-from-top-2">
                  <div className="px-3 py-2 border-b border-outline-variant/20 flex items-center justify-between">
                    <span className="text-[11px] font-bold text-primary uppercase tracking-wider">
                      Ordenar catálogo
                    </span>
                    {sortBy !== 'default' && (
                      <button
                        onClick={() => {
                          setSortBy('default');
                          setIsSortMenuOpen(false);
                        }}
                        className="text-[11px] font-semibold text-on-surface-variant hover:text-primary transition-colors"
                      >
                        Restablecer
                      </button>
                    )}
                  </div>

                  <div className="py-1 space-y-0.5">
                    {sortOptions.map((opt) => {
                      const Icon = opt.icon;
                      const isSelected = sortBy === opt.id;

                      return (
                        <button
                          key={opt.id}
                          onClick={() => {
                            setSortBy(opt.id);
                            setIsSortMenuOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left transition-all ${
                            isSelected
                              ? 'bg-primary/15 text-primary border border-primary/30 font-semibold'
                              : 'hover:bg-surface-container text-on-surface hover:text-primary border border-transparent'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${
                              isSelected ? 'bg-primary text-on-primary-fixed' : 'bg-surface-container text-on-surface-variant'
                            }`}>
                              <Icon className="w-3.5 h-3.5" />
                            </div>
                            <div className="truncate">
                              <div className="text-xs font-semibold leading-tight truncate">{opt.label}</div>
                              <div className="text-[10px] text-on-surface-variant leading-tight truncate">{opt.description}</div>
                            </div>
                          </div>

                          {isSelected && (
                            <Check className="w-4 h-4 text-primary shrink-0 ml-2" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile quick status pills */}
        <div className="flex sm:hidden items-center gap-1.5 overflow-x-auto no-scrollbar pt-0.5">
          <span className="text-[11px] font-semibold text-on-surface-variant/80 shrink-0">Estado:</span>
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-2.5 py-0.5 text-xs rounded border font-bold transition-all shrink-0 ${
              statusFilter === 'all'
                ? 'border-outline-variant/40 bg-surface-container-high text-primary'
                : 'border-outline-variant/30 text-on-surface-variant hover:text-primary'
            }`}
          >
            Todos
          </button>
          <button
            onClick={() => setStatusFilter('disponible')}
            className={`px-2.5 py-0.5 text-xs rounded border font-bold transition-all shrink-0 ${
              statusFilter === 'disponible'
                ? 'border-outline-variant/40 bg-surface-container-high text-primary'
                : 'border-outline-variant/30 text-on-surface-variant hover:text-primary'
            }`}
          >
            Disponible
          </button>
          <button
            onClick={() => setStatusFilter('consultar')}
            className={`px-2.5 py-0.5 text-xs rounded border font-bold transition-all shrink-0 ${
              statusFilter === 'consultar'
                ? 'border-outline-variant/40 bg-surface-container-high text-primary'
                : 'border-outline-variant/30 text-on-surface-variant hover:text-primary'
            }`}
          >
            Consultar
          </button>
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
      
      {/* Click away overlay for filter or sort menu */}
      {(isFilterMenuOpen || isSortMenuOpen) && (
        <div 
          className="fixed inset-0 z-20"
          onClick={() => {
            setIsFilterMenuOpen(false);
            setIsSortMenuOpen(false);
          }}
        />
      )}
    </section>
  );
}
