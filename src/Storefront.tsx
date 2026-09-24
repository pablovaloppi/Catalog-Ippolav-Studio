import { useState, useMemo, useEffect, useCallback, useRef, lazy, Suspense } from 'react';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { FilterSection } from './components/FilterSection';
import { Catalog } from './components/Catalog';
import { Franchises } from './components/Franchises';
import { Product, Category, Designer, SiteConfig, SortOption } from './types';
import { getAllDescendantCategoryIds, getCategoryAncestors, getCategoryBreadcrumb } from './categoryUtils';
import { products as initialProducts } from './data';
import type { QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';
import { extractSearchQueryFromLocation, extractFigureIdFromLocation } from './urlUtils';

const NavigationDrawer = lazy(() => import('./components/NavigationDrawer').then(m => ({ default: m.NavigationDrawer })));
const HowToBuy = lazy(() => import('./components/HowToBuy').then(m => ({ default: m.HowToBuy })));
const Contact = lazy(() => import('./components/Contact').then(m => ({ default: m.Contact })));
const Footer = lazy(() => import('./components/Footer').then(m => ({ default: m.Footer })));
const ScrollToCatalogButton = lazy(() => import('./components/ScrollToCatalogButton').then(m => ({ default: m.ScrollToCatalogButton })));
const ProductModal = lazy(() => import('./components/ProductModal').then(m => ({ default: m.ProductModal })));

const INITIAL_STEP = 10;
const BATCH_SIZE = 10;

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

export function Storefront() {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  
  // Extraer término inicial si el enlace es por ej: /b=spiderman, /buscar=spiderman o ?b=spiderman
  const initialUrlQuery = useMemo(() => extractSearchQueryFromLocation(), []);
  const [searchQuery, setSearchQuery] = useState(initialUrlQuery);
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(initialUrlQuery);
  const [isSearchingStore, setIsSearchingStore] = useState(false);
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const allStoreFiguresCacheRef = useRef<Product[] | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [franchiseFilter, setFranchiseFilter] = useState('all');
  const [finishFilter, setFinishFilter] = useState('all');
  const [scaleFilter, setScaleFilter] = useState('all');
  const [sortBy, setSortBy] = useState<SortOption>('default');
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  
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
  const [favoriteFiguresList, setFavoriteFiguresList] = useState<Product[]>([]);
  const [isLoadingFavorites, setIsLoadingFavorites] = useState(false);

  // Registro local de figuras que a este usuario le gustan
  const [likedFigureIds, setLikedFigureIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('ippolav_liked_figures');
      return saved ? new Set<string>(JSON.parse(saved)) : new Set<string>();
    } catch {
      return new Set<string>();
    }
  });

  // Cargar figuras favoritas desde Firestore si no están en memoria local al iniciar o al cambiar favoritos
  useEffect(() => {
    if (likedFigureIds.size === 0) {
      setFavoriteFiguresList([]);
      return;
    }

    let isCancelled = false;

    async function syncFavoriteFigures() {
      const neededIds: string[] = Array.from(likedFigureIds);
      
      // Identificar cuáles ya tenemos en memoria
      const knownMap = new Map<string, Product>();
      initialProducts.forEach(p => { if (likedFigureIds.has(p.id)) knownMap.set(p.id, p); });
      products.forEach(p => { if (likedFigureIds.has(p.id)) knownMap.set(p.id, p); });
      favoriteFiguresList.forEach(p => { if (likedFigureIds.has(p.id)) knownMap.set(p.id, p); });

      const missingIds: string[] = neededIds.filter((id: string) => !knownMap.has(id));

      if (missingIds.length === 0) {
        setFavoriteFiguresList(Array.from(knownMap.values()));
        return;
      }

      setIsLoadingFavorites(true);
      try {
        const { fetchFiguresByIds } = await import('./services/firestoreService');
        const fetchedMissing = await fetchFiguresByIds(missingIds);
        if (isCancelled) return;

        fetchedMissing.forEach(p => knownMap.set(p.id, p));
        setFavoriteFiguresList(Array.from(knownMap.values()));
      } catch (err) {
        console.warn("Error cargando figuras favoritas:", err);
      } finally {
        if (!isCancelled) {
          setIsLoadingFavorites(false);
        }
      }
    }

    syncFavoriteFigures();

    return () => {
      isCancelled = true;
    };
  }, [likedFigureIds, products]);

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

    // 2. Actualizar lista de favoritos en memoria
    if (wasLiked) {
      setFavoriteFiguresList((prev) => prev.filter((p) => p.id !== figureId));
    } else {
      // Buscar figura en los productos cargados
      const targetFig = products.find((p) => p.id === figureId) ||
        searchResults.find((p) => p.id === figureId) ||
        initialProducts.find((p) => p.id === figureId) ||
        (selectedProduct?.id === figureId ? selectedProduct : null);
      if (targetFig) {
        setFavoriteFiguresList((prev) => {
          if (prev.some((p) => p.id === figureId)) return prev;
          return [...prev, { ...targetFig, likesCount: Math.max(0, (targetFig.likesCount || 0) + delta) }];
        });
      }
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
      const { toggleFigureLikeInDb } = await import('./services/firestoreService');
      await toggleFigureLikeInDb(figureId, delta);
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
        const { fetchTotalFiguresCount: getTotalCount } = await import('./services/firestoreService');
        const count = await getTotalCount();
        if (isMounted && count !== null) {
          setTotalFiguresInDb(count);
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
        const { fetchFiguresBatch } = await import('./services/firestoreService');
        const { products: data, lastDoc: lastVisible, hasMore: moreAvailable } =
          await fetchFiguresBatch(franchiseFilter, statusFilter, categories, null, initialLimit, sortBy);
        if (isCancelled) return;

        if (data.length > 0) {
          setProducts(data);
          setLastDoc(lastVisible);
          setHasMore(moreAvailable);
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
  }, [franchiseFilter, statusFilter, categories, sortBy]);

  // Carga optimizada de categorías, diseñadores y configuración en paralelo
  useEffect(() => {
    let isMounted = true;

    async function loadMetadata() {
      try {
        const { fetchCatalogMetadata } = await import('./services/firestoreService');
        const { categories: dataCats, designers: dataDes, siteConfig: configData } = await fetchCatalogMetadata();

        if (!isMounted) return;

        if (dataCats.length > 0) setCategories(dataCats);
        if (dataDes.length > 0) setDesigners(dataDes);
        if (configData) setSiteConfig(configData);
      } catch (error) {
        console.warn("Error cargando metadatos del catálogo:", error);
      }
    }

    loadMetadata();

    return () => {
      isMounted = false;
    };
  }, []);

  // Carga y apertura automática de figura si se ingresa mediante un enlace directo compartido (?figura=id)
  useEffect(() => {
    const directFigureId = extractFigureIdFromLocation();
    if (!directFigureId) return;

    let isCancelled = false;

    async function loadDirectFigure() {
      // 1. Revisar si la figura ya se encuentra en las figuras iniciales
      const localFig = initialProducts.find((p) => p.id === directFigureId);
      if (localFig) {
        setSelectedProduct(localFig);
        return;
      }

      // 2. Si no, consultar directamente en Firestore
      try {
        const { fetchFigureById } = await import('./services/firestoreService');
        const figure = await fetchFigureById(directFigureId);
        if (!isCancelled && figure) {
          setSelectedProduct(figure);
        }
      } catch (err) {
        console.warn("No se pudo cargar la figura directa compartida:", err);
      }
    }

    loadDirectFigure();

    return () => {
      isCancelled = true;
    };
  }, []);

  // Carga de siguientes lotes continuos anticipados por el scroll
  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || !lastDoc) return;
    setLoadingMore(true);

    try {
      const { fetchFiguresBatch } = await import('./services/firestoreService');
      const { products: data, lastDoc: lastVisible, hasMore: moreAvailable } =
        await fetchFiguresBatch(franchiseFilter, statusFilter, categories, lastDoc, BATCH_SIZE, sortBy);

      setProducts((prev) => {
        const existingIds = new Set(prev.map((p) => p.id));
        const newItems = data.filter((p) => !existingIds.has(p.id));
        return [...prev, ...newItems];
      });

      setLastDoc(lastVisible);
      setHasMore(moreAvailable);
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

  const categorySearchMap = useMemo(() => {
    const map = new Map<string, string>();
    categories.forEach((cat) => {
      const ancestors = getCategoryAncestors(cat.id, categories);
      const nameStr = [cat.name, ...ancestors.map((a) => a.name)].join(' ').toLowerCase();
      map.set(cat.id, nameStr);
    });
    return map;
  }, [categories]);

  const filteredProducts = useMemo(() => {
    const searchQueryLower = searchQuery.toLowerCase();
    const hasSearchQuery = searchQuery.trim() !== '';
    return products.filter((product) => {
      const matchesSearch =
        !hasSearchQuery ||
        product.title.toLowerCase().includes(searchQueryLower) ||
        (product.numericId && product.numericId.toLowerCase().includes(searchQueryLower)) ||
        (categorySearchMap.get(product.franchiseId) || '').includes(searchQueryLower);
        
      const matchesStatus = statusFilter === 'all' || product.status === statusFilter;
      
      const matchesFranchise = !allowedFranchiseIds || allowedFranchiseIds.has(product.franchiseId);

      const matchesFinish = finishFilter === 'all' || product.finish === finishFilter;
      const matchesScale = scaleFilter === 'all' || (Array.isArray(product.scale) && product.scale.includes(scaleFilter));

      return matchesSearch && matchesStatus && matchesFranchise && matchesFinish && matchesScale;
    });
  }, [searchQuery, statusFilter, allowedFranchiseIds, finishFilter, scaleFilter, products, categorySearchMap]);

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

  // Sincronización de la URL en la barra de direcciones (/b=termino)
  useEffect(() => {
    const trimmed = debouncedSearchQuery.trim();
    if (trimmed) {
      const newPath = `/b=${encodeURIComponent(trimmed)}`;
      if (window.location.pathname !== newPath && !window.location.pathname.startsWith('/admin')) {
        window.history.replaceState(null, '', newPath);
      }
    } else {
      if (
        window.location.pathname.startsWith('/b=') ||
        window.location.pathname.startsWith('/buscar=') ||
        window.location.pathname.startsWith('/b/') ||
        window.location.pathname.startsWith('/buscar/')
      ) {
        window.history.replaceState(null, '', '/');
      }
    }
  }, [debouncedSearchQuery]);

  // Soporte para botones Atrás/Adelante del navegador
  useEffect(() => {
    const handlePopState = () => {
      const q = extractSearchQueryFromLocation();
      setSearchQuery(q);
      setDebouncedSearchQuery(q);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Si se ingresó directamente con un enlace tipo /b=spiderman, deslizar hacia el catálogo
  useEffect(() => {
    if (initialUrlQuery) {
      const timer = setTimeout(() => {
        const target = document.getElementById('filter-section') || document.getElementById('catalogo');
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [initialUrlQuery]);

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
          const { fetchAllFiguresForSearch } = await import('./services/firestoreService');
          const list = await fetchAllFiguresForSearch();
          if (list.length > 0) {
            allStoreFiguresCacheRef.current = list;
            allFigures = list;
          } else {
            allFigures = initialProducts;
          }
        }

        if (isCancelled) return;

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

  // Lista de productos favoritos del usuario
  const favoriteProducts = useMemo(() => {
    if (!favoritesOnly) return [];

    // Combinar todas las figuras conocidas que estén en favoritos
    const allKnownMap = new Map<string, Product>();
    initialProducts.forEach((p) => {
      if (likedFigureIds.has(p.id)) allKnownMap.set(p.id, p);
    });
    products.forEach((p) => {
      if (likedFigureIds.has(p.id)) allKnownMap.set(p.id, p);
    });
    favoriteFiguresList.forEach((p) => {
      if (likedFigureIds.has(p.id)) allKnownMap.set(p.id, p);
    });
    if (allStoreFiguresCacheRef.current) {
      allStoreFiguresCacheRef.current.forEach((p) => {
        if (likedFigureIds.has(p.id)) allKnownMap.set(p.id, p);
      });
    }

    const list = Array.from(allKnownMap.values());

    const searchQueryLower = searchQuery.toLowerCase().trim();
    const filtered = list.filter((product) => {
      const matchesSearch =
        !searchQueryLower ||
        product.title.toLowerCase().includes(searchQueryLower) ||
        (product.numericId && product.numericId.toLowerCase().includes(searchQueryLower)) ||
        (categorySearchMap.get(product.franchiseId) || '').includes(searchQueryLower);

      const matchesStatus = statusFilter === 'all' || product.status === statusFilter;
      const matchesFranchise = !allowedFranchiseIds || allowedFranchiseIds.has(product.franchiseId);
      const matchesFinish = finishFilter === 'all' || product.finish === finishFilter;
      const matchesScale = scaleFilter === 'all' || (Array.isArray(product.scale) && product.scale.includes(scaleFilter));

      return matchesSearch && matchesStatus && matchesFranchise && matchesFinish && matchesScale;
    });

    return filtered.sort((a, b) => {
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
      return (a.order ?? 0) - (b.order ?? 0);
    });
  }, [favoritesOnly, likedFigureIds, favoriteFiguresList, products, searchQuery, statusFilter, allowedFranchiseIds, finishFilter, scaleFilter, sortBy, categorySearchMap]);

  const handleToggleFavoritesOnly = useCallback(() => {
    setFavoritesOnly((prev) => {
      const next = !prev;
      if (next) {
        const catalogEl = document.getElementById('catalogo') || document.getElementById('filter-section');
        if (catalogEl) {
          catalogEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
      return next;
    });
  }, []);

  const handleOpenFavorites = useCallback(() => {
    setFavoritesOnly(true);
    setFranchiseFilter('all');
    setStatusFilter('all');
    setFinishFilter('all');
    setScaleFilter('all');
    setSearchQuery('');
    const catalogEl = document.getElementById('catalogo') || document.getElementById('filter-section');
    if (catalogEl) {
      catalogEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  const isSearchActive = searchQuery.trim() !== '';
  const isSearchBusy = isSearchActive && (isSearchingStore || searchQuery !== debouncedSearchQuery);
  const showStoreLoader = favoritesOnly ? isLoadingFavorites : (loading || isSearchBusy);

  const displayedCatalogProducts = favoritesOnly
    ? favoriteProducts
    : (isSearchActive ? searchResults : sortedAndFilteredProducts);

  return (
    <>
      <Header 
        onOpenDrawer={() => setIsDrawerOpen(true)} 
        favoritesCount={likedFigureIds.size}
        onOpenFavorites={handleOpenFavorites}
        isFavoritesActive={favoritesOnly}
      />
      {isDrawerOpen && (
        <Suspense fallback={null}>
          <NavigationDrawer 
            isOpen={isDrawerOpen} 
            onClose={() => setIsDrawerOpen(false)} 
            favoritesCount={likedFigureIds.size}
            onOpenFavorites={handleOpenFavorites}
            isFavoritesActive={favoritesOnly}
          />
        </Suspense>
      )}
      
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
          favoritesOnly={favoritesOnly}
          onToggleFavoritesOnly={handleToggleFavoritesOnly}
          favoritesCount={likedFigureIds.size}
        />
        {showStoreLoader ? (
          <div className="flex flex-col justify-center items-center py-24 text-primary">
            <img
              src="/logo-ippolav.webp"
              alt="Loading..."
              width="64"
              height="64"
              decoding="async"
              className="w-16 h-16 animate-scale-pulse object-contain"
            />
            <span className="mt-4 text-xs font-semibold text-on-surface-variant tracking-wider uppercase">
              {isSearchActive ? 'Buscando figuras...' : 'Cargando figuras...'}
            </span>
          </div>
        ) : (
          <Catalog
            products={displayedCatalogProducts}
            categories={categories}
            onSelectProduct={setSelectedProduct}
            hasMore={favoritesOnly || isSearchActive ? false : hasMore}
            loadingMore={loadingMore}
            onLoadMore={loadMore}
            totalFiguresInDb={favoritesOnly ? favoriteProducts.length : totalFiguresInDb}
            likedFigureIds={likedFigureIds}
            onToggleLike={handleToggleLike}
            favoritesOnly={favoritesOnly}
            onClearFavoritesFilter={() => setFavoritesOnly(false)}
          />
        )}
        <Franchises onSelectFranchise={setFranchiseFilter} categories={categories} />
        <Suspense fallback={null}>
          <HowToBuy />
          <Contact config={siteConfig} />
        </Suspense>
      </main>
      <Suspense fallback={null}>
        <Footer config={siteConfig} />
        <ScrollToCatalogButton />
      </Suspense>
      
      {selectedProduct && (
        <Suspense fallback={null}>
          <ProductModal 
            product={selectedProduct} 
            categoryName={getCategoryBreadcrumb(selectedProduct.franchiseId, categories)}
            designerName={selectedProduct.designerId ? designers.find(d => d.id === selectedProduct.designerId)?.name : undefined}
            onClose={() => setSelectedProduct(null)} 
            config={siteConfig}
            isLiked={likedFigureIds.has(selectedProduct.id)}
            onToggleLike={handleToggleLike}
          />
        </Suspense>
      )}
    </>
  );
}
