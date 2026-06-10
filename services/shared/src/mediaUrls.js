import { GROCERY_CATEGORY_IMAGES } from './groceryCategories.js';

export const CATEGORY_IMAGES = { ...GROCERY_CATEGORY_IMAGES };

export const PRODUCT_IMAGES = {
  p1: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=400&h=400&fit=crop',
  p2: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400&h=400&fit=crop',
  p3: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&h=400&fit=crop',
  p5: 'https://images.unsplash.com/photo-1582722872445-44dc5f7e3a8e?w=400&h=400&fit=crop',
  p6: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=400&h=400&fit=crop',
  p8: 'https://images.unsplash.com/photo-1546094096-0df4bcaaa337?w=400&h=400&fit=crop',
  p12: 'https://images.unsplash.com/photo-1613915914240-c7d163fc5c68?w=400&h=400&fit=crop',
};

export const PRODUCT_IMAGE_SETS = {
  p1: [
    'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=400&h=400&fit=crop',
    'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400&h=400&fit=crop',
  ],
  p2: [
    'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400&h=400&fit=crop',
    'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=400&h=400&fit=crop',
  ],
  p3: [
    'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&h=400&fit=crop',
    'https://images.unsplash.com/photo-1549931319-a545dcf3bc73?w=400&h=400&fit=crop',
  ],
  p5: [
    'https://images.unsplash.com/photo-1582722872445-44dc5f7e3a8e?w=400&h=400&fit=crop',
    'https://images.unsplash.com/photo-1518495973542-4542c06a5843?w=400&h=400&fit=crop',
  ],
  p6: [
    'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=400&h=400&fit=crop',
    'https://images.unsplash.com/photo-1603833665858-e5d2459f1401?w=400&h=400&fit=crop',
  ],
  p8: [
    'https://images.unsplash.com/photo-1546094096-0df4bcaaa337?w=400&h=400&fit=crop',
    'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=400&h=400&fit=crop',
  ],
  p12: [
    'https://images.unsplash.com/photo-1613915914240-c7d163fc5c68?w=400&h=400&fit=crop',
    'https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=400&h=400&fit=crop',
  ],
};

export const BANNER_IMAGES = {
  'b-milk': [
    'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=120&h=120&fit=crop',
    'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=120&h=120&fit=crop',
  ],
};

export function isImageUri(value) {
  if (!value) return false;
  return value.startsWith('http://') || value.startsWith('https://') || value.startsWith('/');
}
