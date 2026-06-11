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
    request<{ token: string; user: { role: string; name: string; adminPincode?: string | null; wholesalerId?: string | null } }>(
      '/auth/login',
      {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }
    ),
  getMe: () => request<{ user: { role: string; name: string; adminPincode?: string | null; wholesalerId?: string | null } }>('/auth/me'),
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
  updateCategory: (id: string, category: unknown) =>
    request(`/catalog/categories/${id}`, { method: 'PUT', body: JSON.stringify(category) }),
  deleteCategory: (id: string) =>
    request(`/catalog/categories/${id}`, { method: 'DELETE' }),
  getOrders: () => request<{ orders: unknown[] }>('/orders'),
  getOrder: (id: string) => request<{ order: unknown }>(`/orders/${id}`),
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
  getPincodes: () => request<{ pincodes: unknown[] }>('/areas/pincodes'),
  createPincode: (payload: { pincode: string; label: string }) =>
    request('/areas/pincodes', { method: 'POST', body: JSON.stringify(payload) }),
  updatePincode: (pincode: string, payload: { label: string; active?: boolean }) =>
    request(`/areas/pincodes/${pincode}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deletePincode: (pincode: string) =>
    request(`/areas/pincodes/${pincode}`, { method: 'DELETE' }),
  getWholesalers: () => request<{ wholesalers: unknown[] }>('/wholesalers'),
  createWholesaler: (payload: unknown) =>
    request('/wholesalers', { method: 'POST', body: JSON.stringify(payload) }),
  updateWholesaler: (id: string, payload: unknown) =>
    request(`/wholesalers/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteWholesaler: (id: string) =>
    request(`/wholesalers/${id}`, { method: 'DELETE' }),
  getWholesalerQueue: (params?: { wholesalerId?: string; status?: string }) => {
    const search = new URLSearchParams();
    if (params?.wholesalerId) search.set('wholesalerId', params.wholesalerId);
    if (params?.status) search.set('status', params.status);
    const query = search.toString() ? `?${search}` : '';
    return request<{ orders: unknown[] }>(`/orders/wholesaler-queue${query}`);
  },
  updateWholesalerOrderStatus: (orderId: string, status: string, vendorTaskId?: string) =>
    request(`/orders/${orderId}/wholesaler-status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, vendorTaskId }),
    }),
  getSettlementSummary: (period: 'week' | 'month', from?: string, to?: string) => {
    const search = new URLSearchParams({ period });
    if (from) search.set('from', from);
    if (to) search.set('to', to);
    return request<{ summary: unknown[]; period: string; range: unknown }>(
      `/wholesalers/settlements/summary?${search}`
    );
  },
  getRiders: () => request<{ riders: unknown[] }>('/riders'),
  getRiderStats: () => request<{ summary: unknown[] }>('/riders/stats/summary'),
  createRider: (payload: unknown) =>
    request('/riders', { method: 'POST', body: JSON.stringify(payload) }),
  updateRider: (id: string, payload: unknown) =>
    request(`/riders/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteRider: (id: string) => request(`/riders/${id}`, { method: 'DELETE' }),
  assignRiderToOrder: (orderId: string, riderId: string) =>
    request(`/orders/${orderId}/assign-rider`, {
      method: 'PATCH',
      body: JSON.stringify({ riderId }),
    }),
  getPromoCodes: () => request<{ promoCodes: unknown[] }>('/promocodes'),
  createPromoCode: (payload: unknown) =>
    request('/promocodes', { method: 'POST', body: JSON.stringify(payload) }),
  updatePromoCode: (id: string, payload: unknown) =>
    request(`/promocodes/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deletePromoCode: (id: string) =>
    request(`/promocodes/${id}`, { method: 'DELETE' }),
  getReferralSummary: () => request<{ summary: unknown }>('/users/referrals/summary'),
  getWholesalerSettlement: (
    id: string,
    period: 'week' | 'month',
    from?: string,
    to?: string
  ) => {
    const search = new URLSearchParams({ period });
    if (from) search.set('from', from);
    if (to) search.set('to', to);
    return request<{ wholesaler: unknown; totals: unknown; productBreakdown: unknown[]; orders: unknown[] }>(
      `/wholesalers/${id}/settlement?${search}`
    );
  },
};
