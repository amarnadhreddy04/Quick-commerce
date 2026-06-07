import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import CategoryProductPanel from '@/components/CategoryProductPanel';
import CategorySidePanel from '@/components/CategorySidePanel';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useCatalog } from '@/context/CatalogContext';
import { Category } from '@/types';

export default function CategoriesScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { categories } = useCatalog();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);

  useEffect(() => {
    if (!categories.length) return;
    if (id) {
      const category = categories.find((item) => item.id === id);
      if (category) {
        setSelectedCategory(category);
        return;
      }
    }
    if (!selectedCategory) {
      setSelectedCategory(categories[0]);
    }
  }, [id, categories, selectedCategory]);

  if (!selectedCategory) {
    return null;
  }

  const handleCategorySelect = (category: Category) => {
    setSelectedCategory(category);
  };

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: insets.top,
          backgroundColor: colors.card,
        },
      ]}>
      <View style={styles.split}>
        <CategorySidePanel
          selectedId={selectedCategory.id}
          onSelect={handleCategorySelect}
        />
        <CategoryProductPanel category={selectedCategory} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  split: {
    flex: 1,
    flexDirection: 'row',
  },
});
