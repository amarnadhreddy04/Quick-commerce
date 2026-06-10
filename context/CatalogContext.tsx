import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { useAuth } from '@/context/AuthContext';
import { useDeliveryAreaOptional } from '@/context/DeliveryAreaContext';
import {
  AppSettings,
  fetchBanners,
  fetchCategories,
  fetchOrders,
  fetchProducts,
  fetchSettings,
  fetchSubCategories,
  fetchSyncState,
  type SyncState,
} from '@/lib/api';
import type { Category, Order, Product, PromoBanner, SubCategory } from '@/types';

type CatalogContextValue = {
  loading: boolean;
  categories: Category[];
  subCategories: SubCategory[];
  products: Product[];
  banners: PromoBanner[];
  settings: AppSettings;
  orders: Order[];
  refreshCatalog: () => Promise<void>;
  refreshOrders: () => Promise<void>;
  refreshSettings: () => Promise<void>;
};

const defaultSettings: AppSettings = {
  deliveryCutoff: '11:00 PM',
  deliverySlot: 'Tomorrow, 6:00 AM – 8:00 AM',
  minOrderValue: 299,
  deliveryFee: 30,
  walletEnabled: false,
};

const CatalogContext = createContext<CatalogContextValue | null>(null);

export function CatalogProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const pincode = useDeliveryAreaOptional()?.pincode ?? null;
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subCategories, setSubCategories] = useState<SubCategory[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [banners, setBanners] = useState<PromoBanner[]>([]);
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [orders, setOrders] = useState<Order[]>([]);
  const syncRef = useRef<SyncState>({ catalog: 0, orders: 0, settings: 0, users: 0, areas: 0 });

  const refreshCatalog = useCallback(async () => {
    const [categoriesRes, subRes, productsRes, bannersRes] = await Promise.all([
      fetchCategories(pincode),
      fetchSubCategories(),
      fetchProducts({ activeOnly: true, pincode }),
      fetchBanners(),
    ]);
    setCategories(categoriesRes.categories);
    setSubCategories(subRes.subCategories);
    setProducts(productsRes.products);
    setBanners(bannersRes.banners);
  }, [pincode]);

  const refreshSettings = useCallback(async () => {
    const { settings: nextSettings } = await fetchSettings();
    setSettings(nextSettings);
  }, []);

  const refreshOrders = useCallback(async () => {
    if (!token) {
      setOrders([]);
      return;
    }
    const { orders: nextOrders } = await fetchOrders(token);
    setOrders(nextOrders);
  }, [token]);

  const refreshAll = useCallback(async () => {
    await Promise.all([refreshCatalog(), refreshSettings(), refreshOrders()]);
  }, [refreshCatalog, refreshSettings, refreshOrders]);

  useEffect(() => {
    async function bootstrap() {
      try {
        await refreshAll();
        const { state } = await fetchSyncState();
        syncRef.current = state;
      } catch (error) {
        console.warn('Failed to load catalog from API', error);
      } finally {
        setLoading(false);
      }
    }
    bootstrap();
  }, [refreshAll]);

  useEffect(() => {
    refreshOrders();
  }, [refreshOrders]);

  useEffect(() => {
    if (!pincode) return;
    refreshCatalog().catch(() => undefined);
  }, [pincode, refreshCatalog]);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const { state } = await fetchSyncState();
        const prev = syncRef.current;

        if (state.catalog !== prev.catalog) {
          await refreshCatalog();
        }
        if (state.settings !== prev.settings) {
          await refreshSettings();
        }
        if (state.orders !== prev.orders && token) {
          await refreshOrders();
        }

        syncRef.current = state;
      } catch {
        // Gateway may be offline during dev restarts
      }
    }, 8000);

    return () => clearInterval(interval);
  }, [refreshCatalog, refreshSettings, refreshOrders, token]);

  const value = useMemo(
    () => ({
      loading,
      categories,
      subCategories,
      products,
      banners,
      settings,
      orders,
      refreshCatalog,
      refreshOrders,
      refreshSettings,
    }),
    [
      loading,
      categories,
      subCategories,
      products,
      banners,
      settings,
      orders,
      refreshCatalog,
      refreshOrders,
      refreshSettings,
    ]
  );

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
}

export function useCatalog() {
  const context = useContext(CatalogContext);
  if (!context) {
    throw new Error('useCatalog must be used within CatalogProvider');
  }
  return context;
}
