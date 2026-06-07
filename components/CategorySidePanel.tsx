import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import Colors from '@/constants/Colors';
import { radius, spacing } from '@/constants/theme';
import { useColorScheme } from '@/components/useColorScheme';
import { useCatalog } from '@/context/CatalogContext';
import { Category } from '@/types';

type Props = {
  selectedId: string;
  onSelect: (category: Category) => void;
};

export default function CategorySidePanel({ selectedId, onSelect }: Props) {
  const { categories } = useCatalog();
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
              style={styles.item}>
              <View
                style={[
                  styles.thumbnail,
                  {
                    backgroundColor: category.color,
                    borderColor: isSelected ? colors.primary : 'transparent',
                  },
                  isSelected && styles.thumbnailSelected,
                ]}>
                <Text style={styles.thumbnailEmoji}>{category.thumbnail}</Text>
              </View>
              <Text
                style={[
                  styles.name,
                  { color: isSelected ? colors.primary : colors.textSecondary },
                  isSelected && styles.nameSelected,
                ]}
                numberOfLines={2}>
                {category.name}
              </Text>
              {isSelected ? (
                <View style={[styles.activeBar, { backgroundColor: colors.primary }]} />
              ) : null}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    width: 88,
    borderRightWidth: 1,
  },
  list: {
    paddingVertical: spacing.sm,
    paddingBottom: spacing.xxl,
  },
  item: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
    position: 'relative',
    gap: spacing.sm,
  },
  thumbnail: {
    width: 52,
    height: 52,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  thumbnailSelected: {
    transform: [{ scale: 1.05 }],
  },
  thumbnailEmoji: {
    fontSize: 26,
  },
  name: {
    fontSize: 10,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 13,
    paddingHorizontal: 2,
  },
  nameSelected: {
    fontWeight: '700',
  },
  activeBar: {
    position: 'absolute',
    left: 0,
    top: '30%',
    width: 3,
    height: '40%',
    borderTopRightRadius: 4,
    borderBottomRightRadius: 4,
  },
});
