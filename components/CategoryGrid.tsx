import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import Colors from '@/constants/Colors';
import { categoryIconMap } from '@/constants/categoryIcons';
import { radius, spacing } from '@/constants/theme';
import { categories } from '@/data/mockData';
import { useColorScheme } from '@/components/useColorScheme';

export default function CategoryGrid() {
  const router = useRouter();
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
            <Ionicons
              name={categoryIconMap[category.icon] ?? 'grid-outline'}
              size={24}
              color={colors.primary}
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
  },
  name: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
});
