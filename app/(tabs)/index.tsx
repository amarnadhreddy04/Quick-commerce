import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';

import CategoryPills from '@/components/CategoryPills';
import CategorySections from '@/components/CategorySections';
import DeliveryBanner from '@/components/DeliveryBanner';
import HomeHeader from '@/components/HomeHeader';
import ProductCard from '@/components/ProductCard';
import SectionHeader from '@/components/SectionHeader';
import WalletBanner from '@/components/WalletBanner';
import Colors from '@/constants/Colors';
import { spacing } from '@/constants/theme';
import { useColorScheme } from '@/components/useColorScheme';
import { useCatalog } from '@/context/CatalogContext';
import { useSubscriptionEnabled } from '@/hooks/useSubscriptionEnabled';

export default function HomeScreen() {
  const router = useRouter();
  const { products } = useCatalog();
  const subscriptionEnabled = useSubscriptionEnabled();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const openCategories = (categoryId?: string) => {
    router.push({
      pathname: '/(tabs)/categories',
      params: categoryId ? { id: categoryId } : {},
    });
  };

  const dailyEssentials = products.filter((p) =>
    subscriptionEnabled ? p.subscription || p.tag : p.tag
  );
  const popularItems = products.slice(0, 8);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <HomeHeader />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <DeliveryBanner />
        <WalletBanner />
        <CategoryPills />

        <CategorySections onViewAll={() => openCategories()} />

        <SectionHeader
          title="Daily Essentials"
          actionLabel="See all"
          onAction={() => openCategories('milk')}
        />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.productRow}>
          {dailyEssentials.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </ScrollView>

        <SectionHeader
          title="Popular Items"
          actionLabel="See all"
          onAction={() => openCategories()}
        />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.productRow}>
          {popularItems.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </ScrollView>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingBottom: spacing.xxl,
  },
  productRow: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
});
