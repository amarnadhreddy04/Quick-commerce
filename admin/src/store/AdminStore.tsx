import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import {
  seedCategories,
  seedCustomers,
  seedOrders,
  seedProducts,
  seedSettings,
} from '../data/seed';
import type {
  AppSettings,
  Category,
  Customer,
  Order,
  OrderStatus,
  Product,
} from '../types';

const STORAGE_KEY = 'milkbasket-admin-data';

type AdminData = {
  products: Product[];
  categories: Category[];
  orders: Order[];
  customers: Customer[];
  settings: AppSettings;
};

type AdminStoreValue = AdminData & {
  isAuthenticated: boolean;
  login: (email: string, password: string) => boolean;
  logout: () => void;
  addProduct: (product: Omit<Product, 'id'>) => void;
  updateProduct: (id: string, updates: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  addCategory: (category: Omit<Category, 'id'>) => void;
  updateCategory: (id: string, updates: Partial<Category>) => void;
  deleteCategory: (id: string) => void;
  updateOrderStatus: (id: string, status: OrderStatus) => void;
  updateSettings: (settings: AppSettings) => void;
  toggleCustomer: (id: string) => void;
};

const AdminContext = createContext<AdminStoreValue | null>(null);

function loadData(): AdminData {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    return JSON.parse(stored) as AdminData;
  }
  return {
    products: seedProducts,
    categories: seedCategories,
    orders: seedOrders,
    customers: seedCustomers,
    settings: seedSettings,
  };
}

export function AdminProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AdminData>(loadData);
  const [isAuthenticated, setIsAuthenticated] = useState(
    () => sessionStorage.getItem('milkbasket-admin-auth') === 'true'
  );

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data]);

  const value = useMemo<AdminStoreValue>(() => {
    const login = (email: string, password: string) => {
      const valid = email === 'admin@milkbasket.com' && password === 'admin123';
      if (valid) {
        setIsAuthenticated(true);
        sessionStorage.setItem('milkbasket-admin-auth', 'true');
      }
      return valid;
    };

    const logout = () => {
      setIsAuthenticated(false);
      sessionStorage.removeItem('milkbasket-admin-auth');
    };

    const addProduct = (product: Omit<Product, 'id'>) => {
      setData((current) => ({
        ...current,
        products: [
          ...current.products,
          { ...product, id: `p${Date.now()}` },
        ],
      }));
    };

    const updateProduct = (id: string, updates: Partial<Product>) => {
      setData((current) => ({
        ...current,
        products: current.products.map((item) =>
          item.id === id ? { ...item, ...updates } : item
        ),
      }));
    };

    const deleteProduct = (id: string) => {
      setData((current) => ({
        ...current,
        products: current.products.filter((item) => item.id !== id),
      }));
    };

    const addCategory = (category: Omit<Category, 'id'>) => {
      const id = category.name.toLowerCase().replace(/\s+/g, '-');
      setData((current) => ({
        ...current,
        categories: [...current.categories, { ...category, id }],
      }));
    };

    const updateCategory = (id: string, updates: Partial<Category>) => {
      setData((current) => ({
        ...current,
        categories: current.categories.map((item) =>
          item.id === id ? { ...item, ...updates } : item
        ),
      }));
    };

    const deleteCategory = (id: string) => {
      setData((current) => ({
        ...current,
        categories: current.categories.filter((item) => item.id !== id),
      }));
    };

    const updateOrderStatus = (id: string, status: OrderStatus) => {
      setData((current) => ({
        ...current,
        orders: current.orders.map((item) =>
          item.id === id ? { ...item, status } : item
        ),
      }));
    };

    const updateSettings = (settings: AppSettings) => {
      setData((current) => ({ ...current, settings }));
    };

    const toggleCustomer = (id: string) => {
      setData((current) => ({
        ...current,
        customers: current.customers.map((item) =>
          item.id === id ? { ...item, active: !item.active } : item
        ),
      }));
    };

    return {
      ...data,
      isAuthenticated,
      login,
      logout,
      addProduct,
      updateProduct,
      deleteProduct,
      addCategory,
      updateCategory,
      deleteCategory,
      updateOrderStatus,
      updateSettings,
      toggleCustomer,
    };
  }, [data, isAuthenticated]);

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}

export function useAdminStore() {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error('useAdminStore must be used within AdminProvider');
  }
  return context;
}
