import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import CategoryImage from '@/components/CategoryImage';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { radius, spacing } from '@/constants/theme';
import type { Category } from '@/types';

type Props = {
  categories: Category[];
};

export default function CategoryRow({ categories }: Props) {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const openCategory = (categoryId: string) => {
    router.push({
      pathname: '/(tabs)/categories',
      params: { id: categoryId },
    });
  };

  if (categories.length === 0) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}>
      {categories.map((category) => (
        <Pressable
          key={category.id}
          style={styles.item}
          onPress={() => openCategory(category.id)}>
          <View style={[styles.iconWrap, { backgroundColor: category.color }]}>
            <CategoryImage
              category={category}
              style={styles.categoryImage}
              emojiStyle={styles.categoryEmoji}
            />
          </View>
          <Text style={[styles.name, { color: colors.text }]} numberOfLines={2}>
            {category.name}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
    paddingBottom: spacing.xs,
  },
  item: {
    width: 76,
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  categoryImage: {
    width: '100%',
    height: '100%',
  },
  categoryEmoji: {
    fontSize: 30,
  },
  name: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 14,
  },
});
