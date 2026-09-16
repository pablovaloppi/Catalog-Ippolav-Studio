import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Header } from './components/Header';
import { NavigationDrawer } from './components/NavigationDrawer';
import { Hero } from './components/Hero';
import { FilterSection } from './components/FilterSection';
import { Catalog } from './components/Catalog';
import { Franchises } from './components/Franchises';
import { HowToBuy } from './components/HowToBuy';
import { Contact } from './components/Contact';
import { Footer } from './components/Footer';
import { ProductModal } from './components/ProductModal';
import { ScrollToCatalogButton } from './components/ScrollToCatalogButton';
import { Product, Category, Designer, SiteConfig, SortOption } from './types';
import { getAllDescendantCategoryIds, getCategoryAncestors, getCategoryBreadcrumb } from './categoryUtils';
import { products as initialProducts } from './data';
import {
  collection,
  doc,
  onSnapshot,
  query,
  orderBy,
  limit,
  startAfter,
  getDocs,
  where,
  getCountFromServer,
  updateDoc,
  increment,
  QueryDocumentSnapshot,
  DocumentData,
} from 'firebase/firestore';
import { db } from './firebase';

const INITIAL_STEP = 6;
const BATCH_SIZE = 3;

function getFigureTimestamp(p: Product): number {
  if (p.createdAt) {
    if (typeof p.createdAt.toMillis === 'function') {
      return p.createdAt.toMillis();
    }
    if (typeof p.createdAt.toDate === 'function') {
      return p.createdAt.toDate().getTime();
    }
    if (typeof p.createdAt.seconds === 'number') {
      return p.createdAt.seconds * 1000;
    }
    if (typeof p.createdAt === 'number') {
      return p.createdAt;
    }
    if (typeof p.createdAt === 'string') {
      const parsed = Date.parse(p.createdAt);
      if (!isNaN(parsed)) return parsed;
    }
  }
  if (typeof p.order === 'number') {
    return p.order * 1000;
  }
  return 0;
}

function buildFiguresQuery(
  franchiseFilter: string,
  statusFilter: string,
  categories: Category[],
  afterDoc?: QueryDocumentSnapshot<DocumentData> | null,
  limitCount: number = BATCH_SIZE,
  sortBy: SortOption = 'default'
) {
  const figuresRef = collection(db, 'figures');

  if (franchiseFilter !== 'all') {
    const descendantIds = getAllDescendantCategoryIds(franchiseFilter, categories);
    const catIds = [franchiseFilter, ...descendantIds];

    if (catIds.length === 1) {
      if (afterDoc) {
        return query(figuresRef, where('franchiseId', '==', catIds[0]), startAfter(afterDoc), limit(limitCount));
      }
      return query(figuresRef, where('franchiseId', '==', catIds[0]), limit(limitCount));
    } else {
      const sliceIds = catIds.slice(0, 30);
      if (afterDoc) {
        return query(figuresRef, where('franchiseId', 'in', sliceIds), startAfter(afterDoc), limit(limitCount));
      }
      return query(figuresRef, where('franchiseId', 'in', sliceIds), limit(limitCount));
    }
  }

  if (statusFilter !== 'all') {
    if (afterDoc) {
      return query(figuresRef, where('status', '==', statusFilter), startAfter(afterDoc), limit(limitCount));
    }
    return query(figuresRef, where('status', '==', statusFilter), limit(limitCount));
  }

  // Ordenación directa en Firestore para el catálogo general
  let firestoreOrderField = 'order';
  let firestoreOrderDirection: 'asc' | 'desc' = 'asc';

  if (sortBy === 'recent') {
    firestoreOrderField = 'order';
    firestoreOrderDirection = 'desc';
  } else if (sortBy === 'oldest' || sortBy === 'default' || sortBy === 'likes-desc') {
    firestoreOrderField = 'order';
    firestoreOrderDirection = 'asc';
  } else if (sortBy === 'name-asc') {
    firestoreOrderField = 'title';
    firestoreOrderDirection = 'asc';
  } else if (sortBy === 'name-desc') {
    firestoreOrderField = 'title';
    firestoreOrderDirection = 'desc';
  } else if (sortBy === 'finish') {
    firestoreOrderField = 'finish';
    firestoreOrderDirection = 'asc';
  }

  if (afterDoc) {
    return query(
      figuresRef,
      orderBy(firestoreOrderField, firestoreOrderDirection),
      startAfter(afterDoc),
      limit(limitCount)
    );
  }
  return query(
    figuresRef,
    orderBy(firestoreOrderField, firestoreOrderDirection),
    limit(limitCount)
  );
}

export function Storefront() {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [isSearchingStore, setIsSearchingStore] = useState(false);
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const allStoreFiguresCacheRef = useRef<Product[] | null>(null);

  // Prefetch de todas las figuras para búsquedas e indexación instantáneas en el catálogo de la tienda
  useEffect(() => {
    let isMounted = true;
    async function prefetchStoreFigures() {
      try {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        if (!isMounted) return;
        const snap = await getDocs(collection(db, 'figures'));
        const list: Product[] = [];
        snap.forEach((d) => list.push({ id: d.id, ...d.data() } as Product));
        if (isMounted && list.length > 0) {
          allStoreFiguresCacheRef.current = list;
        }
      } catch (err) {
        console.warn("Error pre-cargando figuras de la tienda:", err);
      }
    }
    prefetchStoreFigures();
    return () => { isMounted = false; };
  }, []);
  const [statusFilter, setStatusFilter] = useState('all');
  const [franchiseFilter, setFranchiseFilter] = useState('all');
  const [finishFilter, setFinishFilter] = useState('all');
  const [scaleFilter, setScaleFilter] = useState('all');
  const [sortBy, setSortBy] = useState<SortOption>('default');
  
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  
  const [products, setProducts] = useState<Product[]>([]);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [totalFiguresInDb, setTotalFiguresInDb] = useState<number | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [designers, setDesigners] = useState<Designer[]>([]);
  const [siteConfig, setSiteConfig] = useState<SiteConfig | null>(null);
  const [loading, setLoading] = useState(true);

  // Registro local de figuras que a este usuario le gustan
  const [likedFigureIds, setLikedFigureIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('ippolav_liked_figures');
      return saved ? new Set<string>(JSON.parse(saved)) : new Set<string>();
    } catch {
      return new Set<string>();
    }
  });

  // Manejador para dar/quitar me gusta con actualización optimista y persistencia en Firestore
  const handleToggleLike = useCallback(async (figureId: string) => {
    const wasLiked = likedFigureIds.has(figureId);
    const delta = wasLiked ? -1 : 1;

    // 1. Actualizar set local y localStorage
    const nextSet = new Set(likedFigureIds);
    if (wasLiked) {
      nextSet.delete(figureId);
    } else {
      nextSet.add(figureId);
    }
    setLikedFigureIds(nextSet);
    try {
      localStorage.setItem('ippolav_liked_figures', JSON.stringify(Array.from(nextSet)));
    } catch (e) {
      console.warn("No se pudo guardar me gusta en localStorage:", e);
    }

    // 2. Actualización optimista en el estado de productos y búsqueda
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id === figureId) {
          const currentLikes = p.likesCount || 0;
          return { ...p, likesCount: Math.max(0, currentLikes + delta) };
        }
        return p;
      })
    );
    setSearchResults((prev) =>
      prev.map((p) => {
        if (p.id === figureId) {
          const currentLikes = p.likesCount || 0;
          return { ...p, likesCount: Math.max(0, currentLikes + delta) };
        }
        return p;
      })
    );
    if (allStoreFiguresCacheRef.current) {
      allStoreFiguresCacheRef.current = allStoreFiguresCacheRef.current.map((p) => {
        if (p.id === figureId) {
          const currentLikes = p.likesCount || 0;
          return { ...p, likesCount: Math.max(0, currentLikes + delta) };
        }
        return p;
      });
    }

    // 3. Actualización optimista en el modal si está abierto
    setSelectedProduct((prev) => {
      if (prev && prev.id === figureId) {
        const currentLikes = prev.likesCount || 0;
        return { ...prev, likesCount: Math.max(0, currentLikes + delta) };
      }
      return prev;
    });

    // 4. Persistir en Firestore de manera segura y concurrente con increment
    try {
      const figRef = doc(db, 'figures', figureId);
      await updateDoc(figRef, {
        likesCount: increment(delta),
      });
    } catch (err) {
      console.error("Error al guardar me gusta en Firestore:", err);
      // Revertir en caso de error
      setLikedFigureIds((prev) => {
        const revert = new Set(prev);
        if (wasLiked) revert.add(figureId);
        else revert.delete(figureId);
        try {
          localStorage.setItem('ippolav_liked_figures', JSON.stringify(Array.from(revert)));
        } catch { /* noop */ }
        return revert;
      });
      setProducts((prev) =>
        prev.map((p) => {
          if (p.id === figureId) {
            const currentLikes = p.likesCount || 0;
            return { ...p, likesCount: Math.max(0, currentLikes - delta) };
          }
          return p;
        })
      );
      setSelectedProduct((prev) => {
        if (prev && prev.id === figureId) {
          const currentLikes = prev.likesCount || 0;
          return { ...prev, likesCount: Math.max(0, currentLikes - delta) };
        }
        return prev;
      });
    }
  }, [likedFigureIds]);

  // Obtener el total de figuras añadidas en la base de datos de Firestore
  useEffect(() => {
    let isMounted = true;
    async function fetchTotalFiguresCount() {
      try {
        const countSnap = await getCountFromServer(collection(db, 'figures'));
        if (isMounted) {
          setTotalFiguresInDb(countSnap.data().count);
        }
      } catch (err) {
        console.warn("No se pudo obtener el conteo de figuras de Firestore:", err);
      }
    }
    fetchTotalFiguresCount();
    return () => {
      isMounted = false;
    };
  }, []);

  // Carga inicial y recarga al cambiar filtros o criterio de ordenación
  useEffect(() => {
    let isCancelled = false;

    // Llevar el scroll al inicio del catálogo suavemente
    const catalogEl = document.getElementById('catalogo') || document.getElementById('filter-section');
    if (catalogEl && window.scrollY > 250) {
      const headerOffset = 65;
      const elementPosition = catalogEl.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
      window.scrollTo({
        top: Math.max(0, offsetPosition),
        behavior: 'smooth',
      });
    }

    async function loadInitialBatch() {
      // Borrar todas las figuras cargadas previamente para empezar de cero
      setProducts([]);
      setLastDoc(null);
      setLoading(true);

      try {
        const initialLimit = sortBy === 'likes-desc' ? 12 : INITIAL_STEP;
        const q = buildFiguresQuery(franchiseFilter, statusFilter, categories, null, initialLimit, sortBy);
        const snapshot = await getDocs(q);
        if (isCancelled) return;

        const data: Product[] = [];
        snapshot.forEach((docSnap) => {
          data.push({ id: docSnap.id, ...docSnap.data() } as Product);
        });

        if (data.length > 0) {
          setProducts(data);
          const lastVisible = snapshot.docs[snapshot.docs.length - 1] || null;
          setLastDoc(lastVisible);
          setHasMore(snapshot.docs.length === initialLimit);
        } else if (franchiseFilter === 'all' && statusFilter === 'all') {
          // Si la base de datos de Firestore está vacía, usar las figuras locales de prueba ordenadas
          const localSorted = [...initialProducts].sort((a, b) => {
            if (sortBy === 'likes-desc') return (b.likesCount ?? 0) - (a.likesCount ?? 0);
            if (sortBy === 'recent') return (b.order ?? 0) - (a.order ?? 0);
            if (sortBy === 'oldest') return (a.order ?? 0) - (b.order ?? 0);
            if (sortBy === 'name-asc') return a.title.localeCompare(b.title);
            if (sortBy === 'name-desc') return b.title.localeCompare(a.title);
            return (a.order ?? 0) - (b.order ?? 0);
          });
          setProducts(localSorted.slice(0, initialLimit));
          setLastDoc(null);
          setHasMore(localSorted.length > initialLimit);
        } else {
          setProducts([]);
          setLastDoc(null);
          setHasMore(false);
        }
      } catch (error) {
        console.error("Error cargando lote inicial de figuras: ", error);
        if (!isCancelled && franchiseFilter === 'all' && statusFilter === 'all') {
          setProducts(initialProducts.slice(0, INITIAL_STEP));
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    }

    loadInitialBatch();

    return () => {
      isCancelled = true;
    };
  }, [franchiseFilter, statusFilter, sortBy]);

  // Carga de categorías, diseñadores y configuración en tiempo real
  useEffect(() => {
    let isMounted = true;

    const qCats = query(collection(db, 'categories'), orderBy('order', 'asc'));
    const unsubCats = onSnapshot(qCats, (snapshot) => {
      if (!isMounted) return;
      const data: Category[] = [];
      snapshot.forEach((docSnap) => {
        data.push({ id: docSnap.id, ...docSnap.data() } as Category);
      });
      setCategories(data);
    });

    const qDesigners = query(collection(db, 'designers'), orderBy('order', 'asc'));
    const unsubDesigners = onSnapshot(qDesigners, (snapshot) => {
      if (!isMounted) return;
      const data: Designer[] = [];
      snapshot.forEach((docSnap) => {
        data.push({ id: docSnap.id, ...docSnap.data() } as Designer);
      });
      setDesigners(data);
    });

    const unsubConfig = onSnapshot(doc(db, 'config', 'site'), (docSnapshot) => {
      if (!isMounted) return;
      if (docSnapshot.exists()) {
        setSiteConfig(docSnapshot.data() as SiteConfig);
      }
    });

    return () => {
      isMounted = false;
      unsubCats();
      unsubDesigners();
      unsubConfig();
    };
  }, []);

  // Carga de siguientes lotes continuos de 3 en 3 anticipados por el scroll
  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || !lastDoc) return;
    setLoadingMore(true);

    try {
      const qNext = buildFiguresQuery(franchiseFilter, statusFilter, categories, lastDoc, BATCH_SIZE, sortBy);
      const snapshot = await getDocs(qNext);
      const data: Product[] = [];
      snapshot.forEach((docSnap) => {
        data.push({ id: docSnap.id, ...docSnap.data() } as Product);
      });

      setProducts((prev) => {
        const existingIds = new Set(prev.map((p) => p.id));
        const newItems = data.filter((p) => !existingIds.has(p.id));
        return [...prev, ...newItems];
      });

      const nextLastDoc = snapshot.docs[snapshot.docs.length - 1] || null;
      setLastDoc(nextLastDoc);
      setHasMore(snapshot.docs.length === BATCH_SIZE);
    } catch (error) {
      console.error("Error cargando siguiente lote de figuras: ", error);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore, lastDoc, franchiseFilter, statusFilter, categories, sortBy]);

  const availableFinishes = useMemo(() => {
    const finishes = new Set(products.map(p => p.finish).filter(Boolean));
    ['Hiperrealista', 'Realista', 'Custom Paint', 'Coleccionista'].forEach(f => finishes.add(f));
    return Array.from(finishes);
  }, [products]);

  const availableScales = useMemo(() => {
    const scales = new Set<string>();
    ['1:8', '1:6', '1:4', '1:2', '1:1', 'Chibi'].forEach(s => scales.add(s));
    products.forEach(p => {
      if (Array.isArray(p.scale)) {
        p.scale.forEach(s => scales.add(s));
      }
    });
    return Array.from(scales);
  }, [products]);

  const allowedFranchiseIds = useMemo(() => {
    if (franchiseFilter === 'all') return null;
    return new Set([franchiseFilter, ...getAllDescendantCategoryIds(franchiseFilter, categories)]);
  }, [franchiseFilter, categories]);

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const getCategoryNames = (categoryId: string) => {
        const cat = categories.find(c => c.id === categoryId);
        if (!cat) return '';
        const ancestors = getCategoryAncestors(categoryId, categories);
        return [cat.name, ...ancestors.map(a => a.name)].join(' ').toLowerCase();
      };

      const matchesSearch =
        searchQuery.trim() === '' ||
        product.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (product.numericId && product.numericId.toLowerCase().includes(searchQuery.toLowerCase())) ||
        getCategoryNames(product.franchiseId).includes(searchQuery.toLowerCase());
        
      const matchesStatus = statusFilter === 'all' || product.status === statusFilter;
      
      const matchesFranchise = !allowedFranchiseIds || allowedFranchiseIds.has(product.franchiseId);

      const matchesFinish = finishFilter === 'all' || product.finish === finishFilter;
      const matchesScale = scaleFilter === 'all' || (Array.isArray(product.scale) && product.scale.includes(scaleFilter));

      return matchesSearch && matchesStatus && matchesFranchise && matchesFinish && matchesScale;
    });
  }, [searchQuery, statusFilter, allowedFranchiseIds, finishFilter, scaleFilter, products, categories]);

  const sortedAndFilteredProducts = useMemo(() => {
    const list = [...filteredProducts];
    if (sortBy === 'default') {
      return list;
    }

    return list.sort((a, b) => {
      if (sortBy === 'likes-desc') {
        const likesA = a.likesCount ?? 0;
        const likesB = b.likesCount ?? 0;
        if (likesB !== likesA) return likesB - likesA;
        return (a.order ?? 0) - (b.order ?? 0);
      }
      if (sortBy === 'recent') {
        const timeA = getFigureTimestamp(a);
        const timeB = getFigureTimestamp(b);
        if (timeB !== timeA) return timeB - timeA;
        return (b.order ?? 0) - (a.order ?? 0);
      }
      if (sortBy === 'oldest') {
        const timeA = getFigureTimestamp(a);
        const timeB = getFigureTimestamp(b);
        if (timeA !== timeB) return timeA - timeB;
        return (a.order ?? 0) - (b.order ?? 0);
      }
      if (sortBy === 'name-asc') {
        return a.title.localeCompare(b.title, 'es', { sensitivity: 'base' });
      }
      if (sortBy === 'name-desc') {
        return b.title.localeCompare(a.title, 'es', { sensitivity: 'base' });
      }
      if (sortBy === 'finish') {
        const finishA = (a.finish || '').trim();
        const finishB = (b.finish || '').trim();
        const cmp = finishA.localeCompare(finishB, 'es', { sensitivity: 'base' });
        if (cmp !== 0) return cmp;
        return a.title.localeCompare(b.title, 'es', { sensitivity: 'base' });
      }
      return 0;
    });
  }, [filteredProducts, sortBy]);

  // Búsqueda con debounce para evitar titileos en el catálogo
  useEffect(() => {
    if (!searchQuery.trim()) {
      setDebouncedSearchQuery('');
      setIsSearchingStore(false);
      return;
    }
    setIsSearchingStore(true);
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Ejecución de la búsqueda cuando debouncedSearchQuery tiene un valor
  useEffect(() => {
    let isCancelled = false;
    const trimmed = debouncedSearchQuery.trim().toLowerCase();

    if (!trimmed) {
      setSearchResults([]);
      setIsSearchingStore(false);
      return;
    }

    async function runSearch() {
      setIsSearchingStore(true);
      try {
        let allFigures = allStoreFiguresCacheRef.current;
        if (!allFigures) {
          const snap = await getDocs(collection(db, 'figures'));
          const list: Product[] = [];
          snap.forEach((d) => list.push({ id: d.id, ...d.data() } as Product));
          if (list.length > 0) {
            allStoreFiguresCacheRef.current = list;
            allFigures = list;
          } else {
            allFigures = initialProducts;
          }
        }

        if (isCancelled) return;

        // Precalcular nombres de categorías y ancestros en un mapa O(1) de alto rendimiento
        const categorySearchMap = new Map<string, string>();
        categories.forEach((cat) => {
          const ancestors = getCategoryAncestors(cat.id, categories);
          const nameStr = [cat.name, ...ancestors.map((a) => a.name)].join(' ').toLowerCase();
          categorySearchMap.set(cat.id, nameStr);
        });

        const matched = (allFigures || []).filter((product) => {
          const catNames = categorySearchMap.get(product.franchiseId) || '';
          const matchesSearch =
            product.title.toLowerCase().includes(trimmed) ||
            (product.numericId && product.numericId.toLowerCase().includes(trimmed)) ||
            catNames.includes(trimmed);

          const matchesStatus = statusFilter === 'all' || product.status === statusFilter;
          const matchesFranchise = !allowedFranchiseIds || allowedFranchiseIds.has(product.franchiseId);
          const matchesFinish = finishFilter === 'all' || product.finish === finishFilter;
          const matchesScale = scaleFilter === 'all' || (Array.isArray(product.scale) && product.scale.includes(scaleFilter));

          return matchesSearch && matchesStatus && matchesFranchise && matchesFinish && matchesScale;
        });

        matched.sort((a, b) => {
          if (sortBy === 'likes-desc') {
            const likesA = a.likesCount ?? 0;
            const likesB = b.likesCount ?? 0;
            if (likesB !== likesA) return likesB - likesA;
            return (a.order ?? 0) - (b.order ?? 0);
          }
          if (sortBy === 'recent') {
            const timeA = getFigureTimestamp(a);
            const timeB = getFigureTimestamp(b);
            if (timeB !== timeA) return timeB - timeA;
            return (b.order ?? 0) - (a.order ?? 0);
          }
          if (sortBy === 'oldest') {
            const timeA = getFigureTimestamp(a);
            const timeB = getFigureTimestamp(b);
            if (timeA !== timeB) return timeA - timeB;
            return (a.order ?? 0) - (b.order ?? 0);
          }
          if (sortBy === 'name-asc') return a.title.localeCompare(b.title, 'es', { sensitivity: 'base' });
          if (sortBy === 'name-desc') return b.title.localeCompare(a.title, 'es', { sensitivity: 'base' });
          if (sortBy === 'finish') {
            const finishA = (a.finish || '').trim();
            const finishB = (b.finish || '').trim();
            const cmp = finishA.localeCompare(finishB, 'es', { sensitivity: 'base' });
            if (cmp !== 0) return cmp;
            return a.title.localeCompare(b.title, 'es', { sensitivity: 'base' });
          }
          return (a.order ?? 0) - (b.order ?? 0);
        });

        if (!isCancelled) {
          setSearchResults(matched);
        }
      } catch (err) {
        console.error("Error buscando figuras en el catálogo:", err);
      } finally {
        if (!isCancelled) {
          setIsSearchingStore(false);
        }
      }
    }

    runSearch();

    return () => {
      isCancelled = true;
    };
  }, [debouncedSearchQuery, statusFilter, allowedFranchiseIds, finishFilter, scaleFilter, sortBy, categories]);

  const isSearchActive = searchQuery.trim() !== '';
  const isSearchBusy = isSearchActive && (isSearchingStore || searchQuery !== debouncedSearchQuery);
  const showStoreLoader = loading || isSearchBusy;

  return (
    <>
      <Header onOpenDrawer={() => setIsDrawerOpen(true)} />
      <NavigationDrawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} />
      
      <main className="pt-16 max-w-7xl mx-auto overflow-hidden">
        <Hero />
        <FilterSection
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          franchiseFilter={franchiseFilter}
          setFranchiseFilter={setFranchiseFilter}
          finishFilter={finishFilter}
          setFinishFilter={setFinishFilter}
          scaleFilter={scaleFilter}
          setScaleFilter={setScaleFilter}
          sortBy={sortBy}
          setSortBy={setSortBy}
          categories={categories}
          availableFinishes={availableFinishes}
          availableScales={availableScales}
        />
        {showStoreLoader ? (
          <div className="flex flex-col justify-center items-center py-24 text-primary">
            <img src="/logo-ippolav.png" alt="Loading..." className="w-16 h-16 animate-scale-pulse object-contain" />
            <span className="mt-4 text-xs font-semibold text-on-surface-variant tracking-wider uppercase">
              {isSearchActive ? 'Buscando figuras...' : 'Cargando figuras...'}
            </span>
          </div>
        ) : (
          <Catalog
            products={isSearchActive ? searchResults : sortedAndFilteredProducts}
            categories={categories}
            onSelectProduct={setSelectedProduct}
            hasMore={isSearchActive ? false : hasMore}
            loadingMore={loadingMore}
            onLoadMore={loadMore}
            totalFiguresInDb={totalFiguresInDb}
            likedFigureIds={likedFigureIds}
            onToggleLike={handleToggleLike}
          />
        )}
        <Franchises onSelectFranchise={setFranchiseFilter} categories={categories} />
        <HowToBuy />
        <Contact config={siteConfig} />
      </main>
      <Footer config={siteConfig} />
      
      <ProductModal 
        product={selectedProduct} 
        categoryName={selectedProduct ? getCategoryBreadcrumb(selectedProduct.franchiseId, categories) : undefined}
        designerName={selectedProduct && selectedProduct.designerId ? designers.find(d => d.id === selectedProduct.designerId)?.name : undefined}
        onClose={() => setSelectedProduct(null)} 
        config={siteConfig}
        isLiked={selectedProduct ? likedFigureIds.has(selectedProduct.id) : false}
        onToggleLike={handleToggleLike}
      />

      <ScrollToCatalogButton />
    </>
  );
}
