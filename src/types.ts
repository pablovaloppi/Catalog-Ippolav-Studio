export interface Product {
  id: string;
  numericId?: string;
  title: string;
  franchiseId: string;
  designerId?: string;
  status: 'disponible' | 'consultar' | 'proximamente';
  imageUrls?: string[];
  finish: string;
  scale: string[];
  material: string;
  description?: string;
  badge?: string;
  whatsappMessage?: string;
  searchKeywords?: string[];
  keywords?: string[];
  order?: number;
  likesCount?: number;
  selectedInRandomDraw?: boolean;
  selectedInRandomDrawAt?: any;
  createdAt?: any;
  updatedAt?: any;
}

export type SortOption = 'default' | 'likes-desc' | 'recent' | 'oldest' | 'name-asc' | 'name-desc' | 'finish';

export interface Category {
  id: string;
  name: string;
  icon: string;
  parentId?: string;
  order?: number;
}

export interface Designer {
  id: string;
  name: string;
  order?: number;
}

export interface InstallmentPlan {
  id: string;
  installments: number; // Cantidad de cuotas (ej: 3, 6, 12)
  increaseRate: number; // Tasa / Coeficiente de aumento (ej: 0.1588457 para 3 cuotas)
  paymentFeeRate?: number; // Costo por cobro (ej: 0.0926075)
  label?: string; // Nombre visible opcional (ej: "3 Cuotas")
}

export interface SiteConfig {
  whatsapp: string;
  instagram: string;
  facebook: string;
  youtube: string;
  whatsappMessageTemplate: string;
  adminQuoteMessageTemplate?: string; // Plantilla de cotizador que copia el administrador
  searchWhatsAppMessageTemplate?: string;
  cloudinaryCloudName?: string;
  cloudinaryUploadPreset?: string;
  metaPixelId?: string;
  googleAnalyticsId?: string;
  installmentPlans?: InstallmentPlan[];
  defaultPaymentFeeRate?: number; // Costo por cobro general por defecto (ej: 0.0926075)
}

export interface TelegramGroup {
  id: string;
  name: string;
  lastUpdatedAt?: any;
  createdAt?: any;
  order?: number;
}

