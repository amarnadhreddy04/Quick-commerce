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
import {
  homePathForRole,
  isLocationAdmin,
  isPanelRole,
  isSuperAdmin,
  isWholesaler,
  type PanelUser,
} from '../lib/roles';
import { subscribeSyncEvents } from '../lib/sync';
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
  user: PanelUser | null;
  products: Product[];
  categories: Category[];
  orders: Order[];
  customers: Customer[];
  settings: AppSettings;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<string>;
  logout: () => void;
  refreshAll: () => Promise<void>;
  addProduct: (product: Omit<Product, 'id'>) => Promise<void>;
  updateProduct: (id: string, updates: Partial<Product>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  addCategory: (category: Omit<Category, 'id'>) => Promise<void>;
  updateCategory: (id: string, updates: Partial<Category>) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  updateOrderStatus: (id: string, status: OrderStatus) => Promise<void>;
  updateSettings: (settings: AppSettings) => Promise<void>;
  toggleCustomer: (id: string) => Promise<void>;
};

const AdminContext = createContext<AdminStoreValue | null>(null);

const defaultSettings: AppSettings = {
  deliveryCutoff: '11:00 PM',
  deliverySlot: 'Tomorrow, 6:00 AM – 8:00 AM',
  minOrderValue: 299,
  deliveryFee: 30,
  platformFeeEnabled: true,
  platformFee: 5,
  walletEnabled: false,
  subscriptionEnabled: false,
  referralEnabled: true,
  referralRewardAmount: 50,
};

export function AdminProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<PanelUser | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [isAuthenticated, setIsAuthenticated] = useState(!!getAuthToken());

  const refreshAll = useCallback(async () => {
    const meRes = await api.getMe();
    const nextUser = meRes.user as PanelUser;
    setUser(nextUser);

    if (isWholesaler(nextUser.role)) {
      const ordersRes = await api.getWholesalerQueue();
      setOrders(ordersRes.orders as Order[]);
      setProducts([]);
      setCategories([]);
      setCustomers([]);
      setSettings(defaultSettings);
      return;
    }

    const tasks: Promise<void>[] = [
      api.getProducts().then((res) => setProducts(res.products as Product[])),
      api.getCategories().then((res) => setCategories(res.categories as Category[])),
      api.getOrders().then((res) => setOrders(res.orders as Order[])),
    ];

    if (isSuperAdmin(nextUser.role) || isLocationAdmin(nextUser.role)) {
      tasks.push(api.getCustomers().then((res) => setCustomers(res.customers as Customer[])));
    } else {
      setCustomers([]);
    }

    if (isSuperAdmin(nextUser.role)) {
      tasks.push(api.getSettings().then((res) => setSettings(res.settings as AppSettings)));
    } else {
      setSettings(defaultSettings);
    }

    await Promise.all(tasks);
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
        setUser(null);
      } finally {
        setLoading(false);
      }
    }
    bootstrap();
  }, [refreshAll]);

  useEffect(() => {
    if (!isAuthenticated) return;

    return subscribeSyncEvents(() => {
      refreshAll().catch(() => undefined);
    });
  }, [isAuthenticated, refreshAll]);

  const value = useMemo<AdminStoreValue>(
    () => ({
      loading,
      user,
      products,
      categories,
      orders,
      customers,
      settings,
      isAuthenticated,
      refreshAll,
      login: async (email, password) => {
        const { token, user: loggedIn } = await api.login(email, password);
        if (!isPanelRole(loggedIn.role)) {
          throw new Error('Panel access required');
        }
        setAuthToken(token);
        setIsAuthenticated(true);
        setUser(loggedIn as PanelUser);
        await refreshAll();
        return homePathForRole(loggedIn.role as PanelUser['role']);
      },
      logout: () => {
        setAuthToken(null);
        setIsAuthenticated(false);
        setUser(null);
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
      updateCategory: async (id, updates) => {
        await api.updateCategory(id, updates);
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
      user,
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
