import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import Colors from '@/constants/Colors';
import { radius, spacing } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useWalletEnabled } from '@/hooks/useWalletEnabled';
import { useColorScheme } from '@/components/useColorScheme';

export default function WalletBanner() {
  const walletEnabled = useWalletEnabled();
  const { user } = useAuth();

  if (!walletEnabled) return null;
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  return (
    <View style={[styles.banner, { backgroundColor: colors.wallet, borderColor: colors.border }]}>
      <View style={styles.left}>
        <Ionicons name="wallet-outline" size={22} color={colors.primary} />
        <View>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Wallet Balance</Text>
          <Text style={[styles.balance, { color: colors.primary }]}>
            ₹{(user?.walletBalance ?? 0).toFixed(2)}
          </Text>
        </View>
      </View>
      <View style={[styles.chip, { backgroundColor: colors.card }]}>
        <Text style={[styles.chipText, { color: colors.primary }]}>+ Add Money</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    marginBottom: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  label: {
    fontSize: 12,
  },
  balance: {
    fontSize: 20,
    fontWeight: '800',
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
