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
  order?: number;
  likesCount?: number;
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

export interface SiteConfig {
  whatsapp: string;
  instagram: string;
  facebook: string;
  youtube: string;
  whatsappMessageTemplate: string;
}
