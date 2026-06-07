import { ImageStyle, StyleProp } from 'react-native';

import AppImage from '@/components/AppImage';
import { resolveProductImage } from '@/lib/imageUtils';
import { Product } from '@/types';

type Props = {
  product: Pick<Product, 'id' | 'image'>;
  style?: StyleProp<ImageStyle>;
  emojiStyle?: object;
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'center';
};

export default function ProductImage({ product, style, emojiStyle, resizeMode = 'cover' }: Props) {
  const uri = resolveProductImage(product.id, product.image);

  return (
    <AppImage
      uri={uri}
      style={style}
      emojiStyle={emojiStyle}
      resizeMode={resizeMode}
      fallbackEmoji="📦"
    />
  );
}
