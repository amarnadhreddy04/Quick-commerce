import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import QuantityStepper from '@/components/QuantityStepper';
import Colors from '@/constants/Colors';
import { radius, shadows, spacing } from '@/constants/theme';
import { useCatalog } from '@/context/CatalogContext';
import { useCart } from '@/context/CartContext';
import { useColorScheme } from '@/components/useColorScheme';

export default function CartScreen() {
  const router = useRouter();
  const { settings } = useCatalog();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const { items, subtotal, updateQuantity, getQuantity } = useCart();
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

  const deliveryFee = subtotal >= settings.minOrderValue * 2 ? 0 : settings.deliveryFee;
  const total = subtotal + deliveryFee;

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

        {items.map((item) => (
          <View
            key={item.product.id}
            style={[styles.itemCard, shadows.card, { backgroundColor: colors.card }]}>
            <Text style={styles.emoji}>{item.product.image}</Text>
            <View style={styles.itemInfo}>
              <Text style={[styles.itemBrand, { color: colors.textSecondary }]}>{item.product.brand}</Text>
              <Text style={[styles.itemName, { color: colors.text }]}>{item.product.name}</Text>
              <Text style={[styles.itemUnit, { color: colors.textSecondary }]}>{item.product.unit}</Text>
              <Text style={[styles.itemPrice, { color: colors.text }]}>₹{item.product.price * item.quantity}</Text>
            </View>
            <QuantityStepper
              quantity={getQuantity(item.product.id)}
              onIncrease={() => updateQuantity(item.product.id, item.quantity + 1)}
              onDecrease={() => updateQuantity(item.product.id, item.quantity - 1)}
            />
          </View>
        ))}

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
  emoji: { fontSize: 36 },
  itemInfo: { flex: 1, gap: 2 },
  itemBrand: { fontSize: 11 },
  itemName: { fontSize: 15, fontWeight: '600' },
  itemUnit: { fontSize: 12 },
  itemPrice: { fontSize: 15, fontWeight: '700', marginTop: spacing.xs },
  summary: { padding: spacing.lg, borderRadius: radius.lg, gap: spacing.sm },
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
