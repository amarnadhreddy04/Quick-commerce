import { Stack, useLocalSearchParams } from 'expo-router';
import { FlatList, StyleSheet, Text, View } from 'react-native';

import ProductCard from '@/components/ProductCard';
import Colors from '@/constants/Colors';
import { spacing } from '@/constants/theme';
import { useColorScheme } from '@/components/useColorScheme';
import { useCatalog } from '@/context/CatalogContext';

export default function CategoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { categories, products } = useCatalog();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const category = categories.find((item) => item.id === id);
  const categoryProducts = products.filter((product) => product.categoryId === id);

  return (
    <>
      <Stack.Screen options={{ title: category?.name ?? 'Category' }} />
      <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        {categoryProducts.length} items available
      </Text>
      <FlatList
        data={categoryProducts}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={[styles.empty, { color: colors.textSecondary }]}>
            No products found in {category?.name ?? 'this category'}.
          </Text>
        }
        renderItem={({ item }) => (
          <View style={styles.cardWrap}>
            <ProductCard product={item} fullWidth />
          </View>
        )}
      />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  subtitle: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    fontSize: 13,
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  row: {
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  cardWrap: {
    width: '48%',
  },
  empty: {
    textAlign: 'center',
    marginTop: spacing.xxl,
    fontSize: 14,
  },
});
