export type DeliveryAddress = {
  id: string;
  label: string;
  line1: string;
  line2?: string | null;
  pincode: string;
  city: string;
  areaLabel: string;
  isDefault: boolean;
  fullAddress: string;
  createdAt?: string;
};

export type Category = {
  id: string;
  name: string;
  icon: string;
  color: string;
  thumbnail: string;
  description?: string;
  sortOrder?: number;
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
  images?: string[];
  description?: string;
  subscription?: boolean;
  tag?: string;
  stock?: number;
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

export type OrderDetail = Order & {
  paymentStatus?: string;
  paymentMethod?: string | null;
  lineItems: OrderLineItem[];
};
