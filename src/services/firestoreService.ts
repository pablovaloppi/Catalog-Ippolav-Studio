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
