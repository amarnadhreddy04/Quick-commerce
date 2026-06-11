import AsyncStorage from '@react-native-async-storage/async-storage';

import type { AppliedPromo, CartItem } from '@/types';

const CART_KEY = 'milkbasket-cart';

type StoredCart = {
  items: CartItem[];
  appliedPromo: AppliedPromo | null;
};

function isStoredCart(value: unknown): value is StoredCart {
  if (!value || typeof value !== 'object') return false;
  const cart = value as StoredCart;
  if (!Array.isArray(cart.items)) return false;
  return cart.items.every(
    (item) =>
      item &&
      typeof item === 'object' &&
      typeof item.quantity === 'number' &&
      item.quantity > 0 &&
      item.product &&
      typeof item.product.id === 'string'
  );
}

export async function loadStoredCart(): Promise<StoredCart | null> {
  const raw = await AsyncStorage.getItem(CART_KEY);
  if (!raw) return null;

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isStoredCart(parsed)) return null;
    return {
      items: parsed.items,
      appliedPromo: parsed.appliedPromo ?? null,
    };
  } catch {
    return null;
  }
}

export async function saveStoredCart(cart: StoredCart): Promise<void> {
  await AsyncStorage.setItem(CART_KEY, JSON.stringify(cart));
}

export async function clearStoredCart(): Promise<void> {
  await AsyncStorage.removeItem(CART_KEY);
}
