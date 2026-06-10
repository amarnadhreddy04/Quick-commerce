import { useState } from 'react';
import {
  ImageStyle,
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleProp,
  StyleSheet,
  View,
} from 'react-native';

import AppImage from '@/components/AppImage';
import { radius, spacing } from '@/constants/theme';
import { resolveProductImages } from '@/lib/productImages';
import { Product } from '@/types';

type Props = {
  product: Pick<Product, 'id' | 'image' | 'images'>;
  style?: StyleProp<ImageStyle>;
  emojiStyle?: object;
  showDots?: boolean;
};

export default function ProductImageGallery({
  product,
  style,
  emojiStyle,
  showDots = true,
}: Props) {
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
      <AppImage
        uri={images[0]}
        style={style}
        emojiStyle={emojiStyle}
        resizeMode="cover"
        fallbackEmoji="📦"
      />
    );
  }

  return (
    <View style={styles.wrapper} onLayout={handleLayout}>
      {galleryWidth > 0 ? (
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        style={{ width: galleryWidth, height: '100%' }}
        contentContainerStyle={{ width: galleryWidth * images.length }}>
        {images.map((uri, index) => (
          <AppImage
            key={`${product.id}-${index}`}
            uri={uri}
            style={[style, { width: galleryWidth, height: '100%' }]}
            emojiStyle={emojiStyle}
            resizeMode="cover"
            fallbackEmoji="📦"
          />
        ))}
      </ScrollView>
      ) : null}
      {showDots ? (
        <View style={styles.dots}>
          {images.map((_, index) => (
            <View
              key={`dot-${product.id}-${index}`}
              style={[styles.dot, index === activeIndex && styles.dotActive]}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    height: '100%',
  },
  dots: {
    position: 'absolute',
    bottom: spacing.xs,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 4,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
  dotActive: {
    backgroundColor: '#FFFFFF',
    width: 7,
  },
});
