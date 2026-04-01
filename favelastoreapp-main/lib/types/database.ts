export interface Category {
  id: string;
  parent_id: string | null;
  name: string;
  slug: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  category_id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number | null;
  size: string | null; // Camisa: S, M, L, XL, XXL, Feminina, Infantil
  sizes: string[] | null; // legado
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface ProductImage {
  id: string;
  product_id: string;
  storage_path: string;
  url: string | null;
  sort_order: number;
  created_at: string;
}

export interface ProductWithImages extends Product {
  product_images: ProductImage[];
  categories?: Category;
}

export interface CategoryWithProducts extends Category {
  products?: ProductWithImages[];
}
