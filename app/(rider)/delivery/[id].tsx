import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import Colors from '@/constants/Colors';
import { radius, shadows, spacing } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useColorScheme } from '@/components/useColorScheme';
import { fetchOrder, updateRiderDeliveryStatus, type RiderDeliveryDetail } from '@/lib/api';

export default function RiderDeliveryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { token } = useAuth();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const [order, setOrder] = useState<RiderDeliveryDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token || !id) return;
    fetchOrder(id, token)
      .then((response) => setOrder(response.order as RiderDeliveryDetail))
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [token, id]);

  const updateStatus = async (status: 'out_for_delivery' | 'delivered') => {
    if (!token || !id) return;
    setUpdating(true);
    setError('');
    try {
      const response = await updateRiderDeliveryStatus(token, id, status);
      setOrder(response.order);
      if (status === 'delivered') {
        router.replace('/(rider)/deliveries');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setUpdating(false);
    }
  };

  const callCustomer = () => {
    const phone = order?.customerPhone?.replace(/\D/g, '');
    if (phone) {
      Linking.openURL(`tel:${phone}`);
    }
  };

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!order) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.text }}>{error || 'Delivery not found'}</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}>
      <View style={[styles.card, shadows.card, { backgroundColor: colors.card }]}>
        <Text style={[styles.orderId, { color: colors.text }]}>{order.id}</Text>
        <Text style={[styles.slot, { color: colors.textSecondary }]}>{order.deliverySlot}</Text>
        <Text style={[styles.status, { color: colors.primary }]}>
          {order.riderStatus === 'out_for_delivery' ? 'Out for delivery' : 'Assigned — pick up order'}
        </Text>
      </View>

      <View style={[styles.card, shadows.card, { backgroundColor: colors.card }]}>
        <Text style={[styles.section, { color: colors.text }]}>Customer</Text>
        <Text style={[styles.value, { color: colors.text }]}>{order.customerName}</Text>
        {order.customerPhone ? (
          <Pressable onPress={callCustomer} style={styles.phoneRow}>
            <Ionicons name="call-outline" size={18} color={colors.primary} />
            <Text style={[styles.phone, { color: colors.primary }]}>{order.customerPhone}</Text>
          </Pressable>
        ) : null}
        <Text style={[styles.address, { color: colors.textSecondary }]}>
          {order.deliveryAddress?.fullAddress || 'Address not available'}
        </Text>
        {order.customerPincode ? (
          <Text style={[styles.meta, { color: colors.textSecondary }]}>Pincode {order.customerPincode}</Text>
        ) : null}
      </View>

      <View style={[styles.card, shadows.card, { backgroundColor: colors.card }]}>
        <Text style={[styles.section, { color: colors.text }]}>Items ({order.items})</Text>
        {order.lineItems?.map((item) => (
          <View key={item.productId} style={styles.itemRow}>
            <Text style={[styles.itemName, { color: colors.text }]}>
              {item.productName} × {item.quantity}
            </Text>
            <Text style={[styles.meta, { color: colors.textSecondary }]}>₹{item.lineTotal}</Text>
          </View>
        ))}
        <Text style={[styles.total, { color: colors.text }]}>Collect ₹{order.total}</Text>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {order.riderStatus === 'assigned' ? (
        <Pressable
          style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
          disabled={updating}
          onPress={() => updateStatus('out_for_delivery')}>
          <Text style={styles.primaryBtnText}>{updating ? 'Updating...' : 'Start delivery'}</Text>
        </Pressable>
      ) : null}

      {order.riderStatus === 'out_for_delivery' ? (
        <Pressable
          style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
          disabled={updating}
          onPress={() => updateStatus('delivered')}>
          <Text style={styles.primaryBtnText}>{updating ? 'Updating...' : 'Mark delivered'}</Text>
        </Pressable>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  card: { borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md },
  orderId: { fontSize: 20, fontWeight: '800' },
  slot: { marginTop: 4 },
  status: { marginTop: spacing.sm, fontWeight: '600' },
  section: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', marginBottom: spacing.sm },
  value: { fontSize: 18, fontWeight: '700' },
  phoneRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.sm },
  phone: { fontWeight: '600' },
  address: { marginTop: spacing.sm, lineHeight: 22 },
  meta: { marginTop: 4 },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  itemName: { flex: 1, marginRight: spacing.sm },
  total: { marginTop: spacing.md, fontSize: 16, fontWeight: '700' },
  primaryBtn: {
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  error: { color: '#DC2626', marginBottom: spacing.sm },
});
