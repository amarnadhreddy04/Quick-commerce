import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { api, getAuthToken, setAuthToken } from '../lib/api';
import type {
  AppSettings,
  Category,
  Customer,
  Order,
  OrderStatus,
  Product,
} from '../types';

type AdminStoreValue = {
  loading: boolean;
  products: Product[];
  categories: Category[];
  orders: Order[];
  customers: Customer[];
  settings: AppSettings;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  refreshAll: () => Promise<void>;
  addProduct: (product: Omit<Product, 'id'>) => Promise<void>;
  updateProduct: (id: string, updates: Partial<Product>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  addCategory: (category: Omit<Category, 'id'>) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  updateOrderStatus: (id: string, status: OrderStatus) => Promise<void>;
  updateSettings: (settings: AppSettings) => Promise<void>;
  toggleCustomer: (id: string) => Promise<void>;
};

const AdminContext = createContext<AdminStoreValue | null>(null);

const defaultSettings: AppSettings = {
  deliveryCutoff: '11:00 PM',
  deliverySlot: 'Tomorrow, 6:00 AM – 8:00 AM',
  minOrderValue: 99,
  deliveryFee: 15,
};

export function AdminProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [isAuthenticated, setIsAuthenticated] = useState(!!getAuthToken());

  const refreshAll = useCallback(async () => {
    const [productsRes, categoriesRes, ordersRes, customersRes, settingsRes] = await Promise.all([
      api.getProducts(),
      api.getCategories(),
      api.getOrders(),
      api.getCustomers(),
      api.getSettings(),
    ]);

    setProducts(productsRes.products as Product[]);
    setCategories(categoriesRes.categories as Category[]);
    setOrders(ordersRes.orders as Order[]);
    setCustomers(customersRes.customers as Customer[]);
    setSettings(settingsRes.settings as AppSettings);
  }, []);

  useEffect(() => {
    async function bootstrap() {
      if (!getAuthToken()) {
        setLoading(false);
        return;
      }
      try {
        await refreshAll();
        setIsAuthenticated(true);
      } catch {
        setAuthToken(null);
        setIsAuthenticated(false);
      } finally {
        setLoading(false);
      }
    }
    bootstrap();
  }, [refreshAll]);

  const value = useMemo<AdminStoreValue>(
    () => ({
      loading,
      products,
      categories,
      orders,
      customers,
      settings,
      isAuthenticated,
      refreshAll,
      login: async (email, password) => {
        const { token, user } = await api.login(email, password);
        if (user.role !== 'admin') {
          throw new Error('Admin access required');
        }
        setAuthToken(token);
        setIsAuthenticated(true);
        await refreshAll();
        return true;
      },
      logout: () => {
        setAuthToken(null);
        setIsAuthenticated(false);
        setProducts([]);
        setCategories([]);
        setOrders([]);
        setCustomers([]);
      },
      addProduct: async (product) => {
        await api.createProduct(product);
        await refreshAll();
      },
      updateProduct: async (id, updates) => {
        await api.updateProduct(id, updates);
        await refreshAll();
      },
      deleteProduct: async (id) => {
        await api.deleteProduct(id);
        await refreshAll();
      },
      addCategory: async (category) => {
        await api.createCategory(category);
        await refreshAll();
      },
      deleteCategory: async (id) => {
        await api.deleteCategory(id);
        await refreshAll();
      },
      updateOrderStatus: async (id, status) => {
        await api.updateOrderStatus(id, status);
        await refreshAll();
      },
      updateSettings: async (nextSettings) => {
        await api.updateSettings(nextSettings);
        setSettings(nextSettings);
      },
      toggleCustomer: async (id) => {
        await api.toggleCustomer(id);
        await refreshAll();
      },
    }),
    [
      loading,
      products,
      categories,
      orders,
      customers,
      settings,
      isAuthenticated,
      refreshAll,
    ]
  );

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}

export function useAdminStore() {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error('useAdminStore must be used within AdminProvider');
  }
  return context;
}
