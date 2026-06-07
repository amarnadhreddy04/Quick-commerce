import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import Colors from '@/constants/Colors';
import { radius, shadows, spacing } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useColorScheme } from '@/components/useColorScheme';

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const initials = user?.name
    ?.split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const menuItems = [
    { icon: 'location-outline' as const, label: 'Delivery Address', value: user?.location ?? 'Not set' },
    { icon: 'wallet-outline' as const, label: 'Wallet', value: `₹${(user?.walletBalance ?? 0).toFixed(2)}` },
    { icon: 'mail-outline' as const, label: 'Email', value: user?.email ?? '' },
    { icon: 'notifications-outline' as const, label: 'Notifications', value: 'On' },
    { icon: 'help-circle-outline' as const, label: 'Help & Support', value: '' },
  ];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}>
      <View style={[styles.profileCard, shadows.card, { backgroundColor: colors.card }]}>
        <View style={[styles.avatar, { backgroundColor: colors.wallet }]}>
          <Text style={[styles.avatarText, { color: colors.primary }]}>{initials}</Text>
        </View>
        <View>
          <Text style={[styles.name, { color: colors.text }]}>{user?.name}</Text>
          <Text style={[styles.phone, { color: colors.textSecondary }]}>{user?.phone ?? 'Phone not added'}</Text>
        </View>
      </View>

      <View style={[styles.menuCard, shadows.card, { backgroundColor: colors.card }]}>
        {menuItems.map((item, index) => (
          <View key={item.label}>
            <View style={styles.menuRow}>
              <View style={styles.menuLeft}>
                <Ionicons name={item.icon} size={22} color={colors.primary} />
                <Text style={[styles.menuLabel, { color: colors.text }]}>{item.label}</Text>
              </View>
              <View style={styles.menuRight}>
                {item.value ? (
                  <Text style={[styles.menuValue, { color: colors.textSecondary }]}>{item.value}</Text>
                ) : null}
                <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
              </View>
            </View>
            {index < menuItems.length - 1 ? (
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
            ) : null}
          </View>
        ))}
      </View>

      <Pressable
        onPress={logout}
        style={[styles.logoutButton, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Ionicons name="log-out-outline" size={20} color="#EF4444" />
        <Text style={styles.logoutText}>Logout</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    padding: spacing.xl,
    borderRadius: radius.lg,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 20, fontWeight: '800' },
  name: { fontSize: 18, fontWeight: '700' },
  phone: { fontSize: 14, marginTop: 2 },
  menuCard: { borderRadius: radius.lg, overflow: 'hidden' },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  menuLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  menuLabel: { fontSize: 15, fontWeight: '500' },
  menuRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  menuValue: { fontSize: 13 },
  divider: { height: 1, marginLeft: 52 },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  logoutText: { color: '#EF4444', fontWeight: '700', fontSize: 15 },
});
