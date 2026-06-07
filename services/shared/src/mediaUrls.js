export const CATEGORY_IMAGES = {
  milk: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=200&h=200&fit=crop',
  bread: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=200&h=200&fit=crop',
  eggs: 'https://images.unsplash.com/photo-1582722872445-44dc5f7e3a8e?w=200&h=200&fit=crop',
  fruits: 'https://images.unsplash.com/photo-1619566636852-adf3ef00000b?w=200&h=200&fit=crop',
  vegetables: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=200&h=200&fit=crop',
  beverages: 'https://images.unsplash.com/photo-1546173159-315724ff274c?w=200&h=200&fit=crop',
  snacks: 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=200&h=200&fit=crop',
  breakfast: 'https://images.unsplash.com/photo-1517686469429-8bdb88b9f907?w=200&h=200&fit=crop',
};

export const PRODUCT_IMAGES = {
  p1: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=400&h=400&fit=crop',
  p2: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400&h=400&fit=crop',
  p3: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&h=400&fit=crop',
  p5: 'https://images.unsplash.com/photo-1582722872445-44dc5f7e3a8e?w=400&h=400&fit=crop',
  p6: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=400&h=400&fit=crop',
  p8: 'https://images.unsplash.com/photo-1546094096-0df4bcaaa337?w=400&h=400&fit=crop',
  p12: 'https://images.unsplash.com/photo-1613915914240-c7d163fc5c68?w=400&h=400&fit=crop',
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
