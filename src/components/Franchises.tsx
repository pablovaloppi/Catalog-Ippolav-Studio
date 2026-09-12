import { Shield, Moon, Zap, Gamepad2, Film, Wand2, Star } from 'lucide-react';
import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { Category } from '../types';

interface FranchisesProps {
  onSelectFranchise: (id: string) => void;
}

// Icon mapping
const getIcon = (iconName: string) => {
  switch (iconName?.toLowerCase()) {
    case 'shield': return <Shield className="w-5 h-5" />;
    case 'moon': return <Moon className="w-5 h-5" />;
    case 'zap': return <Zap className="w-5 h-5" />;
    case 'gamepad2': return <Gamepad2 className="w-5 h-5" />;
    case 'film': return <Film className="w-5 h-5" />;
    default: return <Star className="w-5 h-5" />;
  }
};

export function Franchises({ onSelectFranchise }: FranchisesProps) {
  const [categories, setCategories] = useState<Category[]>([
    // Fallback static categories, will be replaced by Firebase if available
    { id: 'marvel', name: 'Marvel', icon: 'shield' },
    { id: 'dc', name: 'DC Comics', icon: 'moon' },
    { id: 'anime', name: 'Dragon Ball & Anime', icon: 'zap' },
    { id: 'videojuegos', name: 'Videojuegos', icon: 'gamepad2' },
    { id: 'cinema', name: 'Series & Cinema', icon: 'film' },
  ]);

  useEffect(() => {
    const q = query(collection(db, 'categories'), orderBy('order', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const data: Category[] = [];
        snapshot.forEach((doc) => data.push({ id: doc.id, ...doc.data() } as Category));
        setCategories(data);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleSelect = (id: string) => {
    document.getElementById('catalogo')?.scrollIntoView({ behavior: 'smooth' });
    onSelectFranchise(id);
  };

  const displayCategories = categories.filter(c => !c.parentId);

  return (
    <section id="franquicias" className="px-5 md:px-12 py-14 border-t border-outline-variant/20 bg-surface-container-lowest">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center space-y-1">
          <span className="text-[10px] font-bold text-primary tracking-widest uppercase">Universos & Leyendas</span>
          <h2 className="font-serif text-3xl font-medium text-on-surface">Explorar por Franquicia</h2>
          <p className="text-sm text-on-surface-variant max-w-md mx-auto">Seleccioná tu universo preferido para filtrar piezas exclusivas.</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3.5 pt-4">
          {displayCategories.map(cat => (
            <button key={cat.id} onClick={() => handleSelect(cat.id)} className="group p-4 rounded-xl bg-surface-container-low border border-outline-variant/30 hover:border-primary transition-all text-left space-y-3 relative overflow-hidden">
              <div className="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                {getIcon(cat.icon)}
              </div>
              <div>
                <h4 className="font-serif text-xl font-semibold text-on-surface group-hover:text-primary transition-colors">{cat.name}</h4>
              </div>
            </button>
          ))}
          
          <a href="#contacto" className="group p-4 rounded-xl bg-surface-container border border-dashed border-primary/40 hover:border-primary transition-all text-left space-y-3 flex flex-col justify-center">
            <div className="w-10 h-10 rounded-lg bg-surface-container-high flex items-center justify-center text-primary">
              <Wand2 className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-serif text-xl font-semibold text-primary">Comisión Custom</h4>
              <p className="text-xs text-outline mt-0.5">Modelado a medida de cualquier universo</p>
            </div>
          </a>
        </div>
      </div>
    </section>
  );
}
