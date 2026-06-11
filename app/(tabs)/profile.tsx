import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import Colors from '@/constants/Colors';
import { radius, shadows, spacing } from '@/constants/theme';
import { useReferralEnabled } from '@/hooks/useReferralEnabled';
import { useWalletEnabled } from '@/hooks/useWalletEnabled';
import { useAuth } from '@/context/AuthContext';
import { useDeliveryArea } from '@/context/DeliveryAreaContext';
import { useSignOut } from '@/hooks/useSignOut';
import { getNotificationsEnabled } from '@/lib/notificationPrefs';
import { useColorScheme } from '@/components/useColorScheme';

type MenuRoute =
  | '/profile/address'
  | '/profile/wallet'
  | '/profile/refer'
  | '/profile/email'
  | '/profile/notifications'
  | '/profile/help';

export default function ProfileScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { activeAddress } = useDeliveryArea();
  const signOut = useSignOut();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const walletEnabled = useWalletEnabled();
  const referralEnabled = useReferralEnabled();
  const [notificationsOn, setNotificationsOn] = useState(true);

  useFocusEffect(
    useCallback(() => {
      getNotificationsEnabled().then(setNotificationsOn).catch(() => undefined);
    }, [])
  );

  const initials = user?.name
    ?.split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const menuItems: Array<{
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    value: string;
    route: MenuRoute;
  }> = [
    {
      icon: 'location-outline',
      label: 'Delivery Address',
      value: activeAddress?.label ?? user?.location ?? 'Not set',
      route: '/profile/address',
    },
    ...(walletEnabled
      ? [
          {
            icon: 'wallet-outline' as const,
            label: 'Wallet',
            value: `₹${(user?.walletBalance ?? 0).toFixed(2)}`,
            route: '/profile/wallet' as const,
          },
        ]
      : []),
    ...(referralEnabled
      ? [
          {
            icon: 'gift-outline' as const,
            label: 'Refer & Earn',
            value: user?.referralCode ?? 'Share code',
            route: '/profile/refer' as const,
          },
        ]
      : []),
    {
      icon: 'mail-outline',
      label: 'Email',
      value: user?.email ?? '',
      route: '/profile/email',
    },
    {
      icon: 'notifications-outline',
      label: 'Notifications',
      value: notificationsOn ? 'On' : 'Off',
      route: '/profile/notifications',
    },
    {
      icon: 'help-circle-outline',
      label: 'Help & Support',
      value: '',
      route: '/profile/help',
    },
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
            <Pressable
              style={({ pressed }) => [styles.menuRow, pressed && styles.menuRowPressed]}
              onPress={() => router.push(item.route)}>
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
            </Pressable>
            {index < menuItems.length - 1 ? (
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
            ) : null}
          </View>
        ))}
      </View>

      <Pressable
        onPress={() => signOut().catch(() => undefined)}
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
  menuRowPressed: {
    opacity: 0.7,
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
