export type Category = {
  id: string;
  name: string;
  icon: string;
  color: string;
  thumbnail?: string;
  description?: string;
  pincodes?: string[];
  allLocations?: boolean;
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
  images?: string[];
  description?: string;
  subscription?: boolean;
  tag?: string;
  stock: number;
  active: boolean;
  pincodes?: string[];
  allLocations?: boolean;
};

export type ServicePincode = {
  pincode: string;
  label: string;
  active: boolean;
};

export type OrderStatus = 'delivered' | 'scheduled' | 'cancelled' | 'processing' | 'pending_payment';

export type OrderLineItem = {
  productId: string;
  productName: string;
  brand: string;
  unit: string;
  image: string;
  quantity: number;
  price: number;
  lineTotal: number;
};

export type Order = {
  id: string;
  customerId: string;
  customerName: string;
  date: string;
  status: OrderStatus;
  items: number;
  total: number;
  deliverySlot: string;
  paymentStatus?: string;
  paymentMethod?: string | null;
};

export type OrderDetail = Order & {
  customerEmail?: string | null;
  customerPhone?: string | null;
  customerLocation?: string | null;
  customerPincode?: string | null;
  lineItems: OrderLineItem[];
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
  walletEnabled: boolean;
};

export type ServiceArea = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radiusKm: number;
  active: boolean;
  createdAt?: string;
};
