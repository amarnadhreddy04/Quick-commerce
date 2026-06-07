import { Platform } from 'react-native';

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
  walletBalance: number;
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

  const response = await fetch(`${API_URL}${path}`, {
    method: options.method ?? 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error ?? 'Request failed');
  }

  return data as T;
}

export function loginRequest(email: string, password: string) {
  return apiRequest<{ token: string; user: ApiUser }>('/auth/login', {
    method: 'POST',
    body: { email, password },
  });
}

export function registerRequest(payload: {
  name: string;
  email: string;
  phone?: string;
  password: string;
  location?: string;
}) {
  return apiRequest<{ token: string; user: ApiUser }>('/auth/register', {
    method: 'POST',
    body: payload,
  });
}

export function meRequest(token: string) {
  return apiRequest<{ user: ApiUser }>('/auth/me', { token });
}
