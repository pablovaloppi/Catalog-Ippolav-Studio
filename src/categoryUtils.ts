import { Category } from './types';

/**
 * Obtiene todos los ancestros de una categoría ordenados desde la raíz hasta el padre directo.
 * Protegido contra ciclos para evitar bucles infinitos.
 */
export function getCategoryAncestors(categoryId: string | undefined | null, categories: Category[]): Category[] {
  if (!categoryId) return [];
  const ancestors: Category[] = [];
  const visited = new Set<string>([categoryId]);
  let current = categories.find(c => c.id === categoryId);

  while (current && current.parentId && !visited.has(current.parentId)) {
    visited.add(current.parentId);
    const parent = categories.find(c => c.id === current!.parentId);
    if (parent) {
      ancestors.unshift(parent);
      current = parent;
    } else {
      break;
    }
  }
  return ancestors;
}

/**
 * Obtiene la ruta completa (breadcrumb) de nombres de una categoría, e.g. "Anime & Manga > Dragon Ball > Saiyajin".
 */
export function getCategoryBreadcrumb(categoryId: string | undefined | null, categories: Category[]): string {
  if (!categoryId) return '';
  const cat = categories.find(c => c.id === categoryId);
  if (!cat) return categoryId;
  const ancestors = getCategoryAncestors(categoryId, categories);
  if (ancestors.length === 0) return cat.name;
  return [...ancestors.map(a => a.name), cat.name].join(' > ');
}

/**
 * Etiqueta formateada para selectores y filtros:
 * Muestra el nombre principal y entre paréntesis toda la línea ascendente, e.g. "Goku (Anime > Dragon Ball)".
 * Si es categoría principal, solo devuelve el nombre: "Marvel".
 */
export function getCategoryHierarchyLabel(cat: Category, categories: Category[]): string {
  const ancestors = getCategoryAncestors(cat.id, categories);
  if (ancestors.length === 0) return cat.name;
  return `${cat.name} (${ancestors.map(a => a.name).join(' > ')})`;
}

/**
 * Calcula la profundidad/nivel de una categoría (0 = categoría principal, 1 = hija, 2 = nieta / hija de hija, etc.).
 */
export function getCategoryDepth(categoryId: string | undefined | null, categories: Category[]): number {
  if (!categoryId) return 0;
  return getCategoryAncestors(categoryId, categories).length;
}

/**
 * Obtiene los IDs de TODOS los descendientes de una categoría (hijas directas, nietas, bisnietas, etc.).
 */
export function getAllDescendantCategoryIds(categoryId: string, categories: Category[]): string[] {
  const descendants: string[] = [];
  const queue = [categoryId];
  const visited = new Set<string>([categoryId]);

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    for (const cat of categories) {
      if (cat.parentId === currentId && !visited.has(cat.id)) {
        visited.add(cat.id);
        descendants.push(cat.id);
        queue.push(cat.id);
      }
    }
  }
  return descendants;
}

/**
 * Retorna las categorías ordenadas jerárquicamente en árbol:
 * Las categorías raíz primero, y debajo de cada una sus hijas, nietas, etc.
 */
export function getHierarchicalCategories(categories: Category[]): { category: Category; depth: number }[] {
  const result: { category: Category; depth: number }[] = [];
  const visited = new Set<string>();

  function traverse(parentId: string | undefined, currentDepth: number) {
    const children = categories
      .filter(c => (parentId ? c.parentId === parentId : !c.parentId))
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    for (const child of children) {
      if (visited.has(child.id)) continue;
      visited.add(child.id);
      result.push({ category: child, depth: currentDepth });
      traverse(child.id, currentDepth + 1);
    }
  }

  // Recorrer desde las raíces
  traverse(undefined, 0);

  // Incluir categorías huérfanas si existiesen
  for (const cat of categories) {
    if (!visited.has(cat.id)) {
      visited.add(cat.id);
      result.push({ category: cat, depth: getCategoryDepth(cat.id, categories) });
    }
  }

  return result;
}
