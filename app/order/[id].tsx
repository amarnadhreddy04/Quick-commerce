import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

import ProductImage from '@/components/ProductImage';
import Colors from '@/constants/Colors';
import { radius, shadows, spacing } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useColorScheme } from '@/components/useColorScheme';
import { fetchOrder } from '@/lib/api';
import { formatPaymentMethod, formatPaymentStatus } from '@/lib/paymentLabels';
import type { Order, OrderDetail } from '@/types';

const statusConfig: Record<
  Order['status'],
  { label: string; color: string; icon: keyof typeof Ionicons.glyphMap }
> = {
  delivered: { label: 'Delivered', color: '#10B981', icon: 'checkmark-circle' },
  scheduled: { label: 'Scheduled', color: '#F59E0B', icon: 'time' },
  cancelled: { label: 'Cancelled', color: '#EF4444', icon: 'close-circle' },
  pending_payment: { label: 'Payment Pending', color: '#6366F1', icon: 'card' },
};

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token } = useAuth();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id || !token) return;

    setLoading(true);
    setError(null);
    fetchOrder(id, token)
      .then((response) => setOrder(response.order))
      .catch((err: Error) => {
        const message = err.message.includes('404')
          ? 'Order details are unavailable. Restart the API server with "npm run server" and try again.'
          : err.message;
        setError(message);
      })
      .finally(() => setLoading(false));
  }, [id, token]);

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ title: 'Order Details' }} />
        <View style={[styles.centered, { backgroundColor: colors.background }]}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </>
    );
  }

  if (error || !order) {
    return (
      <>
        <Stack.Screen options={{ title: 'Order Details' }} />
        <View style={[styles.centered, { backgroundColor: colors.background }]}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.textSecondary} />
          <Text style={[styles.errorText, { color: colors.text }]}>{error ?? 'Order not found'}</Text>
        </View>
      </>
    );
  }

  const status = statusConfig[order.status] ?? statusConfig.scheduled;
  const hasLineItems = order.lineItems.length > 0;
  const subtotal = order.lineItems.reduce((sum, item) => sum + item.lineTotal, 0);
  const platformFee = order.platformFee ?? 0;
  const promoDiscount = order.promoDiscount ?? 0;
  const deliveryFee =
    order.deliveryFee != null
      ? order.deliveryFee
      : hasLineItems
        ? Math.max(0, order.total - subtotal + promoDiscount - platformFee)
        : 0;

  return (
    <>
      <Stack.Screen options={{ title: order.id }} />
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.content}>
        <View style={[styles.summaryCard, shadows.card, { backgroundColor: colors.card }]}>
          <View style={styles.summaryHeader}>
            <View>
              <Text style={[styles.orderId, { color: colors.text }]}>{order.id}</Text>
              <Text style={[styles.orderDate, { color: colors.textSecondary }]}>{order.date}</Text>
            </View>
            <View style={styles.statusRow}>
              <Ionicons name={status.icon} size={18} color={status.color} />
              <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <DetailRow label="Delivery slot" value={order.deliverySlot} colors={colors} />
          {order.paymentMethod ? (
            <DetailRow
              label="Payment method"
              value={formatPaymentMethod(order.paymentMethod)}
              colors={colors}
            />
          ) : null}
          {order.paymentStatus ? (
            <DetailRow
              label="Payment status"
              value={formatPaymentStatus(order.paymentStatus, order.paymentMethod)}
              colors={colors}
            />
          ) : null}
        </View>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Items ordered{order.items ? ` (${order.items})` : ''}
        </Text>

        {!hasLineItems ? (
          <View style={[styles.emptyItemsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="cube-outline" size={28} color={colors.textSecondary} />
            <Text style={[styles.emptyItemsTitle, { color: colors.text }]}>No product details found</Text>
            <Text style={[styles.emptyItemsText, { color: colors.textSecondary }]}>
              This order has {order.items} item{order.items === 1 ? '' : 's'}, but product records are missing.
              New orders will always show products here.
            </Text>
          </View>
        ) : null}

        {order.lineItems.map((item) => (
          <View
            key={`${item.productId}-${item.price}`}
            style={[styles.itemCard, shadows.card, { backgroundColor: colors.card }]}>
            <View style={styles.itemImageWrap}>
              <ProductImage
                product={{ id: item.productId, image: item.image }}
                style={styles.itemImage}
                emojiStyle={styles.emoji}
              />
            </View>
            <View style={styles.itemInfo}>
              <Text style={[styles.itemBrand, { color: colors.textSecondary }]}>{item.brand}</Text>
              <Text style={[styles.itemName, { color: colors.text }]}>{item.productName}</Text>
              <Text style={[styles.itemUnit, { color: colors.textSecondary }]}>{item.unit}</Text>
              <Text style={[styles.itemMeta, { color: colors.textSecondary }]}>
                Qty {item.quantity} × ₹{item.price}
              </Text>
            </View>
            <Text style={[styles.itemTotal, { color: colors.text }]}>₹{item.lineTotal}</Text>
          </View>
        ))}

        <View style={[styles.totalsCard, shadows.card, { backgroundColor: colors.card }]}>
          {hasLineItems ? (
            <>
              <TotalRow label="Subtotal" value={`₹${subtotal}`} colors={colors} />
              {promoDiscount > 0 ? (
                <TotalRow
                  label={`Promo (${order.promoCode})`}
                  value={`-₹${promoDiscount}`}
                  colors={colors}
                  highlight
                />
              ) : null}
              <TotalRow
                label="Delivery fee"
                value={deliveryFee === 0 ? 'FREE' : `₹${deliveryFee}`}
                colors={colors}
                highlight={deliveryFee === 0}
              />
              {platformFee > 0 ? (
                <TotalRow label="Platform fee" value={`₹${platformFee}`} colors={colors} />
              ) : null}
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
            </>
          ) : null}
          <TotalRow label="Order total" value={`₹${order.total}`} colors={colors} bold />
        </View>
      </ScrollView>
    </>
  );
}

function DetailRow({
  label,
  value,
  colors,
}: {
  label: string;
  value: string;
  colors: (typeof Colors)['light'];
}) {
  return (
    <View style={styles.detailRow}>
      <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.detailValue, { color: colors.text }]}>{value}</Text>
    </View>
  );
}

function TotalRow({
  label,
  value,
  colors,
  bold = false,
  highlight = false,
}: {
  label: string;
  value: string;
  colors: (typeof Colors)['light'];
  bold?: boolean;
  highlight?: boolean;
}) {
  return (
    <View style={styles.totalRow}>
      <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text
        style={[
          styles.totalValue,
          { color: highlight ? colors.primary : colors.text },
          bold && styles.totalValueBold,
        ]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.md },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  errorText: {
    fontSize: 15,
    textAlign: 'center',
  },
  summaryCard: {
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  orderId: {
    fontSize: 18,
    fontWeight: '800',
  },
  orderDate: {
    fontSize: 13,
    marginTop: 2,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    marginVertical: spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: 2,
  },
  detailLabel: {
    fontSize: 13,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginTop: spacing.sm,
  },
  emptyItemsCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm,
  },
  emptyItemsTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  emptyItemsText: {
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.lg,
    gap: spacing.md,
  },
  itemImageWrap: {
    width: 56,
    height: 56,
    borderRadius: radius.md,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemImage: { width: '100%', height: '100%' },
  emoji: { fontSize: 28 },
  itemInfo: { flex: 1, gap: 2 },
  itemBrand: { fontSize: 11, fontWeight: '500' },
  itemName: { fontSize: 14, fontWeight: '600' },
  itemUnit: { fontSize: 11 },
  itemMeta: { fontSize: 11, marginTop: 2 },
  itemTotal: { fontSize: 15, fontWeight: '800' },
  totalsCard: {
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: { fontSize: 14 },
  totalValue: { fontSize: 14, fontWeight: '600' },
  totalValueBold: { fontSize: 18, fontWeight: '800' },
});
