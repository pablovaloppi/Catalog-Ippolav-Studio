/**
 * Utility functions for URL-based catalog filtering and direct search link sharing.
 * Supports /b=term, /buscar/term, ?b=term, ?buscar=term, ?q=term, and hash links.
 * Also supports direct figure deep linking (?figura=id, ?f=id, #figura=id).
 */

export function extractFigureIdFromLocation(): string {
  if (typeof window === 'undefined') return '';

  // 1. Check search params (?figura=id, ?f=id, ?fig=id, ?p=id, ?id=id)
  try {
    const searchParams = new URLSearchParams(window.location.search);
    for (const key of ['figura', 'f', 'fig', 'p', 'figId', 'figure', 'id']) {
      const val = searchParams.get(key);
      if (val && val.trim()) {
        return decodeURIComponent(val).trim();
      }
    }
  } catch (e) {
    console.warn('Error extracting figure ID from search params:', e);
  }

  // 2. Check hash (#figura=id or #/figura/id)
  try {
    const rawHash = window.location.hash.replace(/^#\/?/, '');
    if (rawHash) {
      const hashParams = new URLSearchParams(rawHash.startsWith('?') ? rawHash.slice(1) : rawHash);
      for (const key of ['figura', 'f', 'fig', 'p', 'figure', 'id']) {
        const val = hashParams.get(key);
        if (val && val.trim()) {
          return decodeURIComponent(val).trim();
        }
      }
      const match = rawHash.match(/^(?:figura|f|figure)=([^&]+)/i);
      if (match && match[1]) {
        return decodeURIComponent(match[1]).trim();
      }
    }
  } catch (e) {
    console.warn('Error extracting figure ID from hash:', e);
  }

  return '';
}

export function extractSearchQueryFromLocation(): string {
  if (typeof window === 'undefined') return '';

  // 1. Check standard URL query parameters (?b=spiderman, ?buscar=spiderman, ?q=spiderman, ?search=spiderman)
  try {
    const searchParams = new URLSearchParams(window.location.search);
    for (const key of ['b', 'q', 'buscar', 'search', 's']) {
      const val = searchParams.get(key);
      if (val && val.trim()) {
        return decodeURIComponent(val.replace(/\+/g, ' ')).trim();
      }
    }
  } catch (e) {
    console.warn('Error extracting search from URLSearchParams:', e);
  }

  // 2. Check path syntax like /b=spiderman or /buscar=spiderman or /b/spiderman
  try {
    const path = window.location.pathname;
    
    // Pattern: /b=spiderman or /buscar=spiderman or /q=spiderman
    const bEqualsMatch = path.match(/^\/(?:b|buscar|q|search)=([^/?#]+)/i);
    if (bEqualsMatch && bEqualsMatch[1]) {
      return decodeURIComponent(bEqualsMatch[1].replace(/\+/g, ' ')).trim();
    }

    // Pattern: /b/spiderman or /buscar/spiderman
    const slashMatch = path.match(/^\/(?:b|buscar)\/([^/?#]+)/i);
    if (slashMatch && slashMatch[1]) {
      return decodeURIComponent(slashMatch[1].replace(/\+/g, ' ')).trim();
    }
  } catch (e) {
    console.warn('Error extracting search from pathname:', e);
  }

  // 3. Check hash syntax like #b=spiderman or #/b=spiderman
  try {
    const rawHash = window.location.hash.replace(/^#\/?/, '');
    if (rawHash) {
      const hashParams = new URLSearchParams(rawHash.startsWith('?') ? rawHash.slice(1) : rawHash);
      for (const key of ['b', 'q', 'buscar', 'search', 's']) {
        const val = hashParams.get(key);
        if (val && val.trim()) {
          return decodeURIComponent(val.replace(/\+/g, ' ')).trim();
        }
      }
      const hashEqualsMatch = rawHash.match(/^(?:b|buscar|q|search)=([^&]+)/i);
      if (hashEqualsMatch && hashEqualsMatch[1]) {
        return decodeURIComponent(hashEqualsMatch[1].replace(/\+/g, ' ')).trim();
      }
    }
  } catch (e) {
    console.warn('Error extracting search from hash:', e);
  }

  return '';
}

/**
 * Generates the clean shareable URL for a given search term.
 * Formats as https://<domain>/b=term or relative /b=term
 */
export function getShareableSearchUrl(query: string, absolute: boolean = true): string {
  const trimmed = query.trim();
  if (!trimmed) return absolute && typeof window !== 'undefined' ? window.location.origin : '/';
  
  const encoded = encodeURIComponent(trimmed);
  const path = `/b=${encoded}`;
  
  if (absolute && typeof window !== 'undefined') {
    return `${window.location.origin}${path}`;
  }
  return path;
}

/**
 * Copies arbitrary text to the user's clipboard
 */
export async function copyTextToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  } catch (err) {
    console.warn('No se pudo copiar el texto al portapapeles:', err);
    return false;
  }
}

/**
 * Copies the search link to the user's clipboard
 */
export async function copySearchLinkToClipboard(query: string): Promise<boolean> {
  const url = getShareableSearchUrl(query, true);
  return copyTextToClipboard(url);
}

/**
 * Generates the direct URL for a specific figure.
 */
export function getShareableFigureUrl(product: { id: string; title: string }, absolute: boolean = true): string {
  if (!product || !product.id) return absolute && typeof window !== 'undefined' ? window.location.origin : '/';
  const param = `figura=${encodeURIComponent(product.id)}`;
  if (absolute && typeof window !== 'undefined') {
    return `${window.location.origin}/?${param}`;
  }
  return `/?${param}`;
}

export interface ShareResult {
  shared: boolean;
  method: 'native' | 'clipboard' | 'failed' | 'aborted';
}

/**
 * Shares a figure using the native Web Share API (navigator.share)
 * with graceful fallback to copying the direct link to the clipboard.
 */
export async function shareFigure(
  product: { id: string; title: string; finish?: string; price?: number },
  categoryName?: string
): Promise<ShareResult> {
  const url = getShareableFigureUrl(product, true);
  const shareData = {
    title: `${product.title} | Ippolav Studio`,
    text: `Mirá esta figura de ${product.title}${categoryName ? ` (${categoryName})` : ''} de Ippolav Studio:`,
    url: url,
  };

  // Try native Web Share API first
  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      await navigator.share(shareData);
      return { shared: true, method: 'native' };
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        // User clicked cancel or dismissed the share sheet
        return { shared: false, method: 'aborted' };
      }
      console.warn('Web Share API failed, falling back to clipboard:', err);
    }
  }

  // Fallback to clipboard
  const copied = await copyTextToClipboard(url);
  return {
    shared: copied,
    method: copied ? 'clipboard' : 'failed',
  };
}
