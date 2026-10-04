/**
 * Utilidades para el formateo y visualización de escalas de figuras coleccionables con sus medidas en centímetros.
 */

export function formatScale(scale: string): string {
  if (!scale || typeof scale !== 'string') return '';
  const trimmed = scale.trim();
  if (!trimmed) return '';

  // Si ya tiene dimensiones especificadas entre paréntesis (ej: "1:8 (20cm)"), no duplicar
  if (trimmed.includes('(') && trimmed.includes(')')) {
    return trimmed;
  }

  const normalized = trimmed.toLowerCase().replace(/\s+/g, '');
  
  if (normalized === '1:8' || normalized === '1/8') {
    return '1:8 (20cm)';
  }
  if (normalized === '1:6' || normalized === '1/6') {
    return '1:6 (30cm)';
  }
  if (normalized === '1:4' || normalized === '1/4') {
    return '1:4 (45cm)';
  }
  if (normalized === '1:2' || normalized === '1/2') {
    return '1:2 (90cm)';
  }
  if (normalized === '1:1' || normalized === '1/1') {
    return '1:1 (180cm)';
  }
  if (normalized === 'chibi') {
    return 'Chibi';
  }

  return trimmed;
}

export function formatScalesList(scales?: string[] | null): string {
  if (!scales || !Array.isArray(scales) || scales.length === 0) {
    return 'Consultar';
  }
  const formatted = scales
    .map(formatScale)
    .filter(Boolean)
    .join(', ');

  return formatted || 'Consultar';
}
