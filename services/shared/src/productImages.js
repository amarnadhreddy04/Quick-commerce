import { PRODUCT_IMAGE_SETS } from './mediaUrls.js';

export const MIN_PRODUCT_IMAGES = 2;
export const MAX_PRODUCT_IMAGES = 5;

export function isImageUri(value) {
  if (!value) return false;
  return value.startsWith('http://') || value.startsWith('https://') || value.startsWith('/');
}

export function normalizeProductImages({ images, image, productId } = {}) {
  let list = [];

  if (Array.isArray(images)) {
    list = images.map((item) => String(item).trim()).filter(Boolean);
  } else if (typeof images === 'string' && images) {
    try {
      const parsed = JSON.parse(images);
      if (Array.isArray(parsed)) {
        list = parsed.map((item) => String(item).trim()).filter(Boolean);
      }
    } catch {
      list = [];
    }
  }

  if (list.length === 0 && image) {
    list = [String(image).trim()].filter(Boolean);
  }

  if (list.length === 0 && productId && PRODUCT_IMAGE_SETS[productId]) {
    list = [...PRODUCT_IMAGE_SETS[productId]];
  }

  while (list.length > 0 && list.length < MIN_PRODUCT_IMAGES) {
    list.push(list[0]);
  }

  return list.slice(0, MAX_PRODUCT_IMAGES);
}

export function validateProductImages(images) {
  if (!Array.isArray(images)) {
    return 'Images must be an array';
  }

  const cleaned = images.map((item) => String(item).trim()).filter(Boolean);

  if (cleaned.length < MIN_PRODUCT_IMAGES) {
    return `Add at least ${MIN_PRODUCT_IMAGES} image URLs`;
  }

  if (cleaned.length > MAX_PRODUCT_IMAGES) {
    return `Maximum ${MAX_PRODUCT_IMAGES} images allowed`;
  }

  const invalid = cleaned.find((url) => !isImageUri(url));
  if (invalid) {
    return 'Each image must be a valid URL (http:// or https://)';
  }

  return null;
}

export function prepareProductImagesPayload(body = {}) {
  const raw = body.images ?? (body.image ? [body.image] : []);
  const cleaned = Array.isArray(raw)
    ? raw.map((item) => String(item).trim()).filter(Boolean)
    : [];

  const error = validateProductImages(cleaned);
  if (error) {
    return { error };
  }

  const images = cleaned.slice(0, MAX_PRODUCT_IMAGES);
  return { images, image: images[0] };
}

export function formatProductImagesRow(row) {
  const images = normalizeProductImages({
    images: row.images,
    image: row.image,
    productId: row.id,
  });

  return {
    images,
    image: images[0] ?? '',
  };
}
