import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import Colors from '@/constants/Colors';
import { radius, spacing } from '@/constants/theme';
import { useColorScheme } from '@/components/useColorScheme';
import { SubCategory } from '@/types';

type Props = {
  items: SubCategory[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
};

export default function SubCategoryPills({ items, selectedId, onSelect }: Props) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  if (items.length === 0) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}>
      <Pressable
        onPress={() => onSelect(null)}
        style={[
          styles.pill,
          {
            backgroundColor: selectedId === null ? colors.primary : colors.card,
            borderColor: selectedId === null ? colors.primary : colors.border,
          },
        ]}>
        <Text
          style={[
            styles.pillText,
            { color: selectedId === null ? '#FFFFFF' : colors.text },
          ]}>
          All
        </Text>
      </Pressable>

      {items.map((item) => {
        const isSelected = selectedId === item.id;
        return (
          <Pressable
            key={item.id}
            onPress={() => onSelect(item.id)}
            style={[
              styles.pill,
              {
                backgroundColor: isSelected ? colors.primary : colors.card,
                borderColor: isSelected ? colors.primary : colors.border,
              },
            ]}>
            <Text
              style={[
                styles.pillText,
                { color: isSelected ? '#FFFFFF' : colors.text },
              ]}>
              {item.name}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  pill: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  pillText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
