import type { Product } from '@/types';

export function getProductStock(product: Pick<Product, 'stock'>): number {
  const stock = product.stock ?? 0;
  return Number.isFinite(stock) ? Math.max(0, stock) : 0;
}

export function isOutOfStock(product: Pick<Product, 'stock'>): boolean {
  return getProductStock(product) <= 0;
}

export function getMaxCartQuantity(product: Pick<Product, 'stock'>, cartQuantity: number): number {
  return Math.max(0, getProductStock(product) - cartQuantity);
}

export function canIncreaseQuantity(product: Pick<Product, 'stock'>, cartQuantity: number): boolean {
  return cartQuantity < getProductStock(product);
}

export const OUT_OF_STOCK_MESSAGE =
  "Tap Notify me and we'll alert you by email or SMS when it's available again.";
