import { Image, ImageStyle, StyleProp, StyleSheet, Text, ViewStyle } from 'react-native';

import { isImageUri } from '@/lib/imageUtils';

type Props = {
  uri?: string | null;
  style?: StyleProp<ImageStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  fallbackEmoji?: string;
  emojiStyle?: object;
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'center';
};

export default function AppImage({
  uri,
  style,
  containerStyle,
  fallbackEmoji = '📦',
  emojiStyle,
  resizeMode = 'cover',
}: Props) {
  if (uri && isImageUri(uri)) {
    return <Image source={{ uri }} style={style} resizeMode={resizeMode} />;
  }

  return (
    <Text style={[styles.emoji, emojiStyle, containerStyle as object]}>{uri || fallbackEmoji}</Text>
  );
}

const styles = StyleSheet.create({
  emoji: {
    textAlign: 'center',
  },
});
