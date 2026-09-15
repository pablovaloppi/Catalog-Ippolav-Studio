import React, { useState, useEffect } from 'react';
import { useAuth } from './contexts/AuthContext';
import { loginWithGoogle, logout, db } from './firebase';
import { collection, addDoc, setDoc, onSnapshot, query, orderBy, deleteDoc, doc, updateDoc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { Product, Category, Designer, SiteConfig } from './types';
import { products as initialProducts } from './data';
import { Plus, ChevronUp, ChevronDown, Trash2, Edit2, LogOut, ImagePlus, UserCircle, Settings, Hash, Sparkles, Eye, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { ProductModal } from './components/ProductModal';

// Removed inline Category interface

export function AdminPanel() {
  const { user, isAdmin, loading } = useAuth();

  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-on-surface">
        <img src="/logo-ippolav.png" alt="Loading..." className="w-16 h-16 animate-scale-pulse object-contain" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-on-surface">
        <div className="max-w-md w-full p-8 bg-surface-container-low border border-outline-variant/30 rounded-xl text-center space-y-6">
          <h1 className="font-serif text-3xl font-bold text-on-surface">Admin Portal</h1>
          <p className="text-on-surface-variant text-sm">Inicia sesión de forma segura para gestionar el catálogo.</p>
          <button 
            onClick={loginWithGoogle}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-white text-black font-semibold rounded-lg hover:bg-gray-100 transition-colors"
          >
            <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
            Ingresar con Google
          </button>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-on-surface">
        <div className="max-w-md w-full p-8 bg-surface-container-low border border-error/30 rounded-xl text-center space-y-6">
          <h1 className="font-serif text-2xl font-bold text-error">Acceso Denegado</h1>
          <p className="text-on-surface-variant text-sm">Tu cuenta ({user.email}) no tiene permisos de administrador.</p>
          <button 
            onClick={logout}
            className="px-6 py-2 border border-outline-variant/50 text-on-surface hover:text-primary rounded-lg transition-colors"
          >
            Cerrar Sesión
          </button>
        </div>
      </div>
    );
  }

  return <AdminDashboard onLogout={logout} />;
}

function AdminDashboard({ onLogout }: { onLogout: () => void }) {
  const [figures, setFigures] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [designers, setDesigners] = useState<Designer[]>([]);
  const [siteConfig, setSiteConfig] = useState<SiteConfig>({
    whatsapp: '',
    instagram: '',
    facebook: '',
    youtube: '',
    whatsappMessageTemplate: 'Hola IPPOLAV STUDIO, me interesa encargar la figura {figura}. ¿Tienen disponibilidad?'
  });
  const [loading, setLoading] = useState(true);
  
  // views: figures-list, figure-form, categories-list, category-form, designers-list, designer-form, config
  const [view, setView] = useState<'figures-list' | 'figure-form' | 'categories-list' | 'category-form' | 'designers-list' | 'designer-form' | 'config'>('figures-list');
  const [editingFigure, setEditingFigure] = useState<Product | null>(null);
  const [previewingFigure, setPreviewingFigure] = useState<Product | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingDesigner, setEditingDesigner] = useState<Designer | null>(null);

  const [figureSearch, setFigureSearch] = useState('');
  const [figureFilterCategory, setFigureFilterCategory] = useState('all');
  const [figuresPerPage, setFiguresPerPage] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Auto assign identifiers modal
  const [showAutoIdModal, setShowAutoIdModal] = useState(false);
  const [autoIdPrefix, setAutoIdPrefix] = useState('#');
  const [autoIdDigits, setAutoIdDigits] = useState(3);
  const [autoIdMode, setAutoIdMode] = useState<'onlyMissing' | 'all'>('onlyMissing');
  const [assigningIds, setAssigningIds] = useState(false);

  const handleAutoAssignIds = async () => {
    const unassigned = figures.filter(f => !f.numericId || f.numericId.trim() === '');
    const targets = autoIdMode === 'onlyMissing' ? unassigned : figures;

    if (targets.length === 0) {
      alert('Todas las figuras ya cuentan con un identificador.');
      setShowAutoIdModal(false);
      return;
    }

    setAssigningIds(true);
    try {
      const batchSize = 100;
      for (let i = 0; i < targets.length; i += batchSize) {
        const batch = writeBatch(db);
        const chunk = targets.slice(i, i + batchSize);

        chunk.forEach((fig, chunkIdx) => {
          let numberVal: number;
          if (autoIdMode === 'onlyMissing') {
            const pos = figures.findIndex(f => f.id === fig.id);
            numberVal = pos !== -1 ? pos + 1 : (i + chunkIdx + 1);
          } else {
            numberVal = i + chunkIdx + 1;
          }

          const padded = String(numberVal).padStart(autoIdDigits, '0');
          const finalId = `${autoIdPrefix}${padded}`;

          const docRef = doc(db, 'figures', fig.id);
          batch.set(docRef, {
            numericId: finalId,
            updatedAt: serverTimestamp()
          }, { merge: true });
        });

        await batch.commit();
      }

      alert(`¡Éxito! Se actualizaron ${targets.length} figuras directamente en la base de datos.`);
      setShowAutoIdModal(false);
    } catch (batchError: any) {
      console.warn('Error en lote, intentando actualización secuencial individual...', batchError);
      try {
        let successCount = 0;
        for (let idx = 0; idx < targets.length; idx++) {
          const fig = targets[idx];
          let numberVal: number;
          if (autoIdMode === 'onlyMissing') {
            const pos = figures.findIndex(f => f.id === fig.id);
            numberVal = pos !== -1 ? pos + 1 : (idx + 1);
          } else {
            numberVal = idx + 1;
          }

          const padded = String(numberVal).padStart(autoIdDigits, '0');
          const finalId = `${autoIdPrefix}${padded}`;

          const docRef = doc(db, 'figures', fig.id);
          await setDoc(docRef, {
            numericId: finalId,
            updatedAt: serverTimestamp()
          }, { merge: true });
          successCount++;
        }

        alert(`¡Éxito! Se actualizaron ${successCount} figuras en la base de datos.`);
        setShowAutoIdModal(false);
      } catch (singleError: any) {
        console.error('Error al actualizar identificadores en Firestore:', singleError);
        const msg = singleError?.message || batchError?.message || 'Error desconocido';
        alert(`Ocurrió un error al guardar los identificadores: ${msg}`);
      }
    } finally {
      setAssigningIds(false);
    }
  };

  const filteredAdminFigures = figures.filter((fig) => {
    const matchesSearch = fig.title.toLowerCase().includes(figureSearch.toLowerCase()) || 
                          (fig.numericId && fig.numericId.toLowerCase().includes(figureSearch.toLowerCase()));
    const matchesCategory = figureFilterCategory === 'all' || fig.franchiseId === figureFilterCategory;
    return matchesSearch && matchesCategory;
  });

  const totalAdminFigures = filteredAdminFigures.length;
  const totalFigurePages = Math.max(1, Math.ceil(totalAdminFigures / figuresPerPage));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalFigurePages);
  const startFigureIndex = (safeCurrentPage - 1) * figuresPerPage;
  const endFigureIndex = Math.min(startFigureIndex + figuresPerPage, totalAdminFigures);
  const paginatedAdminFigures = filteredAdminFigures.slice(startFigureIndex, endFigureIndex);

  useEffect(() => {
    const qFig = query(collection(db, 'figures'), orderBy('order', 'asc'));
    const unsubFig = onSnapshot(qFig, (snapshot) => {
      const data: Product[] = [];
      snapshot.forEach((doc) => data.push({ id: doc.id, ...doc.data() } as Product));
      setFigures(data);
      setLoading(false);
    });

    const qCat = query(collection(db, 'categories'), orderBy('order', 'asc'));
    const unsubCat = onSnapshot(qCat, (snapshot) => {
      const data: Category[] = [];
      snapshot.forEach((doc) => data.push({ id: doc.id, ...doc.data() } as Category));
      setCategories(data);
    });

    const qDes = query(collection(db, 'designers'), orderBy('order', 'asc'));
    const unsubDes = onSnapshot(qDes, (snapshot) => {
      const data: Designer[] = [];
      snapshot.forEach((doc) => data.push({ id: doc.id, ...doc.data() } as Designer));
      setDesigners(data);
    });

    const unsubConfig = onSnapshot(doc(db, 'config', 'site'), (docSnapshot) => {
      if (docSnapshot.exists()) {
        setSiteConfig(docSnapshot.data() as SiteConfig);
      }
    });

    return () => { unsubFig(); unsubCat(); unsubDes(); unsubConfig(); };
  }, []);

  const seedData = async () => {
    if (confirm('¿Estás seguro de que quieres cargar los datos iniciales? Esto añadirá las figuras y categorías de prueba a la base de datos.')) {
      setLoading(true);
      try {
        const batch = writeBatch(db);
        
        // Seed categories
        const initCats = [
          { id: 'marvel', name: 'Marvel', icon: 'shield' },
          { id: 'dc', name: 'DC Comics', icon: 'moon' },
          { id: 'anime', name: 'Anime & Manga', icon: 'zap' },
          { id: 'dragon-ball', name: 'Dragon Ball', icon: 'star', parentId: 'anime' },
          { id: 'videojuegos', name: 'Videojuegos', icon: 'gamepad2' },
          { id: 'cinema', name: 'Cine y Series', icon: 'film' },
        ];
        initCats.forEach((c, index) => {
          const docRef = doc(db, 'categories', c.id);
          batch.set(docRef, { ...c, order: index });
        });

        // Seed figures
        initialProducts.forEach((p, index) => {
          const docRef = doc(collection(db, 'figures'));
          const payload = {
            numericId: p.numericId || `#${String(index + 1).padStart(3, '0')}`,
            title: p.title,
            franchiseId: p.franchiseId,
            status: p.status,
            imageUrls: p.imageUrls,
            finish: p.finish,
            scale: p.scale,
            material: p.material,
            description: p.description || '',
            badge: p.badge || '',
            whatsappMessage: `Hola IPPOLAV STUDIO, me interesa encargar la figura ${p.title}. ¿Tienen disponibilidad?`,
            order: index,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          };
          batch.set(docRef, payload);
        });
        
        await batch.commit();
        alert('Datos iniciales cargados correctamente.');
      } catch (e) {
        console.error(e);
        alert('Error al cargar datos iniciales.');
      }
      setLoading(false);
    }
  };

  const moveFigure = async (index: number, direction: -1 | 1) => {
    if (index + direction < 0 || index + direction >= figures.length) return;
    const newItems = [...figures];
    const temp = newItems[index];
    newItems[index] = newItems[index + direction];
    newItems[index + direction] = temp;
    setFigures(newItems);

    const batch = writeBatch(db);
    newItems.forEach((item, i) => batch.update(doc(db, 'figures', item.id), { order: i, updatedAt: serverTimestamp() }));
    await batch.commit();
  };

  const moveCategory = async (index: number, direction: -1 | 1) => {
    if (index + direction < 0 || index + direction >= categories.length) return;
    const newItems = [...categories];
    const temp = newItems[index];
    newItems[index] = newItems[index + direction];
    newItems[index + direction] = temp;
    setCategories(newItems);

    const batch = writeBatch(db);
    newItems.forEach((item, i) => batch.update(doc(db, 'categories', item.id), { order: i }));
    await batch.commit();
  };

  const moveDesigner = async (index: number, direction: -1 | 1) => {
    if (index + direction < 0 || index + direction >= designers.length) return;
    const newItems = [...designers];
    const temp = newItems[index];
    newItems[index] = newItems[index + direction];
    newItems[index + direction] = temp;
    setDesigners(newItems);

    const batch = writeBatch(db);
    newItems.forEach((item, i) => batch.update(doc(db, 'designers', item.id), { order: i }));
    await batch.commit();
  };

  return (
    <div className="min-h-screen bg-background text-on-surface flex flex-col">
      <header className="bg-surface-container border-b border-outline-variant/30 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 md:px-6 min-h-[64px] flex flex-col md:flex-row items-center justify-between py-3 md:py-0 gap-3 md:gap-0">
          <div className="flex flex-col md:flex-row items-center gap-3 md:gap-6 w-full md:w-auto">
            <div className="flex items-center justify-between w-full md:w-auto">
              <span className="font-serif text-xl text-primary font-bold">IPPOLAV ADMIN</span>
              <button onClick={onLogout} className="flex md:hidden items-center gap-2 text-sm text-on-surface-variant hover:text-error transition-colors">
                <LogOut className="w-4 h-4" /> Salir
              </button>
            </div>
            <div className="hidden md:block h-6 w-px bg-outline-variant/50"></div>
            <nav className="flex items-center gap-4 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 no-scrollbar justify-start">
              <button 
                onClick={() => { setView('figures-list'); setEditingFigure(null); }} 
                className={`text-sm font-semibold whitespace-nowrap transition-colors ${view.startsWith('figure') ? 'text-primary' : 'text-on-surface-variant hover:text-on-surface'}`}
              >
                Figuras
              </button>
              <button 
                onClick={() => { setView('categories-list'); setEditingCategory(null); }} 
                className={`text-sm font-semibold whitespace-nowrap transition-colors ${view.startsWith('category') ? 'text-primary' : 'text-on-surface-variant hover:text-on-surface'}`}
              >
                Categorías
              </button>
              <button 
                onClick={() => { setView('designers-list'); setEditingDesigner(null); }} 
                className={`text-sm font-semibold whitespace-nowrap transition-colors ${view.startsWith('designer') ? 'text-primary' : 'text-on-surface-variant hover:text-on-surface'}`}
              >
                Diseñadores
              </button>
              <button 
                onClick={() => { setView('config'); }} 
                className={`text-sm font-semibold whitespace-nowrap transition-colors flex items-center gap-1 ${view === 'config' ? 'text-primary' : 'text-on-surface-variant hover:text-on-surface'}`}
              >
                <Settings className="w-4 h-4" /> Configuración
              </button>
            </nav>
          </div>
          <button onClick={onLogout} className="hidden md:flex items-center gap-2 text-sm text-on-surface-variant hover:text-error transition-colors">
            <LogOut className="w-4 h-4" /> Salir
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 flex-1 w-full">
        {loading ? (
          <div className="flex justify-center items-center py-24">
            <img src="/logo-ippolav.png" alt="Loading..." className="w-16 h-16 animate-scale-pulse object-contain" />
          </div>
        ) : view === 'figures-list' ? (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-serif font-bold">Catálogo de Figuras</h2>
              <div className="flex gap-3">
                {figures.length === 0 && (
                  <button onClick={seedData} className="px-4 py-2 border border-outline-variant/50 hover:text-primary rounded-lg text-sm font-semibold transition-colors">
                    Cargar Datos Demo
                  </button>
                )}
                {figures.length > 0 && (
                  <button 
                    onClick={() => setShowAutoIdModal(true)} 
                    className="flex items-center gap-2 px-3 py-2 border border-primary/40 text-primary hover:bg-primary/10 font-semibold rounded-lg text-sm transition-all"
                    title="Asignar identificadores numéricos a las figuras"
                  >
                    <Hash className="w-4 h-4" /> Asignar Identificadores
                  </button>
                )}
                <button onClick={() => { setEditingFigure(null); setView('figure-form'); }} className="flex items-center gap-2 px-4 py-2 bg-primary text-on-primary font-bold rounded-lg hover:brightness-110 active:scale-95 transition-all">
                  <Plus className="w-4 h-4" /> Nueva Figura
                </button>
              </div>
            </div>

            {/* Modal de asignación automática de identificadores */}
            {showAutoIdModal && (
              <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-surface-container border border-outline-variant/30 rounded-2xl max-w-lg w-full p-6 space-y-6 shadow-2xl animate-fade-in">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 text-primary font-bold text-lg">
                        <Sparkles className="w-5 h-5" />
                        <h3>Asignar Identificadores a Figuras</h3>
                      </div>
                      <p className="text-xs text-on-surface-variant mt-1">
                        Genera y guarda identificadores correlativos para tus figuras directamente en la base de datos de Firebase.
                      </p>
                    </div>
                    <button 
                      onClick={() => !assigningIds && setShowAutoIdModal(false)}
                      className="text-on-surface-variant hover:text-on-surface p-1 text-lg font-bold"
                      disabled={assigningIds}
                    >
                      ✕
                    </button>
                  </div>

                  {/* Estadísticas */}
                  <div className="grid grid-cols-3 gap-3 bg-surface-container-low p-3 rounded-xl border border-outline-variant/20 text-center text-xs">
                    <div>
                      <span className="text-on-surface-variant block">Total Figuras</span>
                      <strong className="text-sm text-on-surface font-mono">{figures.length}</strong>
                    </div>
                    <div>
                      <span className="text-on-surface-variant block">Con Identificador</span>
                      <strong className="text-sm text-green-400 font-mono">
                        {figures.filter(f => f.numericId && f.numericId.trim() !== '').length}
                      </strong>
                    </div>
                    <div>
                      <span className="text-on-surface-variant block">Sin Identificador</span>
                      <strong className="text-sm text-amber-400 font-mono">
                        {figures.filter(f => !f.numericId || f.numericId.trim() === '').length}
                      </strong>
                    </div>
                  </div>

                  {/* Opciones */}
                  <div className="space-y-4 text-sm">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-on-surface-variant uppercase">Prefijo</label>
                        <input 
                          type="text" 
                          value={autoIdPrefix} 
                          onChange={(e) => setAutoIdPrefix(e.target.value)}
                          placeholder="Ej: #" 
                          className="w-full bg-surface-container-lowest border border-outline-variant/40 rounded p-2 text-sm focus:border-primary outline-none"
                          disabled={assigningIds}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-on-surface-variant uppercase">Dígitos</label>
                        <select 
                          value={autoIdDigits} 
                          onChange={(e) => setAutoIdDigits(Number(e.target.value))}
                          className="w-full bg-surface-container-lowest border border-outline-variant/40 rounded p-2 text-sm focus:border-primary outline-none"
                          disabled={assigningIds}
                        >
                          <option value={2}>2 dígitos (01, 02...)</option>
                          <option value={3}>3 dígitos (001, 002...)</option>
                          <option value={4}>4 dígitos (0001, 0002...)</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-2 pt-2">
                      <label className="text-xs font-semibold text-on-surface-variant uppercase block">Modo de aplicación</label>
                      <label className="flex items-start gap-2 p-3 bg-surface-container-low rounded-lg border border-outline-variant/20 cursor-pointer hover:border-primary/40 transition-colors">
                        <input 
                          type="radio" 
                          name="autoIdMode" 
                          value="onlyMissing" 
                          checked={autoIdMode === 'onlyMissing'}
                          onChange={() => setAutoIdMode('onlyMissing')}
                          disabled={assigningIds}
                          className="mt-0.5"
                        />
                        <div>
                          <span className="font-semibold block text-on-surface">Solo figuras sin identificador</span>
                          <span className="text-xs text-on-surface-variant">Conserva los identificadores que ya creaste y numera las restantes.</span>
                        </div>
                      </label>

                      <label className="flex items-start gap-2 p-3 bg-surface-container-low rounded-lg border border-outline-variant/20 cursor-pointer hover:border-primary/40 transition-colors">
                        <input 
                          type="radio" 
                          name="autoIdMode" 
                          value="all" 
                          checked={autoIdMode === 'all'}
                          onChange={() => setAutoIdMode('all')}
                          disabled={assigningIds}
                          className="mt-0.5"
                        />
                        <div>
                          <span className="font-semibold block text-on-surface">Renumerar todas las figuras</span>
                          <span className="text-xs text-on-surface-variant">Asigna una secuencia correlativa completa (#001, #002...) según el orden actual.</span>
                        </div>
                      </label>
                    </div>

                    <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg flex items-center justify-between text-xs">
                      <span className="text-on-surface-variant">Ejemplo de código:</span>
                      <strong className="font-mono text-primary text-sm font-bold">
                        {autoIdPrefix}{String(1).padStart(autoIdDigits, '0')}
                      </strong>
                    </div>

                    <p className="text-xs text-outline italic">
                      ✓ Estos datos se guardarán de forma permanente en la base de datos de Firebase Firestore y estarán disponibles de inmediato para tus mensajes de WhatsApp.
                    </p>
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t border-outline-variant/20">
                    <button 
                      onClick={() => setShowAutoIdModal(false)}
                      disabled={assigningIds}
                      className="px-4 py-2 border border-outline-variant/40 rounded-lg text-sm font-semibold hover:bg-surface-container-highest transition-colors disabled:opacity-50"
                    >
                      Cancelar
                    </button>
                    <button 
                      onClick={handleAutoAssignIds}
                      disabled={assigningIds}
                      className="px-5 py-2 bg-primary text-on-primary font-bold rounded-lg hover:brightness-110 active:scale-95 transition-all text-sm flex items-center gap-2 disabled:opacity-50"
                    >
                      {assigningIds ? (
                        <>
                          <img src="/logo-ippolav.png" alt="" className="w-4 h-4 animate-spin" />
                          Guardando en base de datos...
                        </>
                      ) : (
                        <>
                          <Hash className="w-4 h-4" />
                          Guardar en Base de Datos
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-4">
              <div className="flex flex-1 flex-col sm:flex-row gap-3">
                <input 
                  type="text" 
                  placeholder="Buscar por título o identificador..." 
                  value={figureSearch} 
                  onChange={(e) => {
                    setFigureSearch(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="flex-1 bg-surface-container border border-outline-variant/40 rounded p-2 text-sm focus:border-primary outline-none"
                />
                <select 
                  value={figureFilterCategory} 
                  onChange={(e) => {
                    setFigureFilterCategory(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="bg-surface-container border border-outline-variant/40 rounded p-2 text-sm focus:border-primary outline-none"
                >
                  <option value="all">Todas las categorías</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-2 bg-surface-container-low px-3 py-1.5 rounded-lg border border-outline-variant/30 text-xs text-on-surface-variant">
                <span className="font-medium whitespace-nowrap">Por página:</span>
                <div className="inline-flex rounded-md border border-outline-variant/40 bg-surface-container p-0.5">
                  {[10, 50, 100].map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => {
                        setFiguresPerPage(size);
                        setCurrentPage(1);
                      }}
                      className={`px-2.5 py-1 text-xs font-semibold rounded transition-all ${
                        figuresPerPage === size
                          ? 'bg-primary text-on-primary shadow-sm'
                          : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-surface-container-low border border-outline-variant/30 rounded-xl overflow-hidden">
              {filteredAdminFigures.length === 0 ? (
                <div className="p-8 text-center text-on-surface-variant">No se encontraron figuras.</div>
              ) : (
                <>
                  <div className="divide-y divide-outline-variant/20">
                    {paginatedAdminFigures.map((fig) => (
                      <div 
                        key={fig.id} 
                        onClick={() => setPreviewingFigure(fig)}
                        className="flex items-center p-4 hover:bg-surface-container transition-colors group cursor-pointer"
                        title="Haz clic para ver la vista previa de los datos de esta figura"
                      >
                        <div className="flex flex-col gap-1 pr-4" onClick={(e) => e.stopPropagation()}>
                          <button onClick={() => moveFigure(figures.indexOf(fig), -1)} disabled={figures.indexOf(fig) === 0} className="text-outline hover:text-primary disabled:opacity-30"><ChevronUp className="w-5 h-5" /></button>
                          <button onClick={() => moveFigure(figures.indexOf(fig), 1)} disabled={figures.indexOf(fig) === figures.length - 1} className="text-outline hover:text-primary disabled:opacity-30"><ChevronDown className="w-5 h-5" /></button>
                        </div>
                        <div className="w-16 h-16 rounded bg-surface-container-lowest border border-outline-variant/30 overflow-hidden flex-shrink-0">
                          {fig.imageUrls?.[0] ? <img src={fig.imageUrls[0]} alt={fig.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" /> : <div className="w-full h-full flex items-center justify-center text-outline"><ImagePlus className="w-6 h-6" /></div>}
                        </div>
                        <div className="ml-4 flex-1 min-w-0 pr-2">
                          <h3 className="font-semibold text-on-surface truncate group-hover:text-primary transition-colors flex items-center gap-2">
                            {fig.numericId && <span className="text-primary font-mono text-xs border border-primary/30 bg-primary/10 px-1.5 py-0.5 rounded flex-shrink-0">{fig.numericId}</span>}
                            <span className="truncate">{fig.title}</span>
                          </h3>
                          <p className="text-xs text-on-surface-variant truncate mt-0.5">Categoría: {categories.find(c => c.id === fig.franchiseId)?.name || fig.franchiseId} • {fig.status}</p>
                        </div>
                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          <button 
                            onClick={() => setPreviewingFigure(fig)} 
                            title="Ver vista previa"
                            className="p-2 text-on-surface hover:text-primary rounded-lg bg-surface-container-highest transition-colors opacity-80 hover:opacity-100"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => { setEditingFigure(fig); setView('figure-form'); }} 
                            title="Editar figura"
                            className="p-2 text-on-surface hover:text-primary rounded-lg bg-surface-container-highest transition-colors opacity-80 hover:opacity-100"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => confirm('¿Eliminar figura?') && deleteDoc(doc(db, 'figures', fig.id))} 
                            title="Eliminar figura"
                            className="p-2 text-on-surface hover:text-error rounded-lg bg-surface-container-highest transition-colors opacity-80 hover:opacity-100"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Barra de paginación */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-3 border-t border-outline-variant/20 bg-surface-container-low/60 text-xs text-on-surface-variant">
                    <div>
                      Mostrando <span className="font-semibold text-on-surface">{startFigureIndex + 1}</span> a{' '}
                      <span className="font-semibold text-on-surface">{endFigureIndex}</span> de{' '}
                      <span className="font-semibold text-on-surface">{totalAdminFigures}</span> figuras
                      {totalFigurePages > 1 && (
                        <span className="ml-2 text-outline">(Página {safeCurrentPage} de {totalFigurePages})</span>
                      )}
                    </div>

                    {totalFigurePages > 1 && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setCurrentPage(1)}
                          disabled={safeCurrentPage === 1}
                          title="Primera página"
                          className="p-1.5 rounded-md border border-outline-variant/30 text-on-surface hover:text-primary hover:bg-surface-container-highest transition-colors disabled:opacity-30 disabled:pointer-events-none"
                        >
                          <ChevronsLeft className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                          disabled={safeCurrentPage === 1}
                          title="Página anterior"
                          className="p-1.5 rounded-md border border-outline-variant/30 text-on-surface hover:text-primary hover:bg-surface-container-highest transition-colors disabled:opacity-30 disabled:pointer-events-none"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>

                        <div className="flex items-center gap-1 px-1">
                          {(() => {
                            const pages: (number | 'ellipsis')[] = [];
                            if (totalFigurePages <= 7) {
                              for (let i = 1; i <= totalFigurePages; i++) pages.push(i);
                            } else {
                              pages.push(1);
                              if (safeCurrentPage > 3) pages.push('ellipsis');
                              const start = Math.max(2, safeCurrentPage - 1);
                              const end = Math.min(totalFigurePages - 1, safeCurrentPage + 1);
                              for (let i = start; i <= end; i++) pages.push(i);
                              if (safeCurrentPage < totalFigurePages - 2) pages.push('ellipsis');
                              pages.push(totalFigurePages);
                            }

                            return pages.map((p, idx) => {
                              if (p === 'ellipsis') {
                                return (
                                  <span key={`ellipsis-${idx}`} className="px-1 text-on-surface-variant select-none">
                                    …
                                  </span>
                                );
                              }
                              const isCurrent = p === safeCurrentPage;
                              return (
                                <button
                                  key={p}
                                  onClick={() => setCurrentPage(p)}
                                  className={`min-w-[28px] h-7 px-2 text-xs font-semibold rounded-md transition-all ${
                                    isCurrent
                                      ? 'bg-primary text-on-primary shadow-sm'
                                      : 'border border-outline-variant/30 text-on-surface hover:bg-surface-container-highest hover:text-primary'
                                  }`}
                                >
                                  {p}
                                </button>
                              );
                            });
                          })()}
                        </div>

                        <button
                          onClick={() => setCurrentPage(prev => Math.min(totalFigurePages, prev + 1))}
                          disabled={safeCurrentPage === totalFigurePages}
                          title="Página siguiente"
                          className="p-1.5 rounded-md border border-outline-variant/30 text-on-surface hover:text-primary hover:bg-surface-container-highest transition-colors disabled:opacity-30 disabled:pointer-events-none"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setCurrentPage(totalFigurePages)}
                          disabled={safeCurrentPage === totalFigurePages}
                          title="Última página"
                          className="p-1.5 rounded-md border border-outline-variant/30 text-on-surface hover:text-primary hover:bg-surface-container-highest transition-colors disabled:opacity-30 disabled:pointer-events-none"
                        >
                          <ChevronsRight className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        ) : view === 'categories-list' ? (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-serif font-bold">Categorías (Franquicias)</h2>
              <button onClick={() => { setEditingCategory(null); setView('category-form'); }} className="flex items-center gap-2 px-4 py-2 bg-primary text-on-primary font-bold rounded-lg hover:brightness-110 active:scale-95 transition-all">
                <Plus className="w-4 h-4" /> Nueva Categoría
              </button>
            </div>

            <div className="bg-surface-container-low border border-outline-variant/30 rounded-xl overflow-hidden">
              {categories.length === 0 ? (
                <div className="p-8 text-center text-on-surface-variant">No hay categorías.</div>
              ) : (
                <div className="divide-y divide-outline-variant/20">
                  {categories.map((cat, index) => (
                    <div key={cat.id} className="flex items-center p-4 hover:bg-surface-container transition-colors group">
                      <div className="flex flex-col gap-1 pr-4">
                        <button onClick={() => moveCategory(index, -1)} disabled={index === 0} className="text-outline hover:text-primary disabled:opacity-30"><ChevronUp className="w-5 h-5" /></button>
                        <button onClick={() => moveCategory(index, 1)} disabled={index === categories.length - 1} className="text-outline hover:text-primary disabled:opacity-30"><ChevronDown className="w-5 h-5" /></button>
                      </div>
                      <div className="ml-4 flex-1">
                        <h3 className="font-semibold text-on-surface">
                          {cat.parentId ? <span className="text-outline mr-2">↳ {categories.find(c => c.id === cat.parentId)?.name || cat.parentId} -</span> : null}
                          {cat.name} 
                        </h3>
                        <p className="text-xs text-on-surface-variant">Ícono: {cat.icon} <span className="font-mono text-outline ml-2">ID: {cat.id}</span></p>
                      </div>
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => { setEditingCategory(cat); setView('category-form'); }} className="p-2 text-on-surface hover:text-primary rounded-lg bg-surface-container-highest"><Edit2 className="w-4 h-4" /></button>
                        <button onClick={() => confirm('¿Eliminar categoría?') && deleteDoc(doc(db, 'categories', cat.id))} className="p-2 text-on-surface hover:text-error rounded-lg bg-surface-container-highest"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : view === 'category-form' ? (
          <CategoryForm 
            category={editingCategory} 
            categories={categories}
            onBack={() => { setView('categories-list'); setEditingCategory(null); }} 
            orderCount={categories.length} 
          />
        ) : view === 'designers-list' ? (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-serif font-bold">Diseñadores</h2>
              <button onClick={() => { setEditingDesigner(null); setView('designer-form'); }} className="flex items-center gap-2 px-4 py-2 bg-primary text-on-primary font-bold rounded-lg hover:brightness-110 active:scale-95 transition-all">
                <Plus className="w-4 h-4" /> Nuevo Diseñador
              </button>
            </div>

            <div className="bg-surface-container-low border border-outline-variant/30 rounded-xl overflow-hidden">
              {designers.length === 0 ? (
                <div className="p-8 text-center text-on-surface-variant">No hay diseñadores registrados.</div>
              ) : (
                <div className="divide-y divide-outline-variant/20">
                  {designers.map((designer, index) => (
                    <div key={designer.id} className="flex items-center p-4 hover:bg-surface-container transition-colors group">
                      <div className="flex flex-col gap-1 pr-4">
                        <button onClick={() => moveDesigner(index, -1)} disabled={index === 0} className="text-outline hover:text-primary disabled:opacity-30"><ChevronUp className="w-5 h-5" /></button>
                        <button onClick={() => moveDesigner(index, 1)} disabled={index === designers.length - 1} className="text-outline hover:text-primary disabled:opacity-30"><ChevronDown className="w-5 h-5" /></button>
                      </div>
                      <div className="w-12 h-12 rounded bg-surface-container-lowest border border-outline-variant/30 overflow-hidden flex flex-shrink-0 items-center justify-center text-outline">
                        <UserCircle className="w-6 h-6" />
                      </div>
                      <div className="ml-4 flex-1">
                        <h3 className="font-semibold text-on-surface">{designer.name}</h3>
                        <p className="text-xs font-mono text-outline">ID: {designer.id}</p>
                      </div>
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => { setEditingDesigner(designer); setView('designer-form'); }} className="p-2 text-on-surface hover:text-primary rounded-lg bg-surface-container-highest"><Edit2 className="w-4 h-4" /></button>
                        <button onClick={() => confirm('¿Eliminar diseñador?') && deleteDoc(doc(db, 'designers', designer.id))} className="p-2 text-on-surface hover:text-error rounded-lg bg-surface-container-highest"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : view === 'designer-form' ? (
          <DesignerForm
            designer={editingDesigner}
            onBack={() => { setView('designers-list'); setEditingDesigner(null); }}
            orderCount={designers.length}
          />
        ) : view === 'config' ? (
          <ConfigForm config={siteConfig} />
        ) : (
          <FigureForm 
            figure={editingFigure} 
            categories={categories}
            designers={designers}
            onBack={() => { setView('figures-list'); setEditingFigure(null); }} 
            orderCount={figures.length} 
          />
        )}
      </main>

      {/* Modal de Vista Previa de la Figura */}
      {previewingFigure && (
        <ProductModal 
          product={previewingFigure} 
          categoryName={categories.find(c => c.id === previewingFigure.franchiseId)?.name}
          designerName={designers.find(d => d.id === previewingFigure.designerId)?.name}
          onClose={() => setPreviewingFigure(null)}
          config={siteConfig}
        />
      )}
    </div>
  );
}

function DesignerForm({ designer, onBack, orderCount }: { designer: Designer | null, onBack: () => void, orderCount: number }) {
  const [formData, setFormData] = useState<Partial<Designer>>(designer || {
    id: '', name: ''
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return alert("Nombre es requerido");
    setLoading(true);
    try {
      const payload = {
        name: formData.name,
      };
      
      if (designer) {
        await updateDoc(doc(db, 'designers', designer.id), payload);
      } else {
        const newId = formData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        await setDoc(doc(db, 'designers', newId), {
          ...payload,
          id: newId,
          order: orderCount
        });
      }
      onBack();
    } catch(err) {
      console.error(err);
      alert("Error guardando diseñador");
    }
    setLoading(false);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-serif font-bold">{designer ? 'Editar Diseñador' : 'Nuevo Diseñador'}</h2>
        <button onClick={onBack} className="text-sm font-semibold text-on-surface-variant hover:text-on-surface">Volver</button>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4 bg-surface-container-low p-6 rounded-xl border border-outline-variant/30 gold-border-glow">
        <div className="space-y-1">
          <label className="text-xs font-bold text-on-surface-variant uppercase">Nombre</label>
          <input required name="name" value={formData.name} onChange={handleChange} className="w-full bg-surface-container border border-outline-variant/40 rounded p-2 text-sm focus:border-primary outline-none" />
        </div>
        <div className="flex justify-end pt-4">
          <button type="submit" disabled={loading} className="px-6 py-2 gold-shimmer text-on-primary-fixed font-bold rounded-lg hover:brightness-110 active:scale-95 transition-all">Guardar</button>
        </div>
      </form>
    </div>
  );
}

function CategoryForm({ category, categories, onBack, orderCount }: { category: Category | null, categories: Category[], onBack: () => void, orderCount: number }) {
  const [formData, setFormData] = useState<Partial<Category>>(category || {
    id: '', name: '', icon: 'shield', parentId: ''
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return alert("Nombre es requerido");
    setLoading(true);
    try {
      const payload = {
        name: formData.name,
        icon: formData.icon || 'star',
        parentId: formData.parentId || '',
      };
      
      if (category) {
        await updateDoc(doc(db, 'categories', category.id), payload);
      } else {
        const newId = formData.name.toLowerCase().replace(/\s+/g, '-');
        await setDoc(doc(db, 'categories', newId), {
          ...payload,
          id: newId,
          order: orderCount
        });
      }
      onBack();
    } catch(err) {
      console.error(err);
      alert("Error guardando categoría");
    }
    setLoading(false);
  };

  const parentOptions = categories.filter(c => c.id !== category?.id && !c.parentId);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-serif font-bold">{category ? 'Editar Categoría' : 'Nueva Categoría'}</h2>
        <button onClick={onBack} className="text-sm font-semibold text-on-surface-variant hover:text-on-surface">Volver</button>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4 bg-surface-container-low p-6 rounded-xl border border-outline-variant/30 gold-border-glow">
        <div className="space-y-1">
          <label className="text-xs font-bold text-on-surface-variant uppercase">Nombre</label>
          <input required name="name" value={formData.name} onChange={handleChange} className="w-full bg-surface-container border border-outline-variant/40 rounded p-2 text-sm focus:border-primary outline-none" />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-bold text-on-surface-variant uppercase">Subcategoría de (Opcional)</label>
          <select name="parentId" value={formData.parentId} onChange={handleChange} className="w-full bg-surface-container border border-outline-variant/40 rounded p-2 text-sm focus:border-primary outline-none">
            <option value="">Ninguna (Categoría Principal)</option>
            {parentOptions.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-bold text-on-surface-variant uppercase">Ícono (Lucide)</label>
          <select name="icon" value={formData.icon} onChange={handleChange} className="w-full bg-surface-container border border-outline-variant/40 rounded p-2 text-sm focus:border-primary outline-none">
            <option value="shield">Shield (Marvel/Action)</option>
            <option value="moon">Moon (DC/Dark)</option>
            <option value="zap">Zap (Anime/Energy)</option>
            <option value="gamepad2">Gamepad (Juegos)</option>
            <option value="film">Film (Cine/Series)</option>
            <option value="star">Star (General)</option>
            <option value="sword">Sword (Fantasía)</option>
          </select>
        </div>
        <div className="flex justify-end pt-4">
          <button type="submit" disabled={loading} className="px-6 py-2 gold-shimmer text-on-primary-fixed font-bold rounded-lg hover:brightness-110 active:scale-95 transition-all">Guardar</button>
        </div>
      </form>
    </div>
  );
}

function FigureForm({ figure, categories, designers, onBack, orderCount }: { figure: Product | null, categories: Category[], designers: Designer[], onBack: () => void, orderCount: number }) {
  const [formData, setFormData] = useState<Partial<Product>>(figure || {
    numericId: '',
    title: '',
    franchiseId: categories[0]?.id || 'marvel',
    designerId: '',
    status: 'consultar',
    imageUrls: [],
    finish: 'Hiperrealista',
    scale: [],
    material: 'Resina',
    description: '',
    badge: '',
    whatsappMessage: ''
  });
  const [loading, setLoading] = useState(false);

  const processImage = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 1200;
          const MAX_HEIGHT = 1200;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.8));
        };
      };
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleScaleToggle = (option: string) => {
    setFormData(prev => {
      const currentScales = prev.scale || [];
      if (currentScales.includes(option)) {
        return { ...prev, scale: currentScales.filter(s => s !== option) };
      } else {
        return { ...prev, scale: [...currentScales, option] };
      }
    });
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    setLoading(true);
    const files = Array.from(e.target.files);
    try {
      const compressedImages = await Promise.all(files.map(processImage));
      setFormData(prev => ({ ...prev, imageUrls: [...(prev.imageUrls || []), ...compressedImages] }));
    } catch (err) {
      console.error(err);
      alert('Error procesando imágenes');
    }
    setLoading(false);
    // Reset file input
    e.target.value = '';
  };

  const removeImage = (index: number) => {
    const newImages = [...(formData.imageUrls || [])];
    newImages.splice(index, 1);
    setFormData(prev => ({ ...prev, imageUrls: newImages }));
  };

  const moveImage = (index: number, direction: -1 | 1) => {
    const newImages = [...(formData.imageUrls || [])];
    if (index + direction < 0 || index + direction >= newImages.length) return;
    const temp = newImages[index];
    newImages[index] = newImages[index + direction];
    newImages[index + direction] = temp;
    setFormData(prev => ({ ...prev, imageUrls: newImages }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        numericId: formData.numericId || '',
        title: formData.title || '',
        franchiseId: formData.franchiseId || categories[0]?.id || 'marvel',
        designerId: formData.designerId || '',
        status: formData.status || 'disponible',
        imageUrls: (formData.imageUrls || []).filter(u => u.trim() !== ''),
        finish: formData.finish || 'Hiperrealista',
        scale: formData.scale || [],
        material: formData.material || 'Resina',
        description: formData.description || '',
        badge: formData.badge || '',
        whatsappMessage: formData.whatsappMessage || '',
      };

      if (figure?.id) {
        await updateDoc(doc(db, 'figures', figure.id), {
          ...payload,
          updatedAt: serverTimestamp()
        });
      } else {
        await addDoc(collection(db, 'figures'), {
          ...payload,
          order: orderCount,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }
      onBack();
    } catch (error) {
      console.error(error);
      alert('Error guardando la figura.');
    }
    setLoading(false);
  };

  const scaleOptions = ['1:8', '1:6', '1:4', '1:2', '1:1', 'Chibi'];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-serif font-bold">{figure ? 'Editar Figura' : 'Nueva Figura'}</h2>
        <button onClick={onBack} className="text-sm font-semibold text-on-surface-variant hover:text-on-surface">Volver al listado</button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 bg-surface-container-low p-6 rounded-xl border border-outline-variant/30 gold-border-glow">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-on-surface-variant uppercase">Identificador (Ej: #001)</label>
            <input name="numericId" value={formData.numericId || ''} onChange={handleChange} placeholder="Opcional" className="w-full bg-surface-container border border-outline-variant/40 rounded p-2 text-sm focus:border-primary outline-none" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-on-surface-variant uppercase">Título</label>
            <input required name="title" value={formData.title} onChange={handleChange} className="w-full bg-surface-container border border-outline-variant/40 rounded p-2 text-sm focus:border-primary outline-none" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-on-surface-variant uppercase">Categoría</label>
            <select name="franchiseId" value={formData.franchiseId} onChange={handleChange} className="w-full bg-surface-container border border-outline-variant/40 rounded p-2 text-sm focus:border-primary outline-none">
              {categories.filter(c => !c.parentId).map(c => (
                <optgroup key={c.id} label={c.name}>
                  <option value={c.id}>{c.name}</option>
                  {categories.filter(sub => sub.parentId === c.id).map(sub => (
                    <option key={sub.id} value={sub.id}>↳ {sub.name}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-on-surface-variant uppercase">Estado</label>
            <select name="status" value={formData.status} onChange={handleChange} className="w-full bg-surface-container border border-outline-variant/40 rounded p-2 text-sm focus:border-primary outline-none">
              <option value="disponible">Disponible</option>
              <option value="consultar">Consultar</option>
              <option value="proximamente">Próximamente</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-on-surface-variant uppercase flex gap-1">
              Diseñador
              <span className="text-[10px] text-outline normal-case">(Opcional)</span>
            </label>
            <select name="designerId" value={formData.designerId || ''} onChange={handleChange} className="w-full bg-surface-container border border-outline-variant/40 rounded p-2 text-sm focus:border-primary outline-none">
              <option value="">Seleccionar diseñador...</option>
              {designers.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
          
          <div className="space-y-1 md:col-span-2 pt-4 border-t border-outline-variant/20">
            <label className="text-xs font-bold text-primary uppercase block mb-2">Galería de Imágenes (La primera es la portada)</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
              {(formData.imageUrls || []).map((url, i) => (
                <div key={i} className="relative aspect-square bg-surface-container-lowest border border-outline-variant/40 rounded-lg overflow-hidden group">
                  <img src={url} alt="" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button type="button" onClick={() => moveImage(i, -1)} disabled={i === 0} className="p-1.5 bg-surface-container rounded-full text-on-surface hover:text-primary disabled:opacity-30"><ChevronUp className="w-4 h-4 -rotate-90" /></button>
                    <button type="button" onClick={() => removeImage(i)} className="p-1.5 bg-surface-container rounded-full text-on-surface hover:text-error"><Trash2 className="w-4 h-4" /></button>
                    <button type="button" onClick={() => moveImage(i, 1)} disabled={i === (formData.imageUrls?.length || 1) - 1} className="p-1.5 bg-surface-container rounded-full text-on-surface hover:text-primary disabled:opacity-30"><ChevronDown className="w-4 h-4 -rotate-90" /></button>
                  </div>
                  {i === 0 && (
                    <div className="absolute top-2 left-2 bg-primary/90 text-on-primary text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">
                      Portada
                    </div>
                  )}
                </div>
              ))}
              <label className="aspect-square bg-surface-container hover:bg-surface-container-high border border-dashed border-outline-variant/50 rounded-lg flex flex-col items-center justify-center cursor-pointer transition-colors text-on-surface-variant hover:text-primary">
                <ImagePlus className="w-6 h-6 mb-2" />
                <span className="text-xs font-semibold">Seleccionar</span>
                <input type="file" multiple accept="image/*" onChange={handleFileSelect} className="hidden" />
              </label>
            </div>
          </div>

          <div className="space-y-1 pt-4 border-t border-outline-variant/20">
            <label className="text-xs font-bold text-on-surface-variant uppercase">Acabado</label>
            <select required name="finish" value={formData.finish} onChange={handleChange} className="w-full bg-surface-container border border-outline-variant/40 rounded p-2 text-sm focus:border-primary outline-none">
              <option value="Hiperrealista">Hiperrealista</option>
              <option value="Anime">Anime</option>
              <option value="Comic">Comic</option>
              <option value="Cell Shading">Cell Shading</option>
            </select>
          </div>
          <div className="space-y-1 pt-4 border-t border-outline-variant/20">
            <label className="text-xs font-bold text-on-surface-variant uppercase mb-2 block">Escala</label>
            <div className="flex flex-wrap gap-2">
              {scaleOptions.map(opt => (
                <label key={opt} className={`cursor-pointer px-3 py-1.5 rounded text-sm font-semibold border transition-all ${formData.scale?.includes(opt) ? 'bg-primary/10 border-primary text-primary' : 'bg-surface-container border-outline-variant/40 text-on-surface-variant hover:border-outline'}`}>
                   <input type="checkbox" className="hidden" checked={formData.scale?.includes(opt) || false} onChange={() => handleScaleToggle(opt)} />
                   {opt}
                </label>
              ))}
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-on-surface-variant uppercase">Material</label>
            <select required name="material" value={formData.material} onChange={handleChange} className="w-full bg-surface-container border border-outline-variant/40 rounded p-2 text-sm focus:border-primary outline-none">
              <option value="Resina">Resina</option>
              <option value="Resina + Pla">Resina + Pla</option>
              <option value="Pla">Pla</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-on-surface-variant uppercase flex gap-1">
              Descripción 
              <span className="text-[10px] text-outline normal-case">(Opcional)</span>
            </label>
            <textarea name="description" value={formData.description} onChange={handleChange} rows={2} className="w-full bg-surface-container border border-outline-variant/40 rounded p-2 text-sm focus:border-primary outline-none" />
          </div>
          <div className="space-y-1 md:col-span-2 pt-4 border-t border-outline-variant/20">
            <label className="text-xs font-bold text-on-surface-variant uppercase">Mensaje WhatsApp Pre-Cargado (Opcional)</label>
            <textarea name="whatsappMessage" value={formData.whatsappMessage} onChange={handleChange} rows={3} className="w-full bg-surface-container border border-outline-variant/40 rounded p-2 text-sm focus:border-primary outline-none" />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-outline-variant/20">
          <button type="button" onClick={onBack} className="px-4 py-2 border border-outline-variant/50 rounded-lg text-sm font-semibold hover:bg-surface-container transition-colors">
            Cancelar
          </button>
          <button type="submit" disabled={loading} className="px-6 py-2 gold-shimmer text-on-primary-fixed font-bold rounded-lg hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 flex items-center gap-2">
            {loading ? <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span> : null}
            Guardar Figura
          </button>
        </div>
      </form>
    </div>
  );
}

function ConfigForm({ config }: { config: SiteConfig }) {
  const [formData, setFormData] = useState<SiteConfig>(config);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    setFormData(config);
  }, [config]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setSuccess(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);
    try {
      await setDoc(doc(db, 'config', 'site'), formData);
      setSuccess(true);
    } catch (error) {
      console.error(error);
      alert('Error al guardar configuración');
    }
    setLoading(false);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-serif font-bold">Configuración del Sitio</h2>
      </div>
      
      <form onSubmit={handleSubmit} className="bg-surface-container-low border border-outline-variant/30 rounded-xl p-6 space-y-6">
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-primary">Redes Sociales y Contacto</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-bold text-on-surface">WhatsApp (Número)</label>
              <input type="text" name="whatsapp" value={formData.whatsapp} onChange={handleChange} placeholder="Ej: 5491112345678" className="w-full p-3 bg-surface-container border border-outline-variant/30 rounded-lg text-sm" />
              <p className="text-xs text-outline">Incluye el código de país sin el +</p>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-bold text-on-surface">Instagram URL</label>
              <input type="url" name="instagram" value={formData.instagram} onChange={handleChange} placeholder="https://instagram.com/tu-usuario" className="w-full p-3 bg-surface-container border border-outline-variant/30 rounded-lg text-sm" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-bold text-on-surface">Facebook URL</label>
              <input type="url" name="facebook" value={formData.facebook} onChange={handleChange} placeholder="https://facebook.com/tu-pagina" className="w-full p-3 bg-surface-container border border-outline-variant/30 rounded-lg text-sm" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-bold text-on-surface">YouTube URL</label>
              <input type="url" name="youtube" value={formData.youtube} onChange={handleChange} placeholder="https://youtube.com/c/tu-canal" className="w-full p-3 bg-surface-container border border-outline-variant/30 rounded-lg text-sm" />
            </div>
          </div>
        </div>

        <div className="w-full h-px bg-outline-variant/30 my-6"></div>

        <div className="space-y-4">
          <h3 className="text-lg font-bold text-primary">Mensaje de WhatsApp (Catálogo)</h3>
          <div className="space-y-1">
            <label className="text-sm font-bold text-on-surface">Plantilla de Mensaje</label>
            <textarea 
              name="whatsappMessageTemplate" 
              value={formData.whatsappMessageTemplate} 
              onChange={handleChange} 
              rows={4}
              className="w-full p-3 bg-surface-container border border-outline-variant/30 rounded-lg text-sm"
              placeholder="Hola, me interesa la figura {figura}."
            />
            <p className="text-xs text-outline mt-1">
              Etiquetas disponibles: <strong className="text-primary">{'{figura}'}</strong> (nombre del producto) y <strong className="text-primary">{'{codigo}'}</strong> (identificador numérico).
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-6 border-t border-outline-variant/20">
          {success && <span className="text-green-500 font-bold self-center mr-4">¡Guardado!</span>}
          <button type="submit" disabled={loading} className="px-6 py-2 bg-primary text-on-primary font-bold rounded-lg hover:brightness-110 active:scale-95 transition-all disabled:opacity-50">
            {loading ? 'Guardando...' : 'Guardar Configuración'}
          </button>
        </div>
      </form>
    </div>
  );
}
