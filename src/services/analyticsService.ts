import { 
  doc, 
  setDoc, 
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
  trackPixelAddToWishlist 
} from './metaPixelService';

export type TrafficSource = 'instagram' | 'whatsapp' | 'direct' | 'other';
export type DeviceType = 'mobile' | 'desktop';

// Safe wrapper to trigger Firebase Analytics events
async function safeLogFirebaseEvent(eventName: string, params?: Record<string, any>) {
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
  type: 'visit' | 'figure_view' | 'whatsapp_click' | 'search' | 'category_click';
  source: TrafficSource;
  device: DeviceType;
  figureId?: string;
  figureTitle?: string;
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

export function detectTrafficSource(): TrafficSource {
  if (typeof window === 'undefined') return 'direct';

  try {
    const url = new URL(window.location.href);
    const searchParams = url.searchParams;
    const utmSource = (searchParams.get('utm_source') || '').toLowerCase();
    const utmMedium = (searchParams.get('utm_medium') || '').toLowerCase();
    const hasIgShid = searchParams.has('igshid') || searchParams.has('igsh');
    const hasFbClid = searchParams.has('fbclid');

    if (
      utmSource.includes('instagram') || 
      utmMedium.includes('instagram') || 
      hasIgShid || 
      hasFbClid
    ) {
      return 'instagram';
    }

    if (utmSource.includes('whatsapp') || utmMedium.includes('whatsapp') || searchParams.has('wa')) {
      return 'whatsapp';
    }

    const referrer = (document.referrer || '').toLowerCase();
    if (!referrer) {
      return 'direct';
    }

    if (referrer.includes('instagram.com') || referrer.includes('l.instagram.com') || referrer.includes('ig.me')) {
      return 'instagram';
    }

    if (referrer.includes('whatsapp.com') || referrer.includes('wa.me') || referrer.includes('web.whatsapp.com')) {
      return 'whatsapp';
    }

    const currentHost = window.location.hostname;
    if (referrer.includes(currentHost)) {
      return 'direct';
    }

    return 'other';
  } catch {
    return 'direct';
  }
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
export async function trackPageView(metaPixelId?: string): Promise<void> {
  if (typeof window === 'undefined') return;

  // Initialize Meta Pixel if ID is configured
  if (metaPixelId) {
    initMetaPixel(metaPixelId);
  }
  trackPixelPageView();
  safeLogFirebaseEvent('page_view', {
    page_location: window.location.href,
    traffic_source: detectTrafficSource(),
  });

  try {
    const sessionKey = 'ippolav_session_tracked_' + getTodayKey();
    if (sessionStorage.getItem(sessionKey)) {
      return; // Already tracked in daily Firestore doc for this session today
    }
    sessionStorage.setItem(sessionKey, '1');

    const source = detectTrafficSource();
    const device = detectDeviceType();
    const today = getTodayKey();

    const dailyRef = doc(db, 'analytics_daily', today);
    const sourceField = 
      source === 'instagram' ? 'viewsFromInstagram' :
      source === 'whatsapp' ? 'viewsFromWhatsApp' :
      source === 'direct' ? 'viewsFromDirect' : 'viewsFromOther';

    const deviceField = device === 'mobile' ? 'deviceMobile' : 'deviceDesktop';

    await setDoc(dailyRef, {
      date: today,
      viewsTotal: increment(1),
      [sourceField]: increment(1),
      [deviceField]: increment(1),
      updatedAt: serverTimestamp(),
    }, { merge: true });

    // Also log recent visit event
    await addDoc(collection(db, 'analytics_events'), {
      type: 'visit',
      source,
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
export async function trackFigureView(figure: { id: string; title: string; franchiseId?: string }): Promise<void> {
  if (!figure || !figure.id) return;

  // Track in Meta Pixel & Firebase Analytics
  trackPixelViewContent(figure);
  safeLogFirebaseEvent('view_item', {
    item_id: figure.id,
    item_name: figure.title,
    item_category: figure.franchiseId || 'Figures',
  });

  try {
    const source = detectTrafficSource();
    const device = detectDeviceType();
    const today = getTodayKey();

    const dailyRef = doc(db, 'analytics_daily', today);
    const cleanKey = figure.id.replace(/[./#[\]$]/g, '_');

    await setDoc(dailyRef, {
      date: today,
      viewsTotal: increment(1),
      [`figureViews.${cleanKey}.id`]: figure.id,
      [`figureViews.${cleanKey}.title`]: figure.title,
      [`figureViews.${cleanKey}.count`]: increment(1),
      updatedAt: serverTimestamp(),
    }, { merge: true });

    await addDoc(collection(db, 'analytics_events'), {
      type: 'figure_view',
      source,
      device,
      figureId: figure.id,
      figureTitle: figure.title,
      timestamp: serverTimestamp(),
    });
  } catch (err) {
    console.warn('Analytics figure view error:', err);
  }
}

/**
 * Tracks when a visitor clicks the WhatsApp inquiry/buy button for a figure
 */
export async function trackWhatsAppClick(figure: { id: string; title: string; price?: number }): Promise<void> {
  if (!figure || !figure.id) return;

  // Track in Meta Pixel & Firebase Analytics as high-value conversion Lead
  trackPixelContact(figure);
  safeLogFirebaseEvent('generate_lead', {
    item_id: figure.id,
    item_name: figure.title,
    channel: 'whatsapp',
  });

  try {
    const source = detectTrafficSource();
    const device = detectDeviceType();
    const today = getTodayKey();

    const dailyRef = doc(db, 'analytics_daily', today);
    const cleanKey = figure.id.replace(/[./#[\]$]/g, '_');

    await setDoc(dailyRef, {
      date: today,
      whatsappTotalClicks: increment(1),
      [`whatsappClicks.${cleanKey}.id`]: figure.id,
      [`whatsappClicks.${cleanKey}.title`]: figure.title,
      [`whatsappClicks.${cleanKey}.count`]: increment(1),
      updatedAt: serverTimestamp(),
    }, { merge: true });

    await addDoc(collection(db, 'analytics_events'), {
      type: 'whatsapp_click',
      source,
      device,
      figureId: figure.id,
      figureTitle: figure.title,
      timestamp: serverTimestamp(),
    });
  } catch (err) {
    console.warn('Analytics WhatsApp click error:', err);
  }
}

/**
 * Tracks what search terms visitors are querying in the search bar
 */
export async function trackSearchQuery(term: string): Promise<void> {
  const cleaned = term.trim().toLowerCase();
  if (!cleaned || cleaned.length < 2) return;

  // Track in Meta Pixel & Firebase Analytics
  trackPixelSearch(cleaned);
  safeLogFirebaseEvent('search', {
    search_term: cleaned,
  });

  try {
    const source = detectTrafficSource();
    const device = detectDeviceType();
    const today = getTodayKey();

    const dailyRef = doc(db, 'analytics_daily', today);
    const safeKey = cleaned.replace(/[./#[\]$]/g, '_').slice(0, 50);

    await setDoc(dailyRef, {
      date: today,
      [`searchTerms.${safeKey}.term`]: cleaned,
      [`searchTerms.${safeKey}.count`]: increment(1),
      updatedAt: serverTimestamp(),
    }, { merge: true });

    await addDoc(collection(db, 'analytics_events'), {
      type: 'search',
      source,
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
export function trackFigureFavorite(figure: { id: string; title: string }): void {
  trackPixelAddToWishlist(figure);
  safeLogFirebaseEvent('add_to_wishlist', {
    item_id: figure.id,
    item_name: figure.title,
  });
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
export async function fetchRecentEvents(limitCount: number = 25): Promise<AnalyticsEventItem[]> {
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
