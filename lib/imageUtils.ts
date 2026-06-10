import { CATEGORY_IMAGES } from '@/constants/mediaUrls';
import { resolveProductImages } from '@/lib/productImages';
import type { Product } from '@/types';

export function isImageUri(value?: string | null): boolean {
  if (!value) return false;
  return value.startsWith('http://') || value.startsWith('https://') || value.startsWith('/');
}

export function resolveProductImage(product: Pick<Product, 'id' | 'image' | 'images'>): string {
  return resolveProductImages(product)[0] ?? '';
}

export function resolveCategoryImage(categoryId: string, thumbnail?: string): string {
  if (isImageUri(thumbnail)) return thumbnail!;
  return CATEGORY_IMAGES[categoryId] ?? thumbnail ?? '';
}
