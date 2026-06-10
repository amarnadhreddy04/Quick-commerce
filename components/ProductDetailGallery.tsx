import { useState } from 'react';
import {
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import ZoomableImage from '@/components/ZoomableImage';
import { radius, spacing } from '@/constants/theme';
import { resolveProductImages } from '@/lib/productImages';
import type { Product } from '@/types';

type Props = {
  product: Pick<Product, 'id' | 'image' | 'images'>;
  height?: number;
};

export default function ProductDetailGallery({ product, height = 320 }: Props) {
  const images = resolveProductImages(product);
  const [activeIndex, setActiveIndex] = useState(0);
  const [galleryWidth, setGalleryWidth] = useState(0);

  const handleLayout = (event: LayoutChangeEvent) => {
    setGalleryWidth(event.nativeEvent.layout.width);
  };

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!galleryWidth) return;
    const index = Math.round(event.nativeEvent.contentOffset.x / galleryWidth);
    setActiveIndex(index);
  };

  if (images.length <= 1) {
    return (
      <View style={[styles.wrapper, { height }]} onLayout={handleLayout}>
        <ZoomableImage uri={images[0]} height={height} />
      </View>
    );
  }

  return (
    <View style={[styles.wrapper, { height }]} onLayout={handleLayout}>
      {galleryWidth > 0 ? (
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleScroll}
          style={{ width: galleryWidth, height }}
          contentContainerStyle={{ width: galleryWidth * images.length }}>
          {images.map((uri, index) => (
            <View key={`${product.id}-${index}`} style={{ width: galleryWidth, height }}>
              <ZoomableImage uri={uri} height={height} />
            </View>
          ))}
        </ScrollView>
      ) : null}
      <View style={styles.dots}>
        {images.map((_, index) => (
          <View
            key={`dot-${product.id}-${index}`}
            style={[styles.dot, index === activeIndex && styles.dotActive]}
          />
        ))}
      </View>
      <View style={styles.counter}>
        <View style={styles.counterBadge}>
          <Text style={styles.counterText}>{`${activeIndex + 1}/${images.length}`}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    backgroundColor: '#111827',
    position: 'relative',
  },
  dots: {
    position: 'absolute',
    bottom: spacing.md,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255,255,255,0.45)',
  },
  dotActive: {
    backgroundColor: '#FFFFFF',
    width: 8,
    height: 8,
  },
  counter: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
  },
  counterBadge: {
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  counterText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
});
