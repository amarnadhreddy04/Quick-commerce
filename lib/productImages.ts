import {
  MAX_PRODUCT_IMAGES,
  MIN_PRODUCT_IMAGES,
  PRODUCT_IMAGE_SETS,
  PRODUCT_IMAGES,
} from '@/constants/mediaUrls';
import { isImageUri } from '@/lib/imageUtils';
import type { Product } from '@/types';

export { MIN_PRODUCT_IMAGES, MAX_PRODUCT_IMAGES };

export function resolveProductImages(product: Pick<Product, 'id' | 'image' | 'images'>): string[] {
  let list: string[] = [];

  if (Array.isArray(product.images)) {
    list = product.images.map((item) => item.trim()).filter(Boolean);
  }

  if (list.length === 0 && product.image) {
    list = [product.image.trim()].filter(Boolean);
  }

  if (list.length === 0 && PRODUCT_IMAGE_SETS[product.id]) {
    list = [...PRODUCT_IMAGE_SETS[product.id]];
  }

  if (list.length === 0 && PRODUCT_IMAGES[product.id]) {
    const fallback = PRODUCT_IMAGES[product.id];
    list = [fallback, fallback];
  }

  while (list.length > 0 && list.length < MIN_PRODUCT_IMAGES) {
    list.push(list[0]);
  }

  return list.slice(0, MAX_PRODUCT_IMAGES);
}

export function validateProductImageUrls(images: string[]): string | null {
  const cleaned = images.map((item) => item.trim()).filter(Boolean);

  if (cleaned.length < MIN_PRODUCT_IMAGES) {
    return `Add at least ${MIN_PRODUCT_IMAGES} image URLs`;
  }

  if (cleaned.length > MAX_PRODUCT_IMAGES) {
    return `Maximum ${MAX_PRODUCT_IMAGES} images allowed`;
  }

  if (cleaned.some((url) => !isImageUri(url))) {
    return 'Each image must be a valid URL';
  }

  return null;
}
