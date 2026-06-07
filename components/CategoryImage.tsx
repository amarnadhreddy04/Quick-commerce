import { ImageStyle, StyleProp } from 'react-native';

import AppImage from '@/components/AppImage';
import { resolveCategoryImage } from '@/lib/imageUtils';
import { Category } from '@/types';

type Props = {
  category: Pick<Category, 'id' | 'thumbnail'>;
  style?: StyleProp<ImageStyle>;
  emojiStyle?: object;
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'center';
};

export default function CategoryImage({ category, style, emojiStyle, resizeMode = 'cover' }: Props) {
  const uri = resolveCategoryImage(category.id, category.thumbnail);

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
