import { Platform } from 'react-native';

import type { Category, Order, Product, PromoBanner, SubCategory } from '@/types';

const DEFAULT_URL =
  Platform.OS === 'android' ? 'http://10.0.2.2:3001/api' : 'http://localhost:3001/api';

export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? DEFAULT_URL;

export type ApiUser = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: 'customer' | 'admin';
  location?: string;
  pincode?: string | null;
  walletBalance: number;
};

export type AppSettings = {
  deliveryCutoff: string;
  deliverySlot: string;
  minOrderValue: number;
  deliveryFee: number;
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
    throw new Error(data.error ?? `Request failed (${response.status})`);
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

export function fetchCategories() {
  return apiRequest<{ categories: Category[] }>('/catalog/categories');
}

export function fetchSubCategories(categoryId?: string) {
  const query = categoryId ? `?categoryId=${categoryId}` : '';
  return apiRequest<{ subCategories: SubCategory[] }>(`/catalog/sub-categories${query}`);
}

export function fetchBanners(categoryId?: string) {
  const query = categoryId ? `?categoryId=${categoryId}` : '';
  return apiRequest<{ banners: PromoBanner[] }>(`/catalog/banners${query}`);
}

export function fetchProducts(params?: { categoryId?: string; activeOnly?: boolean }) {
  const search = new URLSearchParams();
  if (params?.categoryId) search.set('categoryId', params.categoryId);
  if (params?.activeOnly) search.set('activeOnly', 'true');
  const query = search.toString() ? `?${search}` : '';
  return apiRequest<{ products: Product[] }>(`/catalog/products${query}`);
}

export function fetchSettings() {
  return apiRequest<{ settings: AppSettings }>('/settings');
}

export function fetchOrders(token: string) {
  return apiRequest<{ orders: Order[] }>('/orders', { token });
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
