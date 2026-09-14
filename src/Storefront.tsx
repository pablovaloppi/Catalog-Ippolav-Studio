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
import { Product, Category, Designer, SiteConfig } from './types';
import {
  collection,
  doc,
  onSnapshot,
  query,
  orderBy,
  limit,
  startAfter,
  getDocs,
  QueryDocumentSnapshot,
  DocumentData,
} from 'firebase/firestore';
import { db } from './firebase';

const BATCH_SIZE = 10;

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
  const [categories, setCategories] = useState<Category[]>([]);
  const [designers, setDesigners] = useState<Designer[]>([]);
  const [siteConfig, setSiteConfig] = useState<SiteConfig | null>(null);
  const [loading, setLoading] = useState(true);

  // Carga inicial rápida: sólo las primeras 10 figuras para que la web abra instantáneamente
  useEffect(() => {
    let isMounted = true;

    async function fetchInitialProducts() {
      try {
        const qProducts = query(
          collection(db, 'figures'),
          orderBy('order', 'asc'),
          limit(BATCH_SIZE)
        );
        const snapshot = await getDocs(qProducts);
        if (!isMounted) return;

        const data: Product[] = [];
        snapshot.forEach((docSnap) => {
          data.push({ id: docSnap.id, ...docSnap.data() } as Product);
        });

        setProducts(data);
        const lastVisible = snapshot.docs[snapshot.docs.length - 1] || null;
        setLastDoc(lastVisible);
        setHasMore(snapshot.docs.length === BATCH_SIZE);
      } catch (error) {
        console.error("Error fetching initial figures: ", error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchInitialProducts();

    const qCats = query(collection(db, 'categories'), orderBy('order', 'asc'));
    const unsubCats = onSnapshot(qCats, (snapshot) => {
      const data: Category[] = [];
      snapshot.forEach((docSnap) => {
        data.push({ id: docSnap.id, ...docSnap.data() } as Category);
      });
      setCategories(data);
    });

    const qDesigners = query(collection(db, 'designers'), orderBy('order', 'asc'));
    const unsubDesigners = onSnapshot(qDesigners, (snapshot) => {
      const data: Designer[] = [];
      snapshot.forEach((docSnap) => {
        data.push({ id: docSnap.id, ...docSnap.data() } as Designer);
      });
      setDesigners(data);
    });

    const unsubConfig = onSnapshot(doc(db, 'config', 'site'), (docSnapshot) => {
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

  // Carga de siguientes lotes desde Firestore cuando el usuario scrollea hacia abajo
  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || !lastDoc) return;
    setLoadingMore(true);

    try {
      const qNext = query(
        collection(db, 'figures'),
        orderBy('order', 'asc'),
        startAfter(lastDoc),
        limit(BATCH_SIZE)
      );
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

      const lastVisible = snapshot.docs[snapshot.docs.length - 1] || null;
      setLastDoc(lastVisible);
      setHasMore(snapshot.docs.length === BATCH_SIZE);
    } catch (error) {
      console.error("Error loading more figures: ", error);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore, lastDoc]);

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
        product.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
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

  // Si el usuario aplica un filtro o busca y aún hay pocas coincidencias cargadas, buscar en más lotes
  useEffect(() => {
    const isFiltering =
      searchQuery.trim() !== '' ||
      statusFilter !== 'all' ||
      franchiseFilter !== 'all' ||
      finishFilter !== 'all' ||
      scaleFilter !== 'all';

    if (isFiltering && hasMore && !loadingMore && !loading && filteredProducts.length < 6) {
      const timeoutId = setTimeout(() => {
        loadMore();
      }, 350);
      return () => clearTimeout(timeoutId);
    }
  }, [
    searchQuery,
    statusFilter,
    franchiseFilter,
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
    </>
  );
}
