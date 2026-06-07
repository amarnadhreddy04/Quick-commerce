import { useEffect, useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';

import CategoryPromoBanner from '@/components/CategoryPromoBanner';
import GridProductCard from '@/components/GridProductCard';
import SubCategoryPills from '@/components/SubCategoryPills';
import Colors from '@/constants/Colors';
import { spacing } from '@/constants/theme';
import { useColorScheme } from '@/components/useColorScheme';
import { useCatalog } from '@/context/CatalogContext';
import { Category } from '@/types';

type Props = {
  category: Category;
};

export default function CategoryProductPanel({ category }: Props) {
  const { products, subCategories, banners } = useCatalog();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const [selectedSubCategory, setSelectedSubCategory] = useState<string | null>(null);

  useEffect(() => {
    setSelectedSubCategory(null);
  }, [category.id]);

  const banner = banners.find((item) => item.categoryId === category.id);
  const categorySubCategories = subCategories.filter((item) => item.categoryId === category.id);

  const categoryProducts = useMemo(() => {
    const filtered = products.filter((product) => product.categoryId === category.id);
    if (!selectedSubCategory) return filtered;
    return filtered.filter((product) => product.subCategoryId === selectedSubCategory);
  }, [category.id, selectedSubCategory, products]);

  return (
    <View style={[styles.panel, { backgroundColor: colors.background }]}>
      <FlatList
        data={categoryProducts}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            {banner ? <CategoryPromoBanner banner={banner} /> : null}
            <SubCategoryPills
              items={categorySubCategories}
              selectedId={selectedSubCategory}
              onSelect={setSelectedSubCategory}
            />
          </>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>📦</Text>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No products found</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Try another filter in {category.name}.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.cardWrap}>
            <GridProductCard product={item} />
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    flex: 1,
  },
  list: {
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.xxl,
  },
  row: {
    gap: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  cardWrap: {
    flex: 1,
    maxWidth: '50%',
  },
  empty: {
    alignItems: 'center',
    paddingTop: 40,
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
