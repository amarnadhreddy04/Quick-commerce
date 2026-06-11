import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import Colors from '@/constants/Colors';
import { radius, shadows, spacing } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useColorScheme } from '@/components/useColorScheme';
import { fetchRiderQueue, type RiderDelivery } from '@/lib/api';

const statusLabels: Record<string, string> = {
  assigned: 'Ready to pick up',
  out_for_delivery: 'Out for delivery',
};

export default function RiderDeliveriesScreen() {
  const router = useRouter();
  const { token } = useAuth();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const [orders, setOrders] = useState<RiderDelivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    const { orders: rows } = await fetchRiderQueue(token);
    setOrders(rows);
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load()
        .catch(() => setOrders([]))
        .finally(() => setLoading(false));
    }, [load])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      <Text style={[styles.heading, { color: colors.text }]}>
        {orders.length} delivery{orders.length === 1 ? '' : 's'} assigned
      </Text>

      {orders.length === 0 ? (
        <View style={[styles.emptyCard, shadows.card, { backgroundColor: colors.card }]}>
          <Ionicons name="checkmark-circle-outline" size={48} color={colors.primary} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>All caught up</Text>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            New deliveries appear here once vendors finish packing and an order is assigned to you.
          </Text>
        </View>
      ) : (
        orders.map((order) => (
          <Pressable
            key={order.id}
            style={[styles.card, shadows.card, { backgroundColor: colors.card }]}
            onPress={() => router.push(`/(rider)/delivery/${order.id}`)}>
            <View style={styles.cardTop}>
              <Text style={[styles.orderId, { color: colors.text }]}>{order.id}</Text>
              <View style={[styles.badge, { backgroundColor: colors.wallet }]}>
                <Text style={[styles.badgeText, { color: colors.primary }]}>
                  {statusLabels[order.riderStatus ?? 'assigned'] ?? order.riderStatus}
                </Text>
              </View>
            </View>
            <Text style={[styles.customer, { color: colors.text }]}>{order.customerName}</Text>
            <Text style={[styles.meta, { color: colors.textSecondary }]}>
              {order.deliveryAddress?.fullAddress || order.customerPincode || 'Address on file'}
            </Text>
            <View style={styles.row}>
              <Text style={[styles.meta, { color: colors.textSecondary }]}>
                {order.items} items · ₹{order.total}
              </Text>
              <Text style={[styles.meta, { color: colors.textSecondary }]}>{order.deliverySlot}</Text>
            </View>
          </Pressable>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  heading: { fontSize: 18, fontWeight: '700', marginBottom: spacing.md },
  emptyCard: {
    borderRadius: radius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  emptyTitle: { fontSize: 18, fontWeight: '700' },
  emptyText: { textAlign: 'center', lineHeight: 22 },
  card: {
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderId: { fontSize: 16, fontWeight: '700' },
  badge: { borderRadius: radius.full, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { fontSize: 12, fontWeight: '600' },
  customer: { fontSize: 15, fontWeight: '600' },
  meta: { fontSize: 13, lineHeight: 18 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.xs },
});
