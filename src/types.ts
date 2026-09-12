export interface Product {
  id: string;
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
}

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
