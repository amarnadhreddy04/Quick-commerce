import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { clearStoredCart, loadStoredCart, saveStoredCart } from '@/lib/cartStorage';
import { canIncreaseQuantity, getProductStock, isOutOfStock } from '@/lib/productStock';
import type { AppliedPromo, CartItem, Product } from '@/types';

export type { AppliedPromo };

type CartContextValue = {
  items: CartItem[];
  itemCount: number;
  subtotal: number;
  appliedPromo: AppliedPromo | null;
  addItem: (product: Product) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  getQuantity: (productId: string) => number;
  applyPromo: (promo: AppliedPromo) => void;
  removePromo: () => void;
  clearCart: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [appliedPromo, setAppliedPromo] = useState<AppliedPromo | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    loadStoredCart()
      .then((stored) => {
        if (!stored) return;
        setItems(stored.items);
        setAppliedPromo(stored.appliedPromo);
      })
      .catch(() => undefined)
      .finally(() => setHydrated(true));
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    saveStoredCart({ items, appliedPromo }).catch(() => undefined);
  }, [items, appliedPromo, hydrated]);

  const applyPromo = useCallback((promo: AppliedPromo) => {
    setAppliedPromo(promo);
  }, []);

  const removePromo = useCallback(() => {
    setAppliedPromo(null);
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
    setAppliedPromo(null);
    clearStoredCart().catch(() => undefined);
  }, []);

  const value = useMemo<CartContextValue>(() => {
    const addItem = (product: Product) => {
      if (isOutOfStock(product)) return;

      setItems((current) => {
        const existing = current.find((item) => item.product.id === product.id);
        if (existing) {
          if (!canIncreaseQuantity(product, existing.quantity)) return current;
          return current.map((item) =>
            item.product.id === product.id
              ? { ...item, quantity: item.quantity + 1 }
              : item
          );
        }
        if (getProductStock(product) < 1) return current;
        return [...current, { product, quantity: 1 }];
      });
    };

    const removeItem = (productId: string) => {
      setItems((current) => current.filter((item) => item.product.id !== productId));
    };

    const updateQuantity = (productId: string, quantity: number) => {
      if (quantity <= 0) {
        removeItem(productId);
        return;
      }

      setItems((current) =>
        current.map((item) => {
          if (item.product.id !== productId) return item;
          const maxQty = getProductStock(item.product);
          return { ...item, quantity: Math.min(quantity, maxQty) };
        })
      );
    };

    const getQuantity = (productId: string) =>
      items.find((item) => item.product.id === productId)?.quantity ?? 0;

    const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
    const subtotal = items.reduce(
      (sum, item) => sum + item.product.price * item.quantity,
      0
    );

    return {
      items,
      itemCount,
      subtotal,
      appliedPromo,
      addItem,
      removeItem,
      updateQuantity,
      getQuantity,
      applyPromo,
      removePromo,
      clearCart,
    };
  }, [items, appliedPromo, applyPromo, removePromo, clearCart]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within CartProvider');
  }
  return context;
}

export function useCartOptional() {
  return useContext(CartContext);
}
