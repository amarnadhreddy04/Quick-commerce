import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import Colors from '@/constants/Colors';
import { radius, shadows, spacing } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useColorScheme } from '@/components/useColorScheme';
import { fetchRiderHistory, fetchRiderProfile, type RiderDelivery, type RiderProfile } from '@/lib/api';

export default function RiderProfileScreen() {
  const { user, token, logout } = useAuth();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const [profile, setProfile] = useState<RiderProfile | null>(null);
  const [history, setHistory] = useState<RiderDelivery[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      if (!token) return;
      setLoading(true);
      Promise.all([fetchRiderProfile(token), fetchRiderHistory(token)])
        .then(([profileRes, historyRes]) => {
          setProfile(profileRes.rider);
          setHistory(historyRes.orders);
        })
        .catch(() => {
          setProfile(null);
          setHistory([]);
        })
        .finally(() => setLoading(false));
    }, [token])
  );

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
      contentContainerStyle={styles.content}>
      <View style={[styles.card, shadows.card, { backgroundColor: colors.card }]}>
        <View style={[styles.avatar, { backgroundColor: colors.wallet }]}>
          <Ionicons name="bicycle" size={28} color={colors.primary} />
        </View>
        <Text style={[styles.name, { color: colors.text }]}>{profile?.name ?? user?.name}</Text>
        <Text style={[styles.meta, { color: colors.textSecondary }]}>{user?.email}</Text>
        <Text style={[styles.meta, { color: colors.textSecondary }]}>
          {profile?.phone} · {profile?.vehicleType ?? 'bike'} · Pincode {profile?.pincode}
        </Text>
      </View>

      <View style={[styles.statsRow, shadows.card, { backgroundColor: colors.card }]}>
        <View style={styles.stat}>
          <Text style={[styles.statValue, { color: colors.primary }]}>
            {profile?.deliveredOrders ?? profile?.deliveriesCount ?? 0}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Delivered</Text>
        </View>
        <View style={styles.stat}>
          <Text style={[styles.statValue, { color: colors.primary }]}>{history.length}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Recent</Text>
        </View>
      </View>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent deliveries</Text>
      {history.length === 0 ? (
        <Text style={[styles.meta, { color: colors.textSecondary }]}>No completed deliveries yet.</Text>
      ) : (
        history.slice(0, 5).map((order) => (
          <View
            key={order.id}
            style={[styles.historyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.historyId, { color: colors.text }]}>{order.id}</Text>
            <Text style={[styles.meta, { color: colors.textSecondary }]}>
              {order.customerName} · ₹{order.total}
            </Text>
          </View>
        ))
      )}

      <Pressable
        style={[styles.logoutBtn, { borderColor: colors.border }]}
        onPress={() => logout()}>
        <Text style={styles.logoutText}>Sign out</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  card: { borderRadius: radius.lg, padding: spacing.xl, alignItems: 'center', marginBottom: spacing.md },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  name: { fontSize: 20, fontWeight: '700' },
  meta: { fontSize: 14, marginTop: 4, textAlign: 'center' },
  statsRow: {
    flexDirection: 'row',
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 28, fontWeight: '800' },
  statLabel: { fontSize: 13, marginTop: 4 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: spacing.sm },
  historyCard: {
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  historyId: { fontWeight: '700' },
  logoutBtn: {
    marginTop: spacing.xl,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  logoutText: { color: '#DC2626', fontWeight: '700' },
});
