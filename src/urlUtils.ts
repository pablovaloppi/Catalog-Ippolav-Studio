/**
 * Utility functions for URL-based catalog filtering and direct search link sharing.
 * Supports /b=term, /buscar/term, ?b=term, ?buscar=term, ?q=term, and hash links.
 */

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
 * Copies the search link to the user's clipboard
 */
export async function copySearchLinkToClipboard(query: string): Promise<boolean> {
  const url = getShareableSearchUrl(query, true);
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(url);
      return true;
    }
    // Fallback for older environments
    const textArea = document.createElement('textarea');
    textArea.value = url;
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  } catch (err) {
    console.warn('No se pudo copiar el enlace al portapapeles:', err);
    return false;
  }
}
