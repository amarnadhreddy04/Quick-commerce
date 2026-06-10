import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import CategoryRow from '@/components/CategoryRow';
import SectionHeader from '@/components/SectionHeader';
import { HOME_CATEGORY_SECTIONS } from '@/constants/categorySections';
import { spacing } from '@/constants/theme';
import { useCatalog } from '@/context/CatalogContext';
import type { Category } from '@/types';

type Props = {
  onViewAll?: () => void;
};

export default function CategorySections({ onViewAll }: Props) {
  const { categories } = useCatalog();

  const categoryMap = useMemo(
    () => new Map(categories.map((category) => [category.id, category])),
    [categories]
  );

  const sections = useMemo(
    () =>
      HOME_CATEGORY_SECTIONS.map((section) => ({
        ...section,
        categories: section.categoryIds
          .map((id) => categoryMap.get(id))
          .filter((category): category is Category => Boolean(category)),
      })).filter((section) => section.categories.length > 0),
    [categoryMap]
  );

  return (
    <View style={styles.wrap}>
      {sections.map((section, index) => (
        <View key={section.id} style={index > 0 ? styles.sectionGap : undefined}>
          <SectionHeader
            title={section.title}
            actionLabel={index === 0 ? 'View all' : undefined}
            onAction={index === 0 ? onViewAll : undefined}
          />
          <CategoryRow categories={section.categories} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: spacing.sm,
  },
  sectionGap: {
    marginTop: spacing.xs,
  },
});
