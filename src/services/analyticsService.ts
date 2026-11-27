import { 
  doc, 
  setDoc, 
  updateDoc,
  addDoc, 
  collection, 
  increment, 
  serverTimestamp, 
  getDocs, 
  query, 
  orderBy, 
  limit, 
  where,
  Timestamp
} from 'firebase/firestore';
import { logEvent } from 'firebase/analytics';
import { db, getFirebaseAnalytics } from '../firebase';
import { Product } from '../types';
import { 
  initMetaPixel, 
  trackPixelPageView, 
  trackPixelViewContent, 
  trackPixelContact, 
  trackPixelSearch, 
  trackPixelAddToWishlist,
  isAnalyticsExcluded,
  setAnalyticsExclusion,
  EXCLUDE_ANALYTICS_KEY
} from './metaPixelService';

export { isAnalyticsExcluded, setAnalyticsExclusion, EXCLUDE_ANALYTICS_KEY };

declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
    dataLayer?: any[];
  }
}

export type TrafficSource = 'instagram' | 'whatsapp' | 'direct' | 'other';
export type TrafficSourceDetail = 'link' | 'history' | 'feed' | 'dm' | 'other';
export type DeviceType = 'mobile' | 'desktop';

export interface TrafficAttribution {
  source: TrafficSource;
  sourceDetail: TrafficSourceDetail;
}

// Safe wrapper to trigger Google Analytics (gtag.js) and Firebase Analytics events
async function safeLogTrackingEvent(eventName: string, params?: Record<string, any>, bypassExclusion = false) {
  if (!bypassExclusion && isAnalyticsExcluded()) return;

  if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
    try {
      window.gtag('event', eventName, params);
    } catch (e) {
      // Non-blocking
    }
  }

  try {
    const analytics = await getFirebaseAnalytics();
    if (analytics) {
      logEvent(analytics, eventName, params);
    }
  } catch (err) {
    // Non-blocking
  }
}

export interface DailyAnalyticsData {
  id: string; // YYYY-MM-DD
  date: string;
  viewsTotal: number;
  viewsFromInstagram: number;
  viewsFromWhatsApp: number;
  viewsFromDirect: number;
  viewsFromOther: number;
  viewsFromIgLink?: number;
  viewsFromIgHistory?: number;
  viewsFromIgFeed?: number;
  viewsFromIgDm?: number;
  viewsFromWaMsg?: number;
  deviceMobile: number;
  deviceDesktop: number;
  whatsappTotalClicks: number;
  figureViews?: Record<string, { id: string; title: string; count: number }>;
  whatsappClicks?: Record<string, { id: string; title: string; count: number }>;
  searchTerms?: Record<string, { term: string; count: number }>;
  categoryViews?: Record<string, number>;
  updatedAt?: Timestamp | null;
}

export interface AnalyticsEventItem {
  id?: string;
  type: 'visit' | 'figure_view' | 'whatsapp_click' | 'instagram_click' | 'search' | 'category_click';
  source: TrafficSource;
  sourceDetail?: TrafficSourceDetail;
  device: DeviceType;
  figureId?: string;
  figureTitle?: string;
  figureNumericId?: string;
  searchTerm?: string;
  categoryName?: string;
  timestamp: Timestamp | Date;
}

function getTodayKey(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const ATTRIBUTION_STORAGE_KEY = 'ippolav_traffic_attribution_v1';

function mapPlacementToken(raw: string): TrafficSourceDetail | null {
  const val = raw.toLowerCase().trim();
  if (!val) return null;

  if (
    val === 'history' ||
    val === 'historia' ||
    val === 'historias' ||
    val === 'story' ||
    val === 'stories' ||
    val === 'ig_story' ||
    val === 'ig_history' ||
    val === 'estado' ||
    val === 'estados'
  ) {
    return 'history';
  }
  if (
    val === 'feed' ||
    val === 'post' ||
    val === 'posts' ||
    val === 'reel' ||
    val === 'reels' ||
    val === 'publicacion' ||
    val === 'ig_feed'
  ) {
    return 'feed';
  }
  if (
    val === 'dm' ||
    val === 'msg' ||
    val === 'mensaje' ||
    val === 'mensajes' ||
    val === 'chat' ||
    val === 'inbox' ||
    val === 'direct_msg' ||
    val === 'ig_dm'
  ) {
    return 'dm';
  }
  if (
    val === 'link' ||
    val === 'bio' ||
    val === 'perfil' ||
    val === 'profile' ||
    val === 'web'
  ) {
    return 'link';
  }
  return null;
}

export function detectTrafficAttribution(): TrafficAttribution {
  if (typeof window === 'undefined') return { source: 'direct', sourceDetail: 'link' };

  try {
    const url = new URL(window.location.href);
    const searchParams = url.searchParams;
    const rawHash = url.hash.replace(/^#\/?/, '');
    const hashParams = rawHash ? new URLSearchParams(rawHash.startsWith('?') ? rawHash.slice(1) : rawHash) : null;

    const getParam = (key: string) => (searchParams.get(key) || hashParams?.get(key) || '').toLowerCase().trim();
    const hasParam = (key: string) => searchParams.has(key) || Boolean(hashParams?.has(key));

    const igParam = getParam('ig');
    const waParam = getParam('wa');
    const utmSource = getParam('utm_source');
    const utmMedium = getParam('utm_medium');
    const utmCampaign = getParam('utm_campaign');
    const srcParam = getParam('src') || getParam('from');
    const hasIgShid = hasParam('igshid') || hasParam('igsh');
    const hasFbClid = hasParam('fbclid');

    let explicitAttribution: TrafficAttribution | null = null;

    // 1. Parámetros simples dedicados (?ig=history, ?ig=feed, ?ig=dm, ?ig=link)
    if (igParam) {
      explicitAttribution = {
        source: 'instagram',
        sourceDetail: mapPlacementToken(igParam) || 'link',
      };
    } else if (waParam) {
      // Parámetro simple de WhatsApp (?wa=1, ?wa=msg, ?wa=link, ?wa=history)
      explicitAttribution = {
        source: 'whatsapp',
        sourceDetail: mapPlacementToken(waParam) || 'dm',
      };
    } else if (
      utmSource.includes('whatsapp') ||
      utmSource === 'wa' ||
      utmMedium.includes('whatsapp') ||
      srcParam === 'wa' ||
      srcParam === 'whatsapp'
    ) {
      explicitAttribution = {
        source: 'whatsapp',
        sourceDetail: mapPlacementToken(utmMedium) || mapPlacementToken(utmCampaign) || mapPlacementToken(srcParam) || 'dm',
      };
    } else if (
      utmSource.includes('instagram') ||
      utmSource === 'ig' ||
      utmMedium.includes('instagram') ||
      srcParam === 'ig' ||
      srcParam === 'instagram' ||
      hasIgShid ||
      hasFbClid
    ) {
      explicitAttribution = {
        source: 'instagram',
        sourceDetail: mapPlacementToken(utmMedium) || mapPlacementToken(utmCampaign) || mapPlacementToken(srcParam) || 'link',
      };
    } else if (utmMedium) {
      const mapped = mapPlacementToken(utmMedium);
      if (mapped) {
        explicitAttribution = {
          source: 'instagram',
          sourceDetail: mapped,
        };
      }
    }

    if (explicitAttribution) {
      try {
        sessionStorage.setItem(ATTRIBUTION_STORAGE_KEY, JSON.stringify(explicitAttribution));
      } catch {
        // Ignore storage errors
      }
      return explicitAttribution;
    }

    // 2. Recuperar atribución persistida en la sesión (evita perder el origen si el usuario busca o abre figuras)
    try {
      const stored = sessionStorage.getItem(ATTRIBUTION_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as TrafficAttribution;
        if (parsed && parsed.source && parsed.sourceDetail) {
          return parsed;
        }
      }
    } catch {
      // Ignore storage errors
    }

    // 3. Detección por referrer si aún no hay parámetros explícitos
    const referrer = (document.referrer || '').toLowerCase();
    let inferred: TrafficAttribution;

    if (!referrer) {
      inferred = { source: 'direct', sourceDetail: 'link' };
    } else if (referrer.includes('instagram.com') || referrer.includes('l.instagram.com') || referrer.includes('ig.me')) {
      inferred = { source: 'instagram', sourceDetail: 'link' };
    } else if (referrer.includes('whatsapp.com') || referrer.includes('wa.me') || referrer.includes('web.whatsapp.com')) {
      inferred = { source: 'whatsapp', sourceDetail: 'dm' };
    } else if (referrer.includes(window.location.hostname)) {
      inferred = { source: 'direct', sourceDetail: 'link' };
    } else {
      inferred = { source: 'other', sourceDetail: 'other' };
    }

    try {
      sessionStorage.setItem(ATTRIBUTION_STORAGE_KEY, JSON.stringify(inferred));
    } catch {
      // Ignore storage errors
    }

    return inferred;
  } catch {
    return { source: 'direct', sourceDetail: 'link' };
  }
}

export function detectTrafficSource(): TrafficSource {
  return detectTrafficAttribution().source;
}

export function detectDeviceType(): DeviceType {
  if (typeof window === 'undefined') return 'desktop';
  const isMobileUa = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const isMobileWidth = window.innerWidth <= 768;
  return isMobileUa || isMobileWidth ? 'mobile' : 'desktop';
}

/**
 * Tracks a new visitor session arrival (deduplicated per browser session)
 */
export async function trackPageView(metaPixelId?: string, bypassExclusion = false): Promise<void> {
  if (typeof window === 'undefined') return;
  if (!bypassExclusion && isAnalyticsExcluded()) return;

  // Initialize Meta Pixel if ID is configured
  if (metaPixelId) {
    initMetaPixel(metaPixelId, bypassExclusion);
  }
  const { source, sourceDetail } = detectTrafficAttribution();

  trackPixelPageView(bypassExclusion);
  safeLogTrackingEvent('page_view', {
    page_location: window.location.href,
    traffic_source: source,
    traffic_detail: sourceDetail,
  }, bypassExclusion);

  try {
    const today = getTodayKey();
    const sessionKey = `ippolav_session_tracked_${today}_${source}_${sourceDetail}`;
    if (sessionStorage.getItem(sessionKey)) {
      return; // Already tracked in daily Firestore doc for this session/source today
    }
    sessionStorage.setItem(sessionKey, '1');

    const device = detectDeviceType();

    const dailyRef = doc(db, 'analytics_daily', today);
    const sourceField = 
      source === 'instagram' ? 'viewsFromInstagram' :
      source === 'whatsapp' ? 'viewsFromWhatsApp' :
      source === 'direct' ? 'viewsFromDirect' : 'viewsFromOther';

    const detailCounterUpdate: Record<string, any> = {};
    if (source === 'instagram') {
      if (sourceDetail === 'history') detailCounterUpdate.viewsFromIgHistory = increment(1);
      else if (sourceDetail === 'feed') detailCounterUpdate.viewsFromIgFeed = increment(1);
      else if (sourceDetail === 'dm') detailCounterUpdate.viewsFromIgDm = increment(1);
      else detailCounterUpdate.viewsFromIgLink = increment(1);
    } else if (source === 'whatsapp') {
      detailCounterUpdate.viewsFromWaMsg = increment(1);
    }

    const deviceField = device === 'mobile' ? 'deviceMobile' : 'deviceDesktop';

    await setDoc(dailyRef, {
      date: today,
      viewsTotal: increment(1),
      [sourceField]: increment(1),
      ...detailCounterUpdate,
      [deviceField]: increment(1),
      updatedAt: serverTimestamp(),
    }, { merge: true });

    // Also log recent visit event
    await addDoc(collection(db, 'analytics_events'), {
      type: 'visit',
      source,
      sourceDetail,
      device,
      timestamp: serverTimestamp(),
    });
  } catch (err) {
    // Non-blocking telemetry
    console.warn('Analytics page view error:', err);
  }
}

/**
 * Tracks when a visitor opens and views a figure's detail modal
 */
export async function trackFigureView(
  figure: { id: string; title: string; franchiseId?: string; numericId?: string },
  bypassExclusion = false
): Promise<void> {
  if (!figure || !figure.id) return;
  if (!bypassExclusion && isAnalyticsExcluded()) return;

  // Track in Meta Pixel & Firebase Analytics
  trackPixelViewContent(figure, bypassExclusion);
  safeLogTrackingEvent('view_item', {
    item_id: figure.id,
    item_name: figure.title,
    item_category: figure.franchiseId || 'Figures',
  }, bypassExclusion);

  try {
    const { source, sourceDetail } = detectTrafficAttribution();
    const device = detectDeviceType();
    const today = getTodayKey();

    const dailyRef = doc(db, 'analytics_daily', today);
    const cleanKey = String(figure.id).replace(/[^a-zA-Z0-9_-]/g, '_');

    await setDoc(dailyRef, {
      date: today,
      viewsTotal: increment(1),
      figureViews: {
        [cleanKey]: {
          id: figure.id,
          title: figure.title,
          numericId: figure.numericId || '',
          count: increment(1),
        }
      },
      updatedAt: serverTimestamp(),
    }, { merge: true });

    await addDoc(collection(db, 'analytics_events'), {
      type: 'figure_view',
      source,
      sourceDetail,
      device,
      figureId: figure.id,
      figureTitle: figure.title,
      figureNumericId: figure.numericId || '',
      timestamp: serverTimestamp(),
    });

    // Incrementar viewsCount directamente en el documento de la figura para ordenación en catálogo
    try {
      const figureRef = doc(db, 'figures', figure.id);
      await updateDoc(figureRef, {
        viewsCount: increment(1),
      });
    } catch {
      // Silenciar si no existe o permiso transitorio
    }
  } catch (err) {
    console.warn('Analytics figure view error:', err);
  }
}

/**
 * Tracks when a visitor clicks the WhatsApp inquiry/buy button for a figure
 */
export async function trackWhatsAppClick(
  figure: { id: string; title: string; price?: number; numericId?: string },
  bypassExclusion = false
): Promise<void> {
  if (!figure || !figure.id) return;
  if (!bypassExclusion && isAnalyticsExcluded()) return;

  // Track in Meta Pixel & Firebase Analytics as high-value conversion Lead
  trackPixelContact(figure, bypassExclusion);
  safeLogTrackingEvent('generate_lead', {
    item_id: figure.id,
    item_name: figure.title,
    channel: 'whatsapp',
  }, bypassExclusion);

  try {
    const { source, sourceDetail } = detectTrafficAttribution();
    const device = detectDeviceType();
    const today = getTodayKey();

    const dailyRef = doc(db, 'analytics_daily', today);
    const cleanKey = String(figure.id).replace(/[^a-zA-Z0-9_-]/g, '_');

    await setDoc(dailyRef, {
      date: today,
      whatsappTotalClicks: increment(1),
      whatsappClicks: {
        [cleanKey]: {
          id: figure.id,
          title: figure.title,
          numericId: figure.numericId || '',
          count: increment(1),
        }
      },
      updatedAt: serverTimestamp(),
    }, { merge: true });

    await addDoc(collection(db, 'analytics_events'), {
      type: 'whatsapp_click',
      source,
      sourceDetail,
      device,
      figureId: figure.id,
      figureTitle: figure.title,
      figureNumericId: figure.numericId || '',
      timestamp: serverTimestamp(),
    });
  } catch (err) {
    console.warn('Analytics WhatsApp click error:', err);
  }
}

/**
 * Tracks when a visitor clicks the Instagram inquiry/contact button for a figure
 */
export async function trackInstagramClick(
  figure: { id: string; title: string; price?: number; numericId?: string },
  bypassExclusion = false
): Promise<void> {
  if (!figure || !figure.id) return;
  if (!bypassExclusion && isAnalyticsExcluded()) return;

  // Track in Meta Pixel & Firebase Analytics as conversion Lead
  trackPixelContact(figure, bypassExclusion);
  safeLogTrackingEvent('generate_lead', {
    item_id: figure.id,
    item_name: figure.title,
    channel: 'instagram',
  }, bypassExclusion);

  try {
    const { source, sourceDetail } = detectTrafficAttribution();
    const device = detectDeviceType();
    const today = getTodayKey();

    const dailyRef = doc(db, 'analytics_daily', today);
    const cleanKey = String(figure.id).replace(/[^a-zA-Z0-9_-]/g, '_');

    await setDoc(dailyRef, {
      date: today,
      whatsappTotalClicks: increment(1),
      whatsappClicks: {
        [cleanKey]: {
          id: figure.id,
          title: figure.title,
          numericId: figure.numericId || '',
          count: increment(1),
        }
      },
      updatedAt: serverTimestamp(),
    }, { merge: true });

    await addDoc(collection(db, 'analytics_events'), {
      type: 'instagram_click',
      source,
      sourceDetail,
      device,
      figureId: figure.id,
      figureTitle: figure.title,
      figureNumericId: figure.numericId || '',
      timestamp: serverTimestamp(),
    });
  } catch (err) {
    console.warn('Analytics Instagram click error:', err);
  }
}

/**
 * Deduplication window in milliseconds for repeated identical searches by the same user.
 * Avoids registering the same search query multiple times if searched in a short period (15 minutes).
 */
const SEARCH_COOLDOWN_MS = 15 * 60 * 1000;

/**
 * Tracks what search terms visitors are querying in the search bar
 */
export async function trackSearchQuery(term: string, bypassExclusion = false): Promise<void> {
  const cleaned = term.trim().toLowerCase();
  if (!cleaned || cleaned.length < 2) return;
  if (!bypassExclusion && isAnalyticsExcluded()) return;

  // Evitar contar búsquedas idénticas repetidas por el mismo usuario en un período de tiempo
  if (typeof window !== 'undefined' && !bypassExclusion) {
    try {
      const storageKey = 'ippolav_recent_searches';
      const stored = sessionStorage.getItem(storageKey);
      const recentSearches: Record<string, number> = stored ? JSON.parse(stored) : {};
      const now = Date.now();
      const lastSearchTime = recentSearches[cleaned];

      if (lastSearchTime && (now - lastSearchTime) < SEARCH_COOLDOWN_MS) {
        // Ya fue contabilizado recientemente en este período de tiempo (ej. 'star wars' hace menos de 15 min)
        return;
      }

      // Guardar timestamp de la búsqueda actual
      recentSearches[cleaned] = now;
      // Limpiar entradas antiguas (más de 2 horas) para mantener el almacenamiento limpio
      Object.keys(recentSearches).forEach((key) => {
        if (now - recentSearches[key] > 2 * 60 * 60 * 1000) {
          delete recentSearches[key];
        }
      });
      sessionStorage.setItem(storageKey, JSON.stringify(recentSearches));
    } catch {
      // Continuar si sessionStorage no está disponible
    }
  }

  // Track in Meta Pixel & Firebase Analytics
  trackPixelSearch(cleaned, bypassExclusion);
  safeLogTrackingEvent('search', {
    search_term: cleaned,
  }, bypassExclusion);

  try {
    const { source, sourceDetail } = detectTrafficAttribution();
    const device = detectDeviceType();
    const today = getTodayKey();

    const dailyRef = doc(db, 'analytics_daily', today);
    const safeKey = cleaned.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 50);

    await setDoc(dailyRef, {
      date: today,
      searchTerms: {
        [safeKey]: {
          term: cleaned,
          count: increment(1),
        }
      },
      updatedAt: serverTimestamp(),
    }, { merge: true });

    await addDoc(collection(db, 'analytics_events'), {
      type: 'search',
      source,
      sourceDetail,
      device,
      searchTerm: cleaned,
      timestamp: serverTimestamp(),
    });
  } catch (err) {
    console.warn('Analytics search query error:', err);
  }
}

/**
 * Tracks when a user marks a figure as favorite (AddToWishlist)
 */
export function trackFigureFavorite(figure: { id: string; title: string }, bypassExclusion = false): void {
  if (!bypassExclusion && isAnalyticsExcluded()) return;
  trackPixelAddToWishlist(figure, bypassExclusion);
  safeLogTrackingEvent('add_to_wishlist', {
    item_id: figure.id,
    item_name: figure.title,
  }, bypassExclusion);
}

/**
 * Fetches aggregated daily analytics for a given number of past days
 */
export async function fetchDailyAnalytics(daysCount: number = 30): Promise<DailyAnalyticsData[]> {
  try {
    const q = query(
      collection(db, 'analytics_daily'),
      orderBy('date', 'desc'),
      limit(daysCount)
    );
    const snap = await getDocs(q);
    const list: DailyAnalyticsData[] = [];
    snap.forEach((d) => {
      list.push({ id: d.id, ...d.data() } as DailyAnalyticsData);
    });
    return list;
  } catch (err) {
    console.warn('Error fetching daily analytics:', err);
    return [];
  }
}

/**
 * Fetches recent live events log for the live activity feed
 */
export async function fetchRecentEvents(limitCount: number = 80): Promise<AnalyticsEventItem[]> {
  try {
    const q = query(
      collection(db, 'analytics_events'),
      orderBy('timestamp', 'desc'),
      limit(limitCount)
    );
    const snap = await getDocs(q);
    const list: AnalyticsEventItem[] = [];
    snap.forEach((d) => {
      list.push({ id: d.id, ...d.data() } as AnalyticsEventItem);
    });
    return list;
  } catch (err) {
    console.warn('Error fetching recent events:', err);
    return [];
  }
}
