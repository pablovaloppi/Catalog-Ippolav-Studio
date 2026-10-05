import { InstallmentPlan } from './types';

/**
 * Utilidades para procesar plantillas de mensajes de WhatsApp y cotizaciones automáticas
 * basadas en reglas de cuotas, aumentos y costos de cobro configurables.
 */

export const DEFAULT_PAYMENT_FEE_RATE = 0.0926075; // 9.26075% de costo por cobro

export const DEFAULT_USER_INQUIRY_TEMPLATE = 
`Hola IPPOLAV STUDIO, me interesa encargar la figura {figura} ({codigo}). ¿Tienen disponibilidad?\n\nVer figura: {link}`;

export const DEFAULT_ADMIN_QUOTE_TEMPLATE = 
`Hola! Te paso el presupuesto para la figura {figura} ({codigo}):\n\n` +
`• Precio Final (Contado/Transferencia): {precio final}\n` +
`• En {cuotas} cuotas de {valorCuota} (Total financiado: {precio final en cuotas})\n\n` +
`Ver figura: {link}`;

export const DEFAULT_INSTALLMENT_PLANS: InstallmentPlan[] = [
  {
    id: 'plan-3',
    installments: 3,
    increaseRate: 0.1588457,
    paymentFeeRate: DEFAULT_PAYMENT_FEE_RATE,
    label: '3 Cuotas',
  },
  {
    id: 'plan-6',
    installments: 6,
    increaseRate: 0.285412,
    paymentFeeRate: DEFAULT_PAYMENT_FEE_RATE,
    label: '6 Cuotas',
  },
  {
    id: 'plan-12',
    installments: 12,
    increaseRate: 0.54218,
    paymentFeeRate: DEFAULT_PAYMENT_FEE_RATE,
    label: '12 Cuotas',
  },
];

export interface PricingQuoteValues {
  precioFinal?: string | number;
  precioFinalCuotas?: string | number;
  cuotas?: string | number;
  valorCuota?: string | number;
}

/**
 * Limpia y parsea un valor numérico a partir de cadenas con símbolos de moneda o separadores.
 * Ejemplo: "$60.000" -> 60000, "45.500,50" -> 45500.5, 3 -> 3
 */
export function parseNumericValue(val: string | number | undefined | null): number {
  if (val === undefined || val === null) return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  
  const str = String(val).trim();
  if (!str) return 0;

  // Eliminar signos de moneda y espacios
  let clean = str.replace(/[$€ARS\s]/gi, '');

  // Detectar formato con punto como miles y coma como decimal (ej: 60.000,50)
  if (clean.includes('.') && clean.includes(',')) {
    clean = clean.replace(/\./g, '').replace(',', '.');
  } else if (clean.includes('.') && !clean.includes(',')) {
    // Si tiene un punto y exactamente 3 dígitos al final (ej: 45.000 o 1.200.000), tratarlo como separador de miles
    const parts = clean.split('.');
    if (parts.length > 1 && parts.every((p, idx) => idx === 0 || p.length === 3)) {
      clean = clean.replace(/\./g, '');
    }
  } else if (clean.includes(',') && !clean.includes('.')) {
    // Si tiene coma y no punto, ej: 45,50 o 45,000
    const parts = clean.split(',');
    if (parts.length === 2 && parts[1].length === 3) {
      clean = clean.replace(/,/g, '');
    } else {
      clean = clean.replace(',', '.');
    }
  }

  const num = parseFloat(clean);
  return isNaN(num) ? 0 : num;
}

/**
 * Formatea un número como moneda local (ej: $45.000 o $45.000,50).
 */
export function formatCurrencyValue(num: number): string {
  if (isNaN(num) || !isFinite(num)) return '$0';
  const isInteger = Math.abs(num - Math.round(num)) < 0.001;
  const formatted = num.toLocaleString('es-AR', {
    minimumFractionDigits: isInteger ? 0 : 2,
    maximumFractionDigits: 2,
  });
  return `$${formatted}`;
}

/**
 * Calcula la cotización completa de una figura en base a:
 * {precio final en cuotas} = {precio final} + ({precio final} * aumento) + ({precio final} * costoCobro)
 * {valorCuota} = {precio final en cuotas} / cuotas
 */
export function calculateInstallmentQuote({
  precioFinalRaw,
  installments,
  plans,
  defaultFeeRate = DEFAULT_PAYMENT_FEE_RATE,
}: {
  precioFinalRaw: string | number;
  installments: number;
  plans?: InstallmentPlan[];
  defaultFeeRate?: number;
}) {
  const precioFinalNum = parseNumericValue(precioFinalRaw);
  const activePlans = (plans && plans.length > 0) ? plans : DEFAULT_INSTALLMENT_PLANS;
  
  // Buscar el plan correspondiente a la cantidad de cuotas seleccionada
  const matchingPlan = activePlans.find((p) => Number(p.installments) === Number(installments)) || activePlans[0] || {
    id: 'default',
    installments: installments || 1,
    increaseRate: 0,
    paymentFeeRate: defaultFeeRate,
  };

  const actualInstallments = Number(matchingPlan.installments) || installments || 1;
  const increaseRate = typeof matchingPlan.increaseRate === 'number' ? matchingPlan.increaseRate : 0;
  const paymentFeeRate = typeof matchingPlan.paymentFeeRate === 'number' ? matchingPlan.paymentFeeRate : defaultFeeRate;

  if (precioFinalNum <= 0) {
    return {
      precioFinalNum: 0,
      precioFinalFormatted: '',
      precioFinalCuotasNum: 0,
      precioFinalCuotasFormatted: '',
      valorCuotaNum: 0,
      valorCuotaFormatted: '',
      aumentoMontoNum: 0,
      costoCobroMontoNum: 0,
      installments: actualInstallments,
      increaseRate,
      paymentFeeRate,
      plan: matchingPlan,
    };
  }

  // Fórmula solicitada:
  // aumento = {precio final} * increaseRate
  // costoCobro = {precio final} * paymentFeeRate
  // {precio final en cuotas} = {precio final} + aumento + costoCobro
  const aumentoMontoNum = precioFinalNum * increaseRate;
  const costoCobroMontoNum = precioFinalNum * paymentFeeRate;
  const precioFinalCuotasNum = precioFinalNum + aumentoMontoNum + costoCobroMontoNum;
  const valorCuotaNum = actualInstallments > 0 ? (precioFinalCuotasNum / actualInstallments) : precioFinalCuotasNum;

  return {
    precioFinalNum,
    precioFinalFormatted: formatCurrencyValue(precioFinalNum),
    precioFinalCuotasNum,
    precioFinalCuotasFormatted: formatCurrencyValue(precioFinalCuotasNum),
    valorCuotaNum,
    valorCuotaFormatted: formatCurrencyValue(valorCuotaNum),
    aumentoMontoNum,
    costoCobroMontoNum,
    installments: actualInstallments,
    increaseRate,
    paymentFeeRate,
    plan: matchingPlan,
  };
}

/**
 * Procesa la plantilla de WhatsApp sustituyendo todas las etiquetas dinámicas,
 * de producto, cotización automática y {valorCuota}.
 */
export function processWhatsAppTemplate({
  template,
  productTitle,
  productCode,
  figureLink,
  pricing = {},
  isQuoting = false,
}: {
  template?: string;
  productTitle: string;
  productCode?: string;
  figureLink: string;
  pricing?: PricingQuoteValues;
  isQuoting?: boolean;
}): string {
  const rawTemplate = template?.trim() || '';

  // Si no hay plantilla base, proveer una plantilla con cotizador cuando aplique
  let text = rawTemplate;
  if (!text) {
    text = isQuoting ? DEFAULT_ADMIN_QUOTE_TEMPLATE : DEFAULT_USER_INQUIRY_TEMPLATE;
  }

  // 1. Reemplazos de datos básicos de la figura
  text = text
    .replace(/\{figura\}/gi, productTitle || '')
    .replace(/\{titulo\}/gi, productTitle || '')
    .replace(/\{codigo\}/gi, productCode || '')
    .replace(/\{code\}/gi, productCode || '');

  // 2. Reemplazos de Enlace / Link
  if (/\{link\}|\{enlace\}|\{url\}/i.test(text)) {
    text = text
      .replace(/\{link\}/gi, figureLink)
      .replace(/\{enlace\}/gi, figureLink)
      .replace(/\{url\}/gi, figureLink);
  } else {
    text = `${text}\n\nVer figura: ${figureLink}`;
  }

  // 3. Procesamiento de Cotización de Precios
  const precioFinalNum = parseNumericValue(pricing.precioFinal);
  const precioFinalCuotasNum = parseNumericValue(pricing.precioFinalCuotas);
  const valorCuotaNum = parseNumericValue(pricing.valorCuota);
  const cuotasVal = pricing.cuotas ? String(pricing.cuotas).trim() : '3';

  const precioFinalFormatted = precioFinalNum > 0 ? formatCurrencyValue(precioFinalNum) : (pricing.precioFinal ? String(pricing.precioFinal).trim() : '');
  const precioFinalCuotasFormatted = precioFinalCuotasNum > 0 ? formatCurrencyValue(precioFinalCuotasNum) : (pricing.precioFinalCuotas ? String(pricing.precioFinalCuotas).trim() : '');
  const valorCuotaFormatted = valorCuotaNum > 0 ? formatCurrencyValue(valorCuotaNum) : (pricing.valorCuota ? String(pricing.valorCuota).trim() : '');

  // 4. Reemplazo de etiquetas de cotización y {valorCuota}
  text = text.replace(/\{([^{}]+)\}/g, (match, expression: string) => {
    const exprLower = expression.trim().toLowerCase();

    if (exprLower === 'precio final' || exprLower === 'precio_final' || exprLower === 'precio') {
      return precioFinalFormatted || (isQuoting ? '$0' : '{precio final}');
    }
    if (exprLower === 'precio final en cuotas' || exprLower === 'precio_final_en_cuotas') {
      return precioFinalCuotasFormatted || (isQuoting ? '$0' : '{precio final en cuotas}');
    }
    if (exprLower === 'cuotas') {
      return cuotasVal || (isQuoting ? '1' : '{cuotas}');
    }
    if (exprLower === 'valorcuota' || exprLower === 'valor cuota' || exprLower === 'valor_cuota' || exprLower === 'cuota') {
      return valorCuotaFormatted || (isQuoting ? '$0' : '{valorCuota}');
    }

    // Compatibilidad hacia atrás si la plantilla aún contenía {precio final en cuotas}/{cuotas}
    if (exprLower === 'precio final en cuotas/cuotas' || exprLower === 'precio final en cuotas / cuotas' || exprLower === 'precio final en cuotas}/{cuotas') {
      return valorCuotaFormatted || (isQuoting ? '$0' : '{valorCuota}');
    }

    return match;
  });

  return text;
}
