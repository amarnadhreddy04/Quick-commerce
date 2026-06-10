import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import Colors from '@/constants/Colors';
import { radius, spacing } from '@/constants/theme';
import { useColorScheme } from '@/components/useColorScheme';
import { useCatalog } from '@/context/CatalogContext';

/** Quick-commerce shortcuts — mixed from Blinkit, Zepto, Instamart, BigBasket, etc. */
const FEATURED_IDS = [
  'fruits',
  'milk',
  'atta-rice',
  'snacks',
  'beverages',
  'ice-cream',
  'paan',
  'beauty',
  'mobiles',
  'baby-care',
  'festive',
  'toys',
] as const;

const PILL_LABELS: Partial<Record<(typeof FEATURED_IDS)[number], string>> = {
  fruits: 'Fresh',
  milk: 'Dairy',
  'atta-rice': 'Staples',
  snacks: 'Snacks',
  beverages: 'Drinks',
  'ice-cream': 'Ice Cream',
  paan: 'Paan',
  beauty: 'Beauty',
  mobiles: 'Mobiles',
  'baby-care': 'Baby',
  festive: 'Festive',
  toys: 'Toys',
};

export default function CategoryPills() {
  const router = useRouter();
  const { categories } = useCatalog();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const featured = FEATURED_IDS.map((id) => categories.find((c) => c.id === id)).filter(Boolean);

  const openCategories = (categoryId?: string) => {
    router.push({
      pathname: '/(tabs)/categories',
      params: categoryId ? { id: categoryId } : {},
    });
  };

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}>
      <Pressable
        onPress={() => openCategories()}
        style={[styles.pill, { backgroundColor: colors.primary, borderColor: colors.primary }]}>
        <Text style={[styles.pillText, styles.pillTextActive]}>All</Text>
      </Pressable>
      {featured.map((category) => (
        <Pressable
          key={category!.id}
          onPress={() => openCategories(category!.id)}
          style={[styles.pill, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.pillText, { color: colors.text }]} numberOfLines={1}>
            {PILL_LABELS[category!.id as (typeof FEATURED_IDS)[number]] ??
              category!.name.split('&')[0].trim()}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  pill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  pillText: {
    fontSize: 13,
    fontWeight: '600',
  },
  pillTextActive: {
    color: '#fff',
  },
});
