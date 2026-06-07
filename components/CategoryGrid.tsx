import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import CategoryImage from '@/components/CategoryImage';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { radius, spacing } from '@/constants/theme';
import { useCatalog } from '@/context/CatalogContext';

export default function CategoryGrid() {
  const router = useRouter();
  const { categories } = useCatalog();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const openCategory = (categoryId: string) => {
    router.push({
      pathname: '/(tabs)/categories',
      params: { id: categoryId },
    });
  };

  return (
    <View style={styles.grid}>
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
          <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
            {category.name}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  item: {
    width: '22%',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconWrap: {
    width: 56,
    height: 56,
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
    fontSize: 28,
  },
  name: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
});
