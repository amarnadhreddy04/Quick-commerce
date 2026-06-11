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

export type StoreType = 'general' | 'vegetables' | 'milk_bread';

export type Product = {
  id: string;
  name: string;
  brand: string;
  categoryId: string;
  storeType?: StoreType | null;
  price: number;
  wholesalePrice?: number | null;
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
  wholesalePrice?: number | null;
  lineTotal: number;
  storeType?: StoreType | null;
  storeLabel?: string | null;
  vendorShopName?: string | null;
};

export type VendorTask = {
  id: string;
  wholesalerId: string;
  shopName: string | null;
  storeType: StoreType | null;
  storeLabel: string;
  status: 'assigned' | 'packed' | 'ready';
  wholesaleCost: number;
  itemCount: number;
};

export type PromoCode = {
  id: string;
  code: string;
  description: string;
  discountType: 'flat' | 'percent';
  discountValue: number;
  minOrderValue: number;
  maxDiscount?: number | null;
  usageLimit?: number | null;
  usedCount: number;
  expiresAt?: string | null;
  active: boolean;
  createdAt?: string;
};

export type Order = {
  id: string;
  customerId?: string;
  customerName: string;
  date: string;
  status: OrderStatus;
  items: number;
  total?: number;
  deliverySlot: string;
  promoCode?: string | null;
  promoDiscount?: number | null;
  paymentStatus?: string;
  paymentMethod?: string | null;
  vendorTaskId?: string;
  wholesalerId?: string | null;
  wholesalerName?: string | null;
  wholesalerShopName?: string | null;
  storeType?: StoreType | null;
  storeLabel?: string | null;
  wholesalerStatus?: 'assigned' | 'packed' | 'ready' | null;
  wholesaleCost?: number | null;
  riderId?: string | null;
  riderName?: string | null;
  riderPhone?: string | null;
  riderStatus?: 'assigned' | 'out_for_delivery' | 'delivered' | null;
  riderAssignedAt?: string | null;
  riderDeliveredAt?: string | null;
};

export type Rider = {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  vehicleType: string;
  pincode: string;
  active: boolean;
  deliveriesCount: number;
  deliveredOrders?: number;
  totalAssigned?: number;
  delivered?: number;
  activeDeliveries?: number;
};

export type Wholesaler = {
  id: string;
  name: string;
  shopName: string;
  storeType?: StoreType;
  phone: string;
  email?: string | null;
  address?: string | null;
  settlementCycle: 'weekly' | 'monthly';
  active: boolean;
  pincodes: { pincode: string; active: boolean }[];
};

export type OrderDetail = Order & {
  customerEmail?: string | null;
  customerPhone?: string | null;
  customerLocation?: string | null;
  customerPincode?: string | null;
  lineItems: OrderLineItem[];
  vendorTasks?: VendorTask[];
};

export type Customer = {
  id: string;
  name: string;
  phone: string;
  location: string;
  walletBalance: number;
  ordersCount: number;
  active: boolean;
  referralCode?: string | null;
  referredByName?: string | null;
  referralsCount?: number;
};

export type AppSettings = {
  deliveryCutoff: string;
  deliverySlot: string;
  minOrderValue: number;
  deliveryFee: number;
  platformFeeEnabled: boolean;
  platformFee: number;
  walletEnabled: boolean;
  subscriptionEnabled: boolean;
  referralEnabled: boolean;
  referralRewardAmount: number;
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
