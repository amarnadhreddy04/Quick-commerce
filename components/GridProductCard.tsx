import { Pressable, StyleSheet, Text, View } from 'react-native';

import ProductCartControls from '@/components/ProductCartControls';
import ProductImageGallery from '@/components/ProductImageGallery';
import Colors from '@/constants/Colors';
import { radius, spacing } from '@/constants/theme';
import { useProductDetail } from '@/context/ProductDetailContext';
import { useColorScheme } from '@/components/useColorScheme';
import { isOutOfStock } from '@/lib/productStock';
import { Product } from '@/types';

type Props = {
  product: Product;
};

export default function GridProductCard({ product }: Props) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const { openProduct } = useProductDetail();
  const outOfStock = isOutOfStock(product);
  const discount = product.mrp ? product.mrp - product.price : 0;

  return (
    <Pressable
      onPress={() => openProduct(product)}
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {discount > 0 ? (
        <View style={styles.discountRibbon}>
          <Text style={styles.discountText}>₹{discount} OFF</Text>
        </View>
      ) : null}

      <View style={[styles.imageWrap, { backgroundColor: colors.background }]}>
        <ProductImageGallery product={product} style={styles.productImage} emojiStyle={styles.emoji} />
        {outOfStock ? (
          <View style={styles.outOfStockOverlay}>
            <Text style={styles.outOfStockOverlayText}>OUT OF STOCK</Text>
          </View>
        ) : null}
      </View>

      <Text style={[styles.brand, { color: colors.textSecondary }]} numberOfLines={1}>
        {product.brand}
      </Text>
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
      </View>

      <View style={styles.addRow}>
        <ProductCartControls product={product} compact />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    position: 'relative',
    overflow: 'hidden',
  },
  discountRibbon: {
    position: 'absolute',
    top: 0,
    left: 0,
    backgroundColor: '#FBBF24',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderBottomRightRadius: radius.sm,
    zIndex: 1,
  },
  discountText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#1A1A1A',
  },
  imageWrap: {
    height: 100,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
    overflow: 'hidden',
    position: 'relative',
  },
  outOfStockOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
  },
  outOfStockOverlayText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  emoji: {
    fontSize: 48,
  },
  brand: {
    fontSize: 10,
    fontWeight: '500',
  },
  name: {
    fontSize: 12,
    fontWeight: '600',
    minHeight: 32,
    marginTop: 2,
  },
  unit: {
    fontSize: 10,
    marginBottom: spacing.sm,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  price: {
    fontSize: 14,
    fontWeight: '800',
  },
  mrp: {
    fontSize: 10,
    textDecorationLine: 'line-through',
  },
  addRow: {
    alignItems: 'flex-end',
  },
});
