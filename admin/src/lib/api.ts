const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001/api';

let authToken: string | null = sessionStorage.getItem('milkbasket-admin-token');

export function setAuthToken(token: string | null) {
  authToken = token;
  if (token) {
    sessionStorage.setItem('milkbasket-admin-token', token);
  } else {
    sessionStorage.removeItem('milkbasket-admin-token');
  }
}

export function getAuthToken() {
  return authToken;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  const response = await fetch(`${API_URL}${path}`, { ...options, headers });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error ?? 'Request failed');
  }

  return data as T;
}

export const api = {
  login: (email: string, password: string) =>
    request<{ token: string; user: { role: string } }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  getCategories: () => request<{ categories: unknown[] }>('/catalog/categories'),
  getProducts: () => request<{ products: unknown[] }>('/catalog/products'),
  createProduct: (product: unknown) =>
    request('/catalog/products', { method: 'POST', body: JSON.stringify(product) }),
  updateProduct: (id: string, product: unknown) =>
    request(`/catalog/products/${id}`, { method: 'PUT', body: JSON.stringify(product) }),
  deleteProduct: (id: string) =>
    request(`/catalog/products/${id}`, { method: 'DELETE' }),
  createCategory: (category: unknown) =>
    request('/catalog/categories', { method: 'POST', body: JSON.stringify(category) }),
  deleteCategory: (id: string) =>
    request(`/catalog/categories/${id}`, { method: 'DELETE' }),
  getOrders: () => request<{ orders: unknown[] }>('/orders'),
  updateOrderStatus: (id: string, status: string) =>
    request(`/orders/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  getCustomers: () => request<{ customers: unknown[] }>('/users'),
  toggleCustomer: (id: string) =>
    request(`/users/${id}/toggle`, { method: 'PATCH' }),
  getSettings: () => request<{ settings: unknown }>('/settings'),
  updateSettings: (settings: unknown) =>
    request('/settings', { method: 'PUT', body: JSON.stringify(settings) }),
  getServiceAreas: () => request<{ areas: unknown[] }>('/areas'),
  createServiceArea: (area: unknown) =>
    request('/areas', { method: 'POST', body: JSON.stringify(area) }),
  updateServiceArea: (id: string, area: unknown) =>
    request(`/areas/${id}`, { method: 'PUT', body: JSON.stringify(area) }),
  deleteServiceArea: (id: string) =>
    request(`/areas/${id}`, { method: 'DELETE' }),
};
