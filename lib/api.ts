import { Platform } from 'react-native';

import type {
  Category,
  DeliveryAddress,
  Order,
  OrderDetail,
  Product,
  PromoBanner,
  SubCategory,
} from '@/types';

const DEFAULT_URL =
  Platform.OS === 'android' ? 'http://10.0.2.2:3001/api' : 'http://localhost:3001/api';

export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? DEFAULT_URL;

export type ApiUser = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: 'customer' | 'admin' | 'rider';
  location?: string;
  pincode?: string | null;
  riderId?: string | null;
  walletBalance: number;
  referralCode?: string | null;
  referredByUserId?: string | null;
  referredByName?: string | null;
  referralsCount?: number;
};

export type RiderProfile = {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  vehicleType: string;
  pincode: string;
  active: boolean;
  deliveriesCount: number;
  deliveredOrders?: number;
};

export type RiderDelivery = {
  id: string;
  customerName: string;
  customerPhone?: string | null;
  date: string;
  status: string;
  items: number;
  total: number;
  deliverySlot: string;
  riderStatus?: string | null;
  customerPincode?: string | null;
  deliveryAddress?: {
    label: string;
    line1: string;
    line2?: string | null;
    pincode?: string | null;
    fullAddress: string;
  };
};

export type RiderDeliveryDetail = RiderDelivery & {
  customerPhone?: string | null;
  lineItems: OrderLineItem[];
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

export type ReferralStats = {
  code: string;
  referralsCount: number;
  totalEarned: number;
  rewardPerReferral: number;
  referralEnabled: boolean;
  recentReferrals: {
    id: string;
    refereeName: string;
    rewardAmount: number;
    status: string;
    createdAt: string;
  }[];
};

type RequestOptions = {
  method?: string;
  body?: unknown;
  token?: string | null;
};

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method: options.method ?? 'GET',
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    throw new Error(
      `Cannot reach API server at ${API_URL}. Start it with "npm run server" and use your computer IP on a physical device.`
    );
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const detail = data.error ?? `Request failed (${response.status})`;
    if (response.status === 404 && path.includes('/auth/addresses')) {
      throw new Error(
        `${detail}. Restart the API with "npm run server:restart" so address routes are loaded.`
      );
    }
    throw new Error(detail);
  }

  return data as T;
}

export function loginRequest(email: string, password: string) {
  return apiRequest<{ token: string; user: ApiUser }>('/auth/login', {
    method: 'POST',
    body: { email, password },
  });
}

export type RegisterNotifications = {
  emailSent: boolean;
  smsSent: boolean;
  emailPreviewUrl?: string | null;
  smsDevMode?: boolean;
};

export function registerRequest(payload: {
  name: string;
  email: string;
  phone: string;
  password: string;
  location?: string;
  pincode: string;
  acceptedTerms: boolean;
  termsVersion?: string;
  referralCode?: string;
}) {
  return apiRequest<{ token: string; user: ApiUser; notifications: RegisterNotifications }>(
    '/auth/register',
    {
      method: 'POST',
      body: payload,
    }
  );
}

export function meRequest(token: string) {
  return apiRequest<{ user: ApiUser }>('/auth/me', { token });
}

export function fetchAddresses(token: string) {
  return apiRequest<{ addresses: DeliveryAddress[] }>('/auth/addresses', { token });
}

export function createAddress(
  token: string,
  payload: {
    label: string;
    line1: string;
    line2?: string;
    pincode: string;
    isDefault?: boolean;
  }
) {
  return apiRequest<{ address: DeliveryAddress }>('/auth/addresses', {
    method: 'POST',
    token,
    body: payload,
  });
}

export function updateAddress(
  token: string,
  addressId: string,
  payload: {
    label?: string;
    line1?: string;
    line2?: string;
    pincode?: string;
  }
) {
  return apiRequest<{ address: DeliveryAddress }>(
    `/auth/addresses/${encodeURIComponent(addressId)}`,
    { method: 'PUT', token, body: payload }
  );
}

export function deleteAddress(token: string, addressId: string) {
  return apiRequest<{ success: boolean }>(
    `/auth/addresses/${encodeURIComponent(addressId)}`,
    { method: 'DELETE', token }
  );
}

export function activateAddress(token: string, addressId: string) {
  return apiRequest<{ address: DeliveryAddress }>(
    `/auth/addresses/${encodeURIComponent(addressId)}/activate`,
    { method: 'POST', token }
  );
}

export function fetchCategories(pincode?: string | null) {
  const query = pincode ? `?pincode=${encodeURIComponent(pincode)}` : '';
  return apiRequest<{ categories: Category[] }>(`/catalog/categories${query}`);
}

export function fetchSubCategories(categoryId?: string) {
  const query = categoryId ? `?categoryId=${categoryId}` : '';
  return apiRequest<{ subCategories: SubCategory[] }>(`/catalog/sub-categories${query}`);
}

export function fetchBanners(categoryId?: string) {
  const query = categoryId ? `?categoryId=${categoryId}` : '';
  return apiRequest<{ banners: PromoBanner[] }>(`/catalog/banners${query}`);
}

export function fetchStockNotifyStatus(token: string, productId: string) {
  return apiRequest<{ subscribed: boolean }>(
    `/catalog/products/${encodeURIComponent(productId)}/stock-notify`,
    { token }
  );
}

export function subscribeStockNotify(token: string, productId: string) {
  return apiRequest<{ subscribed: boolean; alreadySubscribed?: boolean }>(
    `/catalog/products/${encodeURIComponent(productId)}/stock-notify`,
    { method: 'POST', token }
  );
}

export function unsubscribeStockNotify(token: string, productId: string) {
  return apiRequest<{ subscribed: boolean }>(
    `/catalog/products/${encodeURIComponent(productId)}/stock-notify`,
    { method: 'DELETE', token }
  );
}

export function fetchProducts(params?: {
  categoryId?: string;
  activeOnly?: boolean;
  pincode?: string | null;
}) {
  const search = new URLSearchParams();
  if (params?.categoryId) search.set('categoryId', params.categoryId);
  if (params?.activeOnly) search.set('activeOnly', 'true');
  if (params?.pincode) search.set('pincode', params.pincode);
  const query = search.toString() ? `?${search}` : '';
  return apiRequest<{ products: Product[] }>(`/catalog/products${query}`);
}

export function fetchSettings() {
  return apiRequest<{ settings: AppSettings }>('/settings');
}

export function fetchReferralStats(token: string) {
  return apiRequest<{ referral: ReferralStats }>('/users/referral', { token });
}

export type PromoValidation = {
  valid: true;
  code: string;
  discount: number;
};

export function validatePromoCode(token: string, code: string, subtotal: number) {
  return apiRequest<PromoValidation>('/promocodes/validate', {
    method: 'POST',
    token,
    body: { code, subtotal },
  });
}

export function fetchOrders(token: string) {
  return apiRequest<{ orders: Order[] }>('/orders', { token });
}

export function fetchRiderQueue(token: string) {
  return apiRequest<{ orders: RiderDelivery[] }>('/orders/rider-queue', { token });
}

export function fetchRiderHistory(token: string) {
  return apiRequest<{ orders: RiderDelivery[] }>('/orders/rider-history', { token });
}

export function fetchRiderProfile(token: string) {
  return apiRequest<{ rider: RiderProfile }>('/riders/me', { token });
}

export function updateRiderDeliveryStatus(
  token: string,
  orderId: string,
  status: 'out_for_delivery' | 'delivered'
) {
  return apiRequest<{ order: RiderDeliveryDetail }>(`/orders/${encodeURIComponent(orderId)}/rider-status`, {
    method: 'PATCH',
    token,
    body: { status },
  });
}

export async function fetchOrder(id: string, token: string) {
  const encodedId = encodeURIComponent(id);

  try {
    return await apiRequest<{ order: OrderDetail }>(`/orders?id=${encodedId}`, { token });
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (!message.includes('404')) {
      throw error;
    }
    return apiRequest<{ order: OrderDetail }>(`/orders/${encodedId}`, { token });
  }
}

export type SyncState = {
  catalog: number;
  orders: number;
  settings: number;
  users: number;
  areas: number;
};

export type DeliveryCheck = {
  available: boolean;
  message?: string;
  pincode?: string;
  label?: string;
  allowedPincodes?: { pincode: string; label: string }[];
  area?: {
    id: string;
    name: string;
    radiusKm: number;
    distanceKm: number;
  };
  nearestArea?: {
    name: string;
    radiusKm: number;
    distanceKm: number;
  };
  areasConfigured?: boolean;
};

export async function checkDeliveryPincode(pincode: string): Promise<DeliveryCheck> {
  const { checkPincodeLocally } = await import('@/lib/deliveryPincodes');
  try {
    return await apiRequest<DeliveryCheck>(`/areas/check-pincode?pincode=${pincode}`);
  } catch {
    return checkPincodeLocally(pincode);
  }
}

export function checkDeliveryArea(lat: number, lng: number) {
  return apiRequest<DeliveryCheck>(`/areas/check?lat=${lat}&lng=${lng}`);
}

export function fetchSyncState() {
  return apiRequest<{ state: SyncState }>('/sync/state');
}
