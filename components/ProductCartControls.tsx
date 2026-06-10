import { StyleSheet, Text, View } from 'react-native';

import QuantityStepper from '@/components/QuantityStepper';
import StockNotifyButton from '@/components/StockNotifyButton';
import Colors from '@/constants/Colors';
import { radius, spacing } from '@/constants/theme';
import { useCart } from '@/context/CartContext';
import { useColorScheme } from '@/components/useColorScheme';
import { canIncreaseQuantity, isOutOfStock, OUT_OF_STOCK_MESSAGE } from '@/lib/productStock';
import type { Product } from '@/types';

type Props = {
  product: Product;
  compact?: boolean;
  showNotifyText?: boolean;
};

export default function ProductCartControls({ product, compact = false, showNotifyText = false }: Props) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const { addItem, updateQuantity, getQuantity } = useCart();
  const quantity = getQuantity(product.id);
  const outOfStock = isOutOfStock(product);

  if (outOfStock) {
    return (
      <View style={[styles.outOfStockWrap, compact && styles.outOfStockWrapCompact]}>
        <View style={[styles.outOfStockBadge, { backgroundColor: '#FEE2E2' }]}>
          <Text style={styles.outOfStockText}>OUT OF STOCK</Text>
        </View>
        <StockNotifyButton productId={product.id} productName={product.name} compact={compact} />
        {showNotifyText ? (
          <Text style={[styles.notifyText, { color: colors.textSecondary }]}>{OUT_OF_STOCK_MESSAGE}</Text>
        ) : null}
      </View>
    );
  }

  return (
    <QuantityStepper
      quantity={quantity}
      compact={compact}
      disableIncrease={!canIncreaseQuantity(product, quantity)}
      onIncrease={() => {
        if (quantity === 0) {
          addItem(product);
          return;
        }
        updateQuantity(product.id, quantity + 1);
      }}
      onDecrease={() => updateQuantity(product.id, quantity - 1)}
    />
  );
}

const styles = StyleSheet.create({
  outOfStockWrap: {
    alignItems: 'flex-start',
    gap: spacing.xs,
    maxWidth: 160,
  },
  outOfStockWrapCompact: {
    alignItems: 'flex-end',
  },
  outOfStockBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
  },
  outOfStockText: {
    color: '#B91C1C',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  notifyText: {
    fontSize: 10,
    lineHeight: 14,
  },
});
