import { Ionicons } from '@expo/vector-icons';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import Colors from '@/constants/Colors';
import { radius, shadows, spacing } from '@/constants/theme';
import { useColorScheme } from '@/components/useColorScheme';
import { useCatalog } from '@/context/CatalogContext';
import type { Order } from '@/types';

const statusConfig: Record<
  Order['status'],
  { label: string; color: string; icon: keyof typeof Ionicons.glyphMap }
> = {
  delivered: { label: 'Delivered', color: '#10B981', icon: 'checkmark-circle' },
  scheduled: { label: 'Scheduled', color: '#F59E0B', icon: 'time' },
  cancelled: { label: 'Cancelled', color: '#EF4444', icon: 'close-circle' },
  pending_payment: { label: 'Payment Pending', color: '#6366F1', icon: 'card' },
};

export default function OrdersScreen() {
  const { orders, products } = useCatalog();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const subscriptionProducts = products.filter((product) => product.subscription);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Active Subscriptions</Text>
      {subscriptionProducts.length === 0 ? (
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
          No active subscriptions yet.
        </Text>
      ) : (
        subscriptionProducts.map((product) => (
          <View
            key={product.id}
            style={[styles.subCard, shadows.card, { backgroundColor: colors.card }]}>
            <Text style={styles.emoji}>{product.image}</Text>
            <View style={styles.subInfo}>
              <Text style={[styles.subName, { color: colors.text }]}>{product.name}</Text>
              <Text style={[styles.subMeta, { color: colors.textSecondary }]}>
                Daily · Next: Tomorrow morning
              </Text>
            </View>
            <View style={[styles.subBadge, { backgroundColor: colors.wallet }]}>
              <Text style={[styles.subBadgeText, { color: colors.primary }]}>Active</Text>
            </View>
          </View>
        ))
      )}

      <Text style={[styles.sectionTitle, { color: colors.text, marginTop: spacing.xl }]}>
        Order History
      </Text>
      {orders.length === 0 ? (
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
          No orders yet. Add items to your basket to place an order.
        </Text>
      ) : (
        orders.map((order) => {
          const status = statusConfig[order.status] ?? statusConfig.scheduled;
          return (
            <View
              key={order.id}
              style={[styles.orderCard, shadows.card, { backgroundColor: colors.card }]}>
              <View style={styles.orderHeader}>
                <View>
                  <Text style={[styles.orderId, { color: colors.text }]}>{order.id}</Text>
                  <Text style={[styles.orderDate, { color: colors.textSecondary }]}>
                    {order.date}
                  </Text>
                </View>
                <View style={styles.statusRow}>
                  <Ionicons name={status.icon} size={16} color={status.color} />
                  <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
                </View>
              </View>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <View style={styles.orderFooter}>
                <Text style={[styles.orderMeta, { color: colors.textSecondary }]}>
                  {order.items} items · {order.deliverySlot}
                </Text>
                <Text style={[styles.orderTotal, { color: colors.text }]}>₹{order.total}</Text>
              </View>
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: spacing.md,
  },
  emptyText: {
    fontSize: 14,
    marginBottom: spacing.md,
  },
  subCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderRadius: radius.lg,
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  emoji: {
    fontSize: 32,
  },
  subInfo: {
    flex: 1,
    gap: 4,
  },
  subName: {
    fontSize: 15,
    fontWeight: '600',
  },
  subMeta: {
    fontSize: 12,
  },
  subBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
  },
  subBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  orderCard: {
    padding: spacing.lg,
    borderRadius: radius.lg,
    marginBottom: spacing.md,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  orderId: {
    fontSize: 15,
    fontWeight: '700',
  },
  orderDate: {
    fontSize: 12,
    marginTop: 2,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    marginVertical: spacing.md,
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderMeta: {
    fontSize: 12,
  },
  orderTotal: {
    fontSize: 16,
    fontWeight: '700',
  },
});
