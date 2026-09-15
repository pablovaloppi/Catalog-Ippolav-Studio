import { useState, useMemo, useEffect, useCallback } from 'react';
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
import { Product, Category, Designer, SiteConfig } from './types';
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
  QueryDocumentSnapshot,
  DocumentData,
} from 'firebase/firestore';
import { db } from './firebase';

const INITIAL_STEP = 3;
const INITIAL_TARGET = 12;
const BATCH_SIZE = 12;

function buildFiguresQuery(
  franchiseFilter: string,
  statusFilter: string,
  categories: Category[],
  afterDoc?: QueryDocumentSnapshot<DocumentData> | null,
  limitCount: number = BATCH_SIZE
) {
  const figuresRef = collection(db, 'figures');

  if (franchiseFilter !== 'all') {
    const childCatIds = categories.filter((c) => c.parentId === franchiseFilter).map((c) => c.id);
    const catIds = [franchiseFilter, ...childCatIds];

    if (catIds.length === 1) {
      if (afterDoc) {
        return query(figuresRef, where('franchiseId', '==', catIds[0]), startAfter(afterDoc), limit(limitCount));
      }
      return query(figuresRef, where('franchiseId', '==', catIds[0]), limit(limitCount));
    } else {
      const sliceIds = catIds.slice(0, 10);
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

  // Consulta por defecto ordenada por orden
  if (afterDoc) {
    return query(figuresRef, orderBy('order', 'asc'), startAfter(afterDoc), limit(limitCount));
  }
  return query(figuresRef, orderBy('order', 'asc'), limit(limitCount));
}

export function Storefront() {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [franchiseFilter, setFranchiseFilter] = useState('all');
  const [finishFilter, setFinishFilter] = useState('all');
  const [scaleFilter, setScaleFilter] = useState('all');
  
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

  // Carga inicial ultra-rápida: sólo las primeras 3 figuras para renderizado inmediato
  useEffect(() => {
    let isCancelled = false;

    async function loadInitialBatch() {
      setLoading(true);
      try {
        const q = buildFiguresQuery(franchiseFilter, statusFilter, categories, null, INITIAL_STEP);
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
          setHasMore(snapshot.docs.length === INITIAL_STEP);
        } else if (franchiseFilter === 'all' && statusFilter === 'all') {
          // Si la base de datos de Firestore está vacía, usar las figuras locales de prueba
          setProducts(initialProducts.slice(0, INITIAL_STEP));
          setLastDoc(null);
          setHasMore(initialProducts.length > INITIAL_STEP);
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
  }, [franchiseFilter, statusFilter]);

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

  // Carga de siguientes lotes: de 3 en 3 hasta las primeras 12, luego en lotes de 12
  const loadMore = useCallback(async (customStep?: number) => {
    if (loadingMore || !hasMore || !lastDoc) return;
    setLoadingMore(true);

    const step = customStep ?? (products.length < INITIAL_TARGET ? INITIAL_STEP : BATCH_SIZE);

    try {
      const qNext = buildFiguresQuery(franchiseFilter, statusFilter, categories, lastDoc, step);
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
      setHasMore(snapshot.docs.length === step);
    } catch (error) {
      console.error("Error cargando siguiente lote de figuras: ", error);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore, lastDoc, franchiseFilter, statusFilter, categories, products.length]);

  // Cascada progresiva automática de las primeras 12 figuras: 3, luego 3, luego 3, luego 3
  useEffect(() => {
    if (!loading && !loadingMore && hasMore && products.length > 0 && products.length < INITIAL_TARGET) {
      const timer = setTimeout(() => {
        loadMore(INITIAL_STEP);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [loading, loadingMore, hasMore, products.length, loadMore]);

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

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const getCategoryNames = (categoryId: string) => {
        const cat = categories.find(c => c.id === categoryId);
        if (!cat) return '';
        let names = cat.name.toLowerCase();
        if (cat.parentId) {
          const parent = categories.find(c => c.id === cat.parentId);
          if (parent) {
            names += ' ' + parent.name.toLowerCase();
          }
        }
        return names;
      };

      const matchesSearch =
        searchQuery.trim() === '' ||
        product.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (product.numericId && product.numericId.toLowerCase().includes(searchQuery.toLowerCase())) ||
        getCategoryNames(product.franchiseId).includes(searchQuery.toLowerCase());
        
      const matchesStatus = statusFilter === 'all' || product.status === statusFilter;
      
      const productCategory = categories.find(c => c.id === product.franchiseId);
      const matchesFranchise = 
        franchiseFilter === 'all' || 
        product.franchiseId === franchiseFilter || 
        productCategory?.parentId === franchiseFilter;

      const matchesFinish = finishFilter === 'all' || product.finish === finishFilter;
      const matchesScale = scaleFilter === 'all' || (Array.isArray(product.scale) && product.scale.includes(scaleFilter));

      return matchesSearch && matchesStatus && matchesFranchise && matchesFinish && matchesScale;
    });
  }, [searchQuery, statusFilter, franchiseFilter, finishFilter, scaleFilter, products, categories]);

  // Si el usuario busca o filtra y hay pocas coincidencias cargadas, buscar en el siguiente lote
  useEffect(() => {
    const isSearchingOrFiltering =
      searchQuery.trim() !== '' ||
      finishFilter !== 'all' ||
      scaleFilter !== 'all';

    if (isSearchingOrFiltering && hasMore && !loadingMore && !loading && filteredProducts.length < 4) {
      const timeoutId = setTimeout(() => {
        loadMore();
      }, 400);
      return () => clearTimeout(timeoutId);
    }
  }, [
    searchQuery,
    finishFilter,
    scaleFilter,
    filteredProducts.length,
    hasMore,
    loadingMore,
    loading,
    loadMore,
  ]);

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
          categories={categories}
          availableFinishes={availableFinishes}
          availableScales={availableScales}
        />
        {loading ? (
          <div className="flex justify-center items-center py-24 text-primary">
            <img src="/logo-ippolav.png" alt="Loading..." className="w-16 h-16 animate-scale-pulse object-contain" />
          </div>
        ) : (
          <Catalog
            products={filteredProducts}
            categories={categories}
            onSelectProduct={setSelectedProduct}
            hasMore={hasMore}
            loadingMore={loadingMore}
            onLoadMore={loadMore}
            totalFiguresInDb={totalFiguresInDb}
          />
        )}
        <Franchises onSelectFranchise={setFranchiseFilter} categories={categories} />
        <HowToBuy />
        <Contact config={siteConfig} />
      </main>
      <Footer config={siteConfig} />
      
      <ProductModal 
        product={selectedProduct} 
        categoryName={selectedProduct ? categories.find(c => c.id === selectedProduct.franchiseId)?.name : undefined}
        designerName={selectedProduct && selectedProduct.designerId ? designers.find(d => d.id === selectedProduct.designerId)?.name : undefined}
        onClose={() => setSelectedProduct(null)} 
        config={siteConfig}
      />

      <ScrollToCatalogButton />
    </>
  );
}
