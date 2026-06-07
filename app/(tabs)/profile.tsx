import { Ionicons } from '@expo/vector-icons';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import Colors from '@/constants/Colors';
import { radius, shadows, spacing } from '@/constants/theme';
import { userLocation, walletBalance } from '@/data/mockData';
import { useColorScheme } from '@/components/useColorScheme';

const menuItems = [
  { icon: 'location-outline' as const, label: 'Delivery Address', value: userLocation },
  { icon: 'wallet-outline' as const, label: 'Wallet', value: `₹${walletBalance.toFixed(2)}` },
  { icon: 'repeat-outline' as const, label: 'Subscriptions', value: '2 active' },
  { icon: 'notifications-outline' as const, label: 'Notifications', value: 'On' },
  { icon: 'help-circle-outline' as const, label: 'Help & Support', value: '' },
  { icon: 'document-text-outline' as const, label: 'Terms & Policies', value: '' },
];

export default function ProfileScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}>
      <View style={[styles.profileCard, shadows.card, { backgroundColor: colors.card }]}>
        <View style={[styles.avatar, { backgroundColor: colors.wallet }]}>
          <Text style={[styles.avatarText, { color: colors.primary }]}>AK</Text>
        </View>
        <View>
          <Text style={[styles.name, { color: colors.text }]}>Amar Kumar</Text>
          <Text style={[styles.phone, { color: colors.textSecondary }]}>+91 98765 43210</Text>
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
                  <Text style={[styles.menuValue, { color: colors.textSecondary }]}>
                    {item.value}
                  </Text>
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

      <View style={[styles.infoCard, { backgroundColor: colors.wallet, borderColor: colors.border }]}>
        <Ionicons name="information-circle-outline" size={22} color={colors.primary} />
        <Text style={[styles.infoText, { color: colors.text }]}>
          This is a demo Milkbasket-style app built with React Native and Expo. Connect a backend
          API to enable real orders, payments, and delivery tracking.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
    paddingBottom: spacing.xxl,
  },
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
  avatarText: {
    fontSize: 20,
    fontWeight: '800',
  },
  name: {
    fontSize: 18,
    fontWeight: '700',
  },
  phone: {
    fontSize: 14,
    marginTop: 2,
  },
  menuCard: {
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  menuLabel: {
    fontSize: 15,
    fontWeight: '500',
  },
  menuRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  menuValue: {
    fontSize: 13,
  },
  divider: {
    height: 1,
    marginLeft: 52,
  },
  infoCard: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
  },
});
