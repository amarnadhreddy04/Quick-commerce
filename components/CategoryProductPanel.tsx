import { FlatList, StyleSheet, Text, View } from 'react-native';

import ProductListItem from '@/components/ProductListItem';
import Colors from '@/constants/Colors';
import { spacing } from '@/constants/theme';
import { products } from '@/data/mockData';
import { useColorScheme } from '@/components/useColorScheme';
import { Category } from '@/types';

type Props = {
  category: Category;
};

export default function CategoryProductPanel({ category }: Props) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const categoryProducts = products.filter((product) => product.categoryId === category.id);

  return (
    <View style={[styles.panel, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.text }]}>{category.name}</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {categoryProducts.length} items available
        </Text>
      </View>

      <FlatList
        data={categoryProducts}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>📦</Text>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No products yet</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Products for {category.name} will appear here soon.
            </Text>
          </View>
        }
        renderItem={({ item }) => <ProductListItem product={item} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    flex: 1,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  list: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  empty: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  emptyEmoji: {
    fontSize: 40,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 13,
    lineHeight: 20,
  },
});
