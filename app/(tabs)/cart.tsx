import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import ProductCartControls from '@/components/ProductCartControls';
import ProductImage from '@/components/ProductImage';
import Colors from '@/constants/Colors';
import { radius, shadows, spacing } from '@/constants/theme';
import { useCatalog } from '@/context/CatalogContext';
import { useCart } from '@/context/CartContext';
import { useColorScheme } from '@/components/useColorScheme';
import { calculateOrderTotal, freeDeliveryMessage } from '@/lib/cartFees';
import type { Product } from '@/types';

export default function CartScreen() {
  const router = useRouter();
  const { settings, products } = useCatalog();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const { items, subtotal } = useCart();
  const productById = new Map(products.map((product) => [product.id, product]));
  const deliverySlot = settings.deliverySlot;

  if (items.length === 0) {
    return (
      <View style={[styles.empty, { backgroundColor: colors.background }]}>
        <Ionicons name="basket-outline" size={64} color={colors.textSecondary} />
        <Text style={[styles.emptyTitle, { color: colors.text }]}>Your basket is empty</Text>
        <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
          Add milk, bread, and daily essentials for tomorrow morning delivery.
        </Text>
      </View>
    );
  }

  const { deliveryFee, total } = calculateOrderTotal(subtotal);
  const deliveryHint = freeDeliveryMessage(subtotal);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.slotCard, { backgroundColor: colors.wallet, borderColor: colors.border }]}>
          <Ionicons name="time-outline" size={20} color={colors.primary} />
          <View>
            <Text style={[styles.slotLabel, { color: colors.textSecondary }]}>Delivery Slot</Text>
            <Text style={[styles.slotValue, { color: colors.text }]}>{deliverySlot}</Text>
          </View>
        </View>

        {items.map((item) => {
          const liveProduct: Product = productById.get(item.product.id) ?? item.product;

          return (
            <View
              key={item.product.id}
              style={[styles.itemCard, shadows.card, { backgroundColor: colors.card }]}>
              <View style={styles.itemImageWrap}>
                <ProductImage product={liveProduct} style={styles.itemImage} emojiStyle={styles.emoji} />
              </View>
              <View style={styles.itemInfo}>
                <Text style={[styles.itemBrand, { color: colors.textSecondary }]}>{liveProduct.brand}</Text>
                <Text style={[styles.itemName, { color: colors.text }]}>{liveProduct.name}</Text>
                <Text style={[styles.itemUnit, { color: colors.textSecondary }]}>{liveProduct.unit}</Text>
                <Text style={[styles.itemPrice, { color: colors.text }]}>₹{liveProduct.price * item.quantity}</Text>
              </View>
              <ProductCartControls product={liveProduct} compact />
            </View>
          );
        })}

        {deliveryHint ? (
          <View style={[styles.deliveryBanner, { backgroundColor: colors.wallet, borderColor: colors.primary }]}>
            <Ionicons name="information-circle-outline" size={20} color={colors.primary} />
            <Text style={[styles.deliveryHint, { color: colors.text }]}>{deliveryHint}</Text>
          </View>
        ) : null}

        <View style={[styles.summary, shadows.card, { backgroundColor: colors.card }]}>
          <SummaryRow label="Subtotal" value={`₹${subtotal}`} colors={colors} />
          <SummaryRow
            label="Delivery Fee"
            value={deliveryFee === 0 ? 'FREE' : `₹${deliveryFee}`}
            colors={colors}
            highlight={deliveryFee === 0}
          />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <SummaryRow label="Total" value={`₹${total}`} colors={colors} bold />
        </View>
      </ScrollView>

      <View style={[styles.footer, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
        <View>
          <Text style={[styles.footerLabel, { color: colors.textSecondary }]}>Total payable</Text>
          <Text style={[styles.footerTotal, { color: colors.text }]}>₹{total}</Text>
        </View>
        <Pressable
          onPress={() => router.push('/payment')}
          style={[styles.checkoutButton, { backgroundColor: colors.primary }]}>
          <Text style={styles.checkoutText}>Place Order</Text>
        </Pressable>
      </View>
    </View>
  );
}

function SummaryRow({
  label,
  value,
  colors,
  bold,
  highlight,
}: {
  label: string;
  value: string;
  colors: (typeof Colors)['light'];
  bold?: boolean;
  highlight?: boolean;
}) {
  return (
    <View style={styles.summaryRow}>
      <Text style={[styles.summaryLabel, { color: colors.textSecondary }, bold && { color: colors.text, fontWeight: '700' }]}>
        {label}
      </Text>
      <Text style={[styles.summaryValue, { color: colors.text }, bold && { fontWeight: '800', fontSize: 18 }, highlight && { color: colors.success }]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: 120 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xxl, gap: spacing.md },
  emptyTitle: { fontSize: 20, fontWeight: '700' },
  emptySubtitle: { textAlign: 'center', lineHeight: 22 },
  slotCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg, borderRadius: radius.lg, borderWidth: 1 },
  slotLabel: { fontSize: 12 },
  slotValue: { fontSize: 14, fontWeight: '600' },
  itemCard: { flexDirection: 'row', alignItems: 'center', padding: spacing.lg, borderRadius: radius.lg, gap: spacing.md },
  itemImageWrap: {
    width: 56,
    height: 56,
    borderRadius: radius.md,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemImage: { width: '100%', height: '100%' },
  emoji: { fontSize: 36 },
  itemInfo: { flex: 1, gap: 2 },
  itemBrand: { fontSize: 11 },
  itemName: { fontSize: 15, fontWeight: '600' },
  itemUnit: { fontSize: 12 },
  itemPrice: { fontSize: 15, fontWeight: '700', marginTop: spacing.xs },
  deliveryBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  summary: { padding: spacing.lg, borderRadius: radius.lg, gap: spacing.sm },
  deliveryHint: { flex: 1, fontSize: 14, lineHeight: 20, fontWeight: '500' },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryLabel: { fontSize: 14 },
  summaryValue: { fontSize: 14, fontWeight: '600' },
  divider: { height: 1, marginVertical: spacing.xs },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderTopWidth: 1,
  },
  footerLabel: { fontSize: 12 },
  footerTotal: { fontSize: 22, fontWeight: '800' },
  checkoutButton: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderRadius: radius.md, minWidth: 160, alignItems: 'center' },
  checkoutText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
});
