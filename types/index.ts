export type Category = {
  id: string;
  name: string;
  icon: string;
  color: string;
  thumbnail: string;
};

export type SubCategory = {
  id: string;
  categoryId: string;
  name: string;
};

export type PromoBanner = {
  id: string;
  categoryId: string;
  title: string;
  subtitle: string;
  cta: string;
  emojis: string[];
  slide: number;
  total: number;
};

export type Product = {
  id: string;
  name: string;
  brand: string;
  categoryId: string;
  subCategoryId?: string;
  price: number;
  mrp?: number;
  unit: string;
  image: string;
  subscription?: boolean;
  tag?: string;
};

export type CartItem = {
  product: Product;
  quantity: number;
};

export type Order = {
  id: string;
  date: string;
  status: 'delivered' | 'scheduled' | 'cancelled' | 'pending_payment';
  items: number;
  total: number;
  deliverySlot: string;
};
