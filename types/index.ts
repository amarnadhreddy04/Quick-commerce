export type Category = {
  id: string;
  name: string;
  icon: string;
  color: string;
};

export type Product = {
  id: string;
  name: string;
  brand: string;
  categoryId: string;
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
  status: 'delivered' | 'scheduled' | 'cancelled';
  items: number;
  total: number;
  deliverySlot: string;
};
