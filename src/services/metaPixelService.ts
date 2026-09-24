/**
 * Meta Pixel (Facebook & Instagram Pixel) Integration Service
 * Manages tracking events for organic & paid traffic from Instagram/Meta.
 */

declare global {
  interface Window {
    fbq?: any;
    _fbq?: any;
    'ga-disable-G-T3T6T4LR95'?: boolean;
  }
}

export const EXCLUDE_ANALYTICS_KEY = 'ippolav_exclude_analytics';
const DEFAULT_PIXEL_ID = '1649607870067319';

let isPixelInitialized = false;
let currentPixelId: string | null = DEFAULT_PIXEL_ID;

/**
 * Checks if tracking is excluded for this client (e.g. Admin testing / Admin logged in)
 */
export function isAnalyticsExcluded(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const stored = localStorage.getItem(EXCLUDE_ANALYTICS_KEY);
    if (stored === 'true') return true;
    if (stored === 'false') return false;

    // Check if the current route is within the admin panel
    if (
      window.location.pathname.startsWith('/admin') ||
      window.location.hash.includes('admin')
    ) {
      return true;
    }
  } catch {
    return false;
  }
  return false;
}

/**
 * Enables or disables analytics exclusion for this browser
 */
export function setAnalyticsExclusion(exclude: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(EXCLUDE_ANALYTICS_KEY, exclude ? 'true' : 'false');
    // Disable or enable Google Analytics on the global window object
    window['ga-disable-G-T3T6T4LR95'] = exclude;
  } catch (e) {
    console.warn('Error configurando exclusión de analíticas:', e);
  }
}

/**
 * Initializes the Meta Pixel snippet in the browser.
 * Safe to call multiple times with or without a custom Pixel ID.
 */
export function initMetaPixel(pixelId?: string, bypassExclusion = false): void {
  if (typeof window === 'undefined') return;
  if (!bypassExclusion && isAnalyticsExcluded()) {
    return;
  }

  const targetId = pixelId?.trim() || currentPixelId || DEFAULT_PIXEL_ID;
  if (!targetId) return;

  if (isPixelInitialized && currentPixelId === targetId) {
    return;
  }

  currentPixelId = targetId;

  // Initialize fbq stub if not already present
  if (!window.fbq) {
    const fbq: any = function () {
      if (fbq.callMethod) {
        fbq.callMethod.apply(fbq, arguments);
      } else {
        fbq.queue.push(arguments);
      }
    };
    if (!window._fbq) window._fbq = fbq;
    fbq.push = fbq;
    fbq.loaded = true;
    fbq.version = '2.0';
    fbq.queue = [];
    window.fbq = fbq;

    // Inject Meta script
    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://connect.facebook.net/en_US/fbevents.js';
    const firstScript = document.getElementsByTagName('script')[0];
    if (firstScript && firstScript.parentNode) {
      firstScript.parentNode.insertBefore(script, firstScript);
    } else {
      document.head.appendChild(script);
    }
  }

  try {
    window.fbq('init', targetId);
    isPixelInitialized = true;
  } catch (err) {
    console.warn('Error inicializando Meta Pixel:', err);
  }
}

/**
 * Tracks standard PageView event in Meta Pixel
 */
export function trackPixelPageView(bypassExclusion = false): void {
  if (typeof window === 'undefined' || !window.fbq) return;
  if (!bypassExclusion && isAnalyticsExcluded()) return;
  try {
    window.fbq('track', 'PageView');
  } catch (e) {
    console.warn('Error en Meta Pixel PageView:', e);
  }
}

/**
 * Tracks ViewContent when a visitor opens a figure modal
 */
export function trackPixelViewContent(
  figure: { id: string; title: string; franchiseId?: string },
  bypassExclusion = false
): void {
  if (typeof window === 'undefined' || !window.fbq || !figure) return;
  if (!bypassExclusion && isAnalyticsExcluded()) return;
  try {
    window.fbq('track', 'ViewContent', {
      content_name: figure.title,
      content_ids: [figure.id],
      content_type: 'product',
      content_category: figure.franchiseId || 'Coleccionables',
    });
  } catch (e) {
    console.warn('Error en Meta Pixel ViewContent:', e);
  }
}

/**
 * Tracks Contact / Lead event when a visitor clicks WhatsApp for a figure
 */
export function trackPixelContact(figure: { id: string; title: string }, bypassExclusion = false): void {
  if (typeof window === 'undefined' || !window.fbq || !figure) return;
  if (!bypassExclusion && isAnalyticsExcluded()) return;
  try {
    window.fbq('track', 'Contact', {
      content_name: figure.title,
      content_ids: [figure.id],
      content_type: 'product',
    });
    // Also track Lead as standard Meta conversion
    window.fbq('track', 'Lead', {
      content_name: figure.title,
      content_category: 'WhatsApp Inquiry',
    });
  } catch (e) {
    console.warn('Error en Meta Pixel Lead:', e);
  }
}

/**
 * Tracks Search event in Meta Pixel
 */
export function trackPixelSearch(searchQuery: string, bypassExclusion = false): void {
  if (typeof window === 'undefined' || !window.fbq || !searchQuery) return;
  if (!bypassExclusion && isAnalyticsExcluded()) return;
  try {
    window.fbq('track', 'Search', {
      search_string: searchQuery,
      content_category: 'Catalog Search',
    });
  } catch (e) {
    console.warn('Error en Meta Pixel Search:', e);
  }
}

/**
 * Tracks AddToWishlist (Favoritos) in Meta Pixel
 */
export function trackPixelAddToWishlist(figure: { id: string; title: string }, bypassExclusion = false): void {
  if (typeof window === 'undefined' || !window.fbq || !figure) return;
  if (!bypassExclusion && isAnalyticsExcluded()) return;
  try {
    window.fbq('track', 'AddToWishlist', {
      content_name: figure.title,
      content_ids: [figure.id],
    });
  } catch (e) {
    console.warn('Error en Meta Pixel AddToWishlist:', e);
  }
}

