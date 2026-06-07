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
  stock: number;
  active: boolean;
};

export type OrderStatus = 'delivered' | 'scheduled' | 'cancelled' | 'processing';

export type Order = {
  id: string;
  customerId: string;
  customerName: string;
  date: string;
  status: OrderStatus;
  items: number;
  total: number;
  deliverySlot: string;
};

export type Customer = {
  id: string;
  name: string;
  phone: string;
  location: string;
  walletBalance: number;
  ordersCount: number;
  active: boolean;
};

export type AppSettings = {
  deliveryCutoff: string;
  deliverySlot: string;
  minOrderValue: number;
  deliveryFee: number;
};
