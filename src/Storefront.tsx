import { useState, useMemo, useEffect } from 'react';
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
import { Product, Category, Designer } from './types';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from './firebase';

export function Storefront() {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [franchiseFilter, setFranchiseFilter] = useState('all');
  const [finishFilter, setFinishFilter] = useState('all');
  const [scaleFilter, setScaleFilter] = useState('all');
  
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [designers, setDesigners] = useState<Designer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const qProducts = query(collection(db, 'figures'), orderBy('order', 'asc'));
    const unsubProducts = onSnapshot(qProducts, (snapshot) => {
      const data: Product[] = [];
      snapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() } as Product);
      });
      setProducts(data);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching figures: ", error);
      setLoading(false);
    });

    const qCats = query(collection(db, 'categories'), orderBy('order', 'asc'));
    const unsubCats = onSnapshot(qCats, (snapshot) => {
      const data: Category[] = [];
      snapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() } as Category);
      });
      setCategories(data);
    });

    const qDesigners = query(collection(db, 'designers'), orderBy('order', 'asc'));
    const unsubDesigners = onSnapshot(qDesigners, (snapshot) => {
      const data: Designer[] = [];
      snapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() } as Designer);
      });
      setDesigners(data);
    });

    return () => {
      unsubProducts();
      unsubCats();
      unsubDesigners();
    };
  }, []);

  const availableFinishes = useMemo(() => {
    const finishes = new Set(products.map(p => p.finish).filter(Boolean));
    return Array.from(finishes);
  }, [products]);

  const availableScales = useMemo(() => {
    const scales = new Set<string>();
    products.forEach(p => {
      if (Array.isArray(p.scale)) {
        p.scale.forEach(s => scales.add(s));
      }
    });
    return Array.from(scales).sort();
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
          <Catalog products={filteredProducts} categories={categories} onSelectProduct={setSelectedProduct} />
        )}
        <Franchises onSelectFranchise={setFranchiseFilter} categories={categories} />
        <HowToBuy />
        <Contact />
      </main>
      <Footer />
      
      <ProductModal 
        product={selectedProduct} 
        categoryName={selectedProduct ? categories.find(c => c.id === selectedProduct.franchiseId)?.name : undefined}
        designerName={selectedProduct && selectedProduct.designerId ? designers.find(d => d.id === selectedProduct.designerId)?.name : undefined}
        onClose={() => setSelectedProduct(null)} 
      />
    </>
  );
}
