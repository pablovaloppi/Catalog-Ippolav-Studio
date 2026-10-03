import {
  collection,
  doc,
  query,
  orderBy,
  limit,
  startAfter,
  getDocs,
  getDoc,
  where,
  getCountFromServer,
  updateDoc,
  increment,
  type QueryDocumentSnapshot,
  type DocumentData,
} from 'firebase/firestore';
import { db } from '../firebase';
import { Product, Category, Designer, SiteConfig, SortOption } from '../types';
import { getAllDescendantCategoryIds } from '../categoryUtils';

export function buildFiguresQuery(
  franchiseFilter: string,
  statusFilter: string,
  categories: Category[],
  afterDoc?: QueryDocumentSnapshot<DocumentData> | null,
  limitCount: number = 3,
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

export async function fetchFiguresBatch(
  franchiseFilter: string,
  statusFilter: string,
  categories: Category[],
  afterDoc?: QueryDocumentSnapshot<DocumentData> | null,
  limitCount: number = 3,
  sortBy: SortOption = 'default'
): Promise<{
  products: Product[];
  lastDoc: QueryDocumentSnapshot<DocumentData> | null;
  hasMore: boolean;
}> {
  const q = buildFiguresQuery(franchiseFilter, statusFilter, categories, afterDoc, limitCount, sortBy);
  const snapshot = await getDocs(q);
  const data: Product[] = [];
  snapshot.forEach((docSnap) => {
    data.push({ id: docSnap.id, ...docSnap.data() } as Product);
  });

  const lastVisible = snapshot.docs[snapshot.docs.length - 1] || null;
  return {
    products: data,
    lastDoc: lastVisible,
    hasMore: snapshot.docs.length === limitCount,
  };
}

export async function fetchCatalogMetadata(): Promise<{
  categories: Category[];
  designers: Designer[];
  siteConfig: SiteConfig | null;
}> {
  const [catsSnap, desSnap, configSnap] = await Promise.all([
    getDocs(query(collection(db, 'categories'), orderBy('order', 'asc'))),
    getDocs(query(collection(db, 'designers'), orderBy('order', 'asc'))),
    getDoc(doc(db, 'config', 'site')),
  ]);

  const categories: Category[] = [];
  catsSnap.forEach((docSnap) => {
    categories.push({ id: docSnap.id, ...docSnap.data() } as Category);
  });

  const designers: Designer[] = [];
  desSnap.forEach((docSnap) => {
    designers.push({ id: docSnap.id, ...docSnap.data() } as Designer);
  });

  const siteConfig = configSnap.exists() ? (configSnap.data() as SiteConfig) : null;

  return { categories, designers, siteConfig };
}

export async function fetchTotalFiguresCount(): Promise<number | null> {
  try {
    const countSnap = await getCountFromServer(collection(db, 'figures'));
    return countSnap.data().count;
  } catch (err) {
    console.warn("No se pudo obtener el conteo de figuras de Firestore:", err);
    return null;
  }
}

export async function fetchFigureById(figureId: string): Promise<Product | null> {
  if (!figureId) return null;
  const cleanId = figureId.trim();

  // 1. Buscar por Document ID directo de Firestore
  try {
    const figSnap = await getDoc(doc(db, 'figures', cleanId));
    if (figSnap.exists()) {
      return { id: figSnap.id, ...figSnap.data() } as Product;
    }
  } catch (err) {
    // Si contiene caracteres no válidos para doc ID, continuar con query
  }

  // 2. Generar variaciones numéricas posibles (#134, 134, #0134, 0134, #00134)
  const numOnly = cleanId.replace(/[^0-9]/g, '');
  const targetNumber = numOnly ? parseInt(numOnly, 10) : NaN;
  const variations: string[] = [cleanId];

  if (!isNaN(targetNumber)) {
    variations.push(
      String(targetNumber),
      `#${targetNumber}`,
      String(targetNumber).padStart(3, '0'),
      `#${String(targetNumber).padStart(3, '0')}`,
      String(targetNumber).padStart(4, '0'),
      `#${String(targetNumber).padStart(4, '0')}`
    );
  }

  const uniqueVariations = Array.from(new Set(variations));

  // 3. Buscar por numericId en Firestore usando las variaciones
  try {
    const qNumeric = query(
      collection(db, 'figures'),
      where('numericId', 'in', uniqueVariations.slice(0, 10)),
      limit(1)
    );
    const snapNumeric = await getDocs(qNumeric);
    if (!snapNumeric.empty) {
      const docSnap = snapNumeric.docs[0];
      return { id: docSnap.id, ...docSnap.data() } as Product;
    }
  } catch (err) {
    // Continuar con fallback completo
  }

  // 4. Fallback: buscar en el catálogo completo por id, valor numérico o título coincidente
  try {
    const snapAll = await getDocs(collection(db, 'figures'));
    const cleanLower = cleanId.toLowerCase();
    
    // Primero buscar coincidencia exacta por numericId o ID
    let docFound = snapAll.docs.find((d) => {
      if (d.id === cleanId) return true;
      const data = d.data();
      const numId = (data.numericId || '').toString().trim().toLowerCase();
      if (numId && uniqueVariations.some(v => v.toLowerCase() === numId)) {
        return true;
      }
      if (!isNaN(targetNumber) && numId) {
        const docNumOnly = numId.replace(/[^0-9]/g, '');
        if (docNumOnly && parseInt(docNumOnly, 10) === targetNumber) {
          return true;
        }
      }
      return false;
    });

    // Si no se encontró por ID o número, buscar por título
    if (!docFound) {
      docFound = snapAll.docs.find((d) => {
        const data = d.data();
        if (data.title && data.title.toLowerCase().trim() === cleanLower) {
          return true;
        }
        return false;
      });
    }

    if (docFound) {
      return { id: docFound.id, ...docFound.data() } as Product;
    }
  } catch (err) {
    console.warn("No se pudo obtener la figura por ID:", err);
  }

  return null;
}

export async function fetchFiguresByIds(figureIds: string[]): Promise<Product[]> {
  if (!figureIds || figureIds.length === 0) return [];
  try {
    const promises = figureIds.map((id) => fetchFigureById(id));
    const results = await Promise.all(promises);
    return results.filter((p): p is Product => p !== null);
  } catch (err) {
    console.warn("No se pudieron obtener las figuras por IDs:", err);
    return [];
  }
}

export async function toggleFigureLikeInDb(figureId: string, delta: number): Promise<void> {
  const figRef = doc(db, 'figures', figureId);
  await updateDoc(figRef, {
    likesCount: increment(delta),
  });
}

export async function fetchAllFiguresForSearch(): Promise<Product[]> {
  const snap = await getDocs(collection(db, 'figures'));
  const list: Product[] = [];
  snap.forEach((d) => list.push({ id: d.id, ...d.data() } as Product));
  return list;
}
