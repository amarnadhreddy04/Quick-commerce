import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import Colors from '@/constants/Colors';
import { categoryIconMap } from '@/constants/categoryIcons';
import { radius, spacing } from '@/constants/theme';
import { categories } from '@/data/mockData';
import { useColorScheme } from '@/components/useColorScheme';
import { Category } from '@/types';

type Props = {
  selectedId: string;
  onSelect: (category: Category) => void;
};

export default function CategorySidePanel({ selectedId, onSelect }: Props) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  return (
    <View style={[styles.panel, { backgroundColor: colors.card, borderRightColor: colors.border }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
        {categories.map((category) => {
          const isSelected = category.id === selectedId;

          return (
            <Pressable
              key={category.id}
              onPress={() => onSelect(category)}
              style={[
                styles.item,
                isSelected && { backgroundColor: colors.wallet, borderLeftColor: colors.primary },
              ]}>
              <View
                style={[
                  styles.iconWrap,
                  { backgroundColor: isSelected ? colors.card : category.color },
                ]}>
                <Ionicons
                  name={categoryIconMap[category.icon] ?? 'grid-outline'}
                  size={20}
                  color={isSelected ? colors.primary : colors.textSecondary}
                />
              </View>
              <Text
                style={[
                  styles.name,
                  { color: isSelected ? colors.primary : colors.text },
                  isSelected && styles.nameSelected,
                ]}
                numberOfLines={2}>
                {category.name}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    width: 96,
    borderRightWidth: 1,
  },
  list: {
    paddingVertical: spacing.sm,
  },
  item: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
    borderLeftWidth: 3,
    borderLeftColor: 'transparent',
    gap: spacing.sm,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 13,
  },
  nameSelected: {
    fontWeight: '700',
  },
});
