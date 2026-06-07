import { CATEGORY_IMAGES, PRODUCT_IMAGES } from '@/constants/mediaUrls';

export function isImageUri(value?: string | null): boolean {
  if (!value) return false;
  return value.startsWith('http://') || value.startsWith('https://') || value.startsWith('/');
}

export function resolveProductImage(productId: string, image?: string): string {
  if (isImageUri(image)) return image!;
  return PRODUCT_IMAGES[productId] ?? image ?? '';
}

export function resolveCategoryImage(categoryId: string, thumbnail?: string): string {
  if (isImageUri(thumbnail)) return thumbnail!;
  return CATEGORY_IMAGES[categoryId] ?? thumbnail ?? '';
}
