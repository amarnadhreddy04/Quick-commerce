import { Pressable, StyleSheet, Text, View } from 'react-native';

import ProductCartControls from '@/components/ProductCartControls';
import ProductImage from '@/components/ProductImage';
import Colors from '@/constants/Colors';
import { radius, shadows, spacing } from '@/constants/theme';
import { useProductDetail } from '@/context/ProductDetailContext';
import { useColorScheme } from '@/components/useColorScheme';
import { Product } from '@/types';

type Props = {
  product: Product;
};

export default function ProductListItem({ product }: Props) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const { openProduct } = useProductDetail();

  return (
    <Pressable
      onPress={() => openProduct(product)}
      style={[styles.card, shadows.card, { backgroundColor: colors.card }]}>
      <View style={[styles.imageWrap, { backgroundColor: colors.background }]}>
        <ProductImage product={product} style={styles.productImage} emojiStyle={styles.emoji} />
      </View>

      <View style={styles.info}>
        <Text style={[styles.brand, { color: colors.textSecondary }]}>{product.brand}</Text>
        <Text style={[styles.name, { color: colors.text }]} numberOfLines={2}>
          {product.name}
        </Text>
        <Text style={[styles.unit, { color: colors.textSecondary }]}>{product.unit}</Text>

        <View style={styles.footer}>
          <View style={styles.priceRow}>
            <Text style={[styles.price, { color: colors.text }]}>₹{product.price}</Text>
            {product.mrp ? (
              <Text style={[styles.mrp, { color: colors.textSecondary }]}>₹{product.mrp}</Text>
            ) : null}
          </View>
          {product.tag ? (
            <Text style={[styles.tag, { color: colors.accent }]}>{product.tag}</Text>
          ) : null}
        </View>
      </View>

      <ProductCartControls product={product} compact />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.lg,
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  imageWrap: {
    width: 64,
    height: 64,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  emoji: {
    fontSize: 32,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  brand: {
    fontSize: 11,
    fontWeight: '500',
  },
  name: {
    fontSize: 14,
    fontWeight: '600',
  },
  unit: {
    fontSize: 11,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  price: {
    fontSize: 15,
    fontWeight: '700',
  },
  mrp: {
    fontSize: 11,
    textDecorationLine: 'line-through',
  },
  tag: {
    fontSize: 10,
    fontWeight: '700',
  },
});
