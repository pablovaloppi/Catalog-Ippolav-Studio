import { Product } from './types';

const SPANISH_STOPWORDS = new Set([
  'de',
  'del',
  'la',
  'el',
  'los',
  'las',
  'y',
  'e',
  'en',
  'con',
  'por',
  'para',
  'al',
  'un',
  'una',
  'unos',
  'unas',
]);

/**
 * Normaliza un texto eliminando tildes/diacríticos, pasando a minúsculas
 * y convirtiendo separadores comunes en espacios.
 */
export function normalizeSearchText(str: string): string {
  return (str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[-_/.,:;!?()[\]{}'"]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenMatchesText(token: string, text: string, words: string[], allowCompact: boolean): boolean {
  if (!token || !text) return false;

  const cleanToken = token.startsWith('#') ? token.slice(1) : token;
  if (text.includes(token) || (cleanToken && text.includes(cleanToken))) {
    return true;
  }

  // Tolerancia básica singular/plural en español (ej: "cascos" -> "casco", "dragones" -> "dragon")
  if (token.length >= 5) {
    if (token.endsWith('es')) {
      const stemEs = token.slice(0, -2);
      if (stemEs.length >= 4 && words.some((w) => w.startsWith(stemEs))) {
        return true;
      }
    }
    if (token.endsWith('s')) {
      const stemS = token.slice(0, -1);
      if (stemS.length >= 4 && words.some((w) => w.startsWith(stemS))) {
        return true;
      }
    }
  }

  // Coincidencia sin espacios (ej: "spiderman" <-> "Spider Man" o "starwars" <-> "Star Wars")
  if (allowCompact && token.length >= 5) {
    if (text.replace(/\s+/g, '').includes(token)) {
      return true;
    }
  }

  return false;
}

/**
 * Calcula la puntuación de relevancia de un producto frente a una consulta de búsqueda.
 * Retorna 0 si no coincide, o > 0 si coincide (a mayor valor, mayor relevancia).
 * Soporta búsquedas multi-término combinando título, categoría/subcategorías, palabras clave,
 * identificador numérico, diseñador y descripción (ej: "casco star wars" o "casco de star wars").
 */
export function getProductSearchScore(
  product: Product,
  query: string,
  categoryNames: string = '',
  designerName: string = ''
): number {
  const rawTrimmed = (query || '').trim();
  if (!rawTrimmed) return 1;

  const normQuery = normalizeSearchText(rawTrimmed);

  const titleNorm = normalizeSearchText(product.title || '');
  const numericIdRaw = normalizeSearchText(product.numericId || '');
  const numericIdPlain = numericIdRaw.replace(/#/g, '');
  const categoryNorm = normalizeSearchText(
    categoryNames || (product.franchiseId || '').replace(/[-_]/g, ' ')
  );

  const kws = product.searchKeywords || product.keywords;
  const keywordsJoined = Array.isArray(kws)
    ? kws.filter((k) => typeof k === 'string').join(' ')
    : typeof kws === 'string'
      ? kws
      : '';
  const keywordsNorm = normalizeSearchText(keywordsJoined);
  const designerNorm = normalizeSearchText(designerName || '');
  const descNorm = normalizeSearchText(product.description || '');

  const primaryText = [titleNorm, numericIdRaw, numericIdPlain, categoryNorm, keywordsNorm, designerNorm]
    .filter(Boolean)
    .join(' ');
  const fullText = [primaryText, descNorm].filter(Boolean).join(' ');

  if (!normQuery) {
    const rawLower = rawTrimmed.toLowerCase();
    return (product.title || '').toLowerCase().includes(rawLower) ||
      (product.numericId || '').toLowerCase().includes(rawLower)
      ? 1
      : 0;
  }

  const allTokens = normQuery.split(' ').filter(Boolean);
  const meaningfulTokens = allTokens.filter((t) => !SPANISH_STOPWORDS.has(t));
  const tokens = meaningfulTokens.length > 0 ? meaningfulTokens : allTokens;

  if (tokens.length === 0) return 0;

  const fullWords = fullText.split(' ').filter(Boolean);
  const allowCompactToken = tokens.length === 1;

  const allTokensMatchFull = tokens.every((t) =>
    tokenMatchesText(t, fullText, fullWords, allowCompactToken)
  );

  const collapsedQuery = tokens.join('');
  const collapsedFullMatch =
    collapsedQuery.length >= 4 && fullText.replace(/\s+/g, '').includes(collapsedQuery);

  if (!allTokensMatchFull && !collapsedFullMatch) {
    return 0;
  }

  // Calcular puntaje de relevancia para priorizar coincidencias directas en título y categoría
  let score = 1;
  const primaryWords = primaryText.split(' ').filter(Boolean);
  const allTokensMatchPrimary =
    tokens.every((t) => tokenMatchesText(t, primaryText, primaryWords, allowCompactToken)) ||
    (collapsedQuery.length >= 4 && primaryText.replace(/\s+/g, '').includes(collapsedQuery));

  if (allTokensMatchPrimary) score += 15;
  if (titleNorm.includes(normQuery)) score += 20;

  const titleWords = titleNorm.split(' ').filter(Boolean);
  const catWords = categoryNorm.split(' ').filter(Boolean);
  const titleHits = tokens.filter((t) => tokenMatchesText(t, titleNorm, titleWords, allowCompactToken)).length;
  const catHits = tokens.filter((t) => tokenMatchesText(t, categoryNorm, catWords, allowCompactToken)).length;

  if (titleHits > 0 && catHits > 0) score += 12;
  score += titleHits * 3 + catHits * 2;

  if (
    numericIdRaw &&
    (numericIdRaw === normQuery || numericIdPlain === normQuery.replace(/#/g, ''))
  ) {
    score += 25;
  }

  return score;
}

export function matchesProductSearch(
  product: Product,
  query: string,
  categoryNames: string = '',
  designerName: string = ''
): boolean {
  return getProductSearchScore(product, query, categoryNames, designerName) > 0;
}
