import { Pressable, StyleSheet, Text, View } from 'react-native';

import ProductCartControls from '@/components/ProductCartControls';
import ProductImageGallery from '@/components/ProductImageGallery';
import { useSubscriptionEnabled } from '@/hooks/useSubscriptionEnabled';
import Colors from '@/constants/Colors';
import { radius, shadows, spacing } from '@/constants/theme';
import { useProductDetail } from '@/context/ProductDetailContext';
import { useColorScheme } from '@/components/useColorScheme';
import { isOutOfStock } from '@/lib/productStock';
import { Product } from '@/types';

type Props = {
  product: Product;
  onPress?: () => void;
  fullWidth?: boolean;
};

export default function ProductCard({ product, onPress, fullWidth = false }: Props) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const { openProduct } = useProductDetail();
  const subscriptionEnabled = useSubscriptionEnabled();
  const outOfStock = isOutOfStock(product);

  return (
    <Pressable
      onPress={onPress ?? (() => openProduct(product))}
      style={[
        styles.card,
        fullWidth && styles.cardFullWidth,
        shadows.card,
        { backgroundColor: colors.card },
      ]}>
      <View style={[styles.imageWrap, { backgroundColor: colors.background }]}>
        <ProductImageGallery product={product} style={styles.productImage} emojiStyle={styles.emoji} />
        {outOfStock ? (
          <View style={styles.outOfStockOverlay}>
            <Text style={styles.outOfStockOverlayText}>OUT OF STOCK</Text>
          </View>
        ) : null}
        {subscriptionEnabled && product.subscription ? (
          <View style={[styles.badge, { backgroundColor: colors.wallet }]}>
            <Text style={[styles.badgeText, { color: colors.primary }]}>Subscribe</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.content}>
        <Text style={[styles.brand, { color: colors.textSecondary }]}>{product.brand}</Text>
        <Text style={[styles.name, { color: colors.text }]} numberOfLines={2}>
          {product.name}
        </Text>
        <Text style={[styles.unit, { color: colors.textSecondary }]}>{product.unit}</Text>

        <View style={styles.footer}>
          <View>
            <Text style={[styles.price, { color: colors.text }]}>₹{product.price}</Text>
            {product.mrp ? (
              <Text style={[styles.mrp, { color: colors.textSecondary }]}>₹{product.mrp}</Text>
            ) : null}
          </View>
          <ProductCartControls product={product} compact />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 160,
    borderRadius: radius.lg,
    overflow: 'hidden',
    marginRight: spacing.md,
  },
  cardFullWidth: {
    width: '100%',
    marginRight: 0,
  },
  imageWrap: {
    height: 110,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  emoji: {
    fontSize: 44,
  },
  badge: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  outOfStockOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  outOfStockOverlayText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  content: {
    padding: spacing.md,
    gap: 2,
  },
  brand: {
    fontSize: 11,
    fontWeight: '500',
  },
  name: {
    fontSize: 14,
    fontWeight: '600',
    minHeight: 36,
  },
  unit: {
    fontSize: 11,
    marginBottom: spacing.sm,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  price: {
    fontSize: 15,
    fontWeight: '700',
  },
  mrp: {
    fontSize: 11,
    textDecorationLine: 'line-through',
  },
});
