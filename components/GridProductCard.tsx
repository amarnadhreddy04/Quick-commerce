import { StyleSheet, Text, View } from 'react-native';

import ProductImage from '@/components/ProductImage';
import QuantityStepper from '@/components/QuantityStepper';
import Colors from '@/constants/Colors';
import { radius, spacing } from '@/constants/theme';
import { useCart } from '@/context/CartContext';
import { useColorScheme } from '@/components/useColorScheme';
import { Product } from '@/types';

type Props = {
  product: Product;
};

export default function GridProductCard({ product }: Props) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const { addItem, updateQuantity, getQuantity } = useCart();
  const quantity = getQuantity(product.id);
  const discount = product.mrp ? product.mrp - product.price : 0;

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {discount > 0 ? (
        <View style={styles.discountRibbon}>
          <Text style={styles.discountText}>₹{discount} OFF</Text>
        </View>
      ) : null}

      <View style={[styles.imageWrap, { backgroundColor: colors.background }]}>
        <ProductImage product={product} style={styles.productImage} emojiStyle={styles.emoji} />
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
        <QuantityStepper
          quantity={quantity}
          onIncrease={() => (quantity === 0 ? addItem(product) : updateQuantity(product.id, quantity + 1))}
          onDecrease={() => updateQuantity(product.id, quantity - 1)}
          compact
        />
      </View>
    </View>
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
