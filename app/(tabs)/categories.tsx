import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import CategoryProductPanel from '@/components/CategoryProductPanel';
import CategorySidePanel from '@/components/CategorySidePanel';
import Colors from '@/constants/Colors';
import { categories } from '@/data/mockData';
import { useColorScheme } from '@/components/useColorScheme';
import { Category } from '@/types';

export default function CategoriesScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const [selectedCategory, setSelectedCategory] = useState<Category>(categories[0]);

  useEffect(() => {
    if (!id) return;
    const category = categories.find((item) => item.id === id);
    if (category) {
      setSelectedCategory(category);
    }
  }, [id]);

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
          onSelect={setSelectedCategory}
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
