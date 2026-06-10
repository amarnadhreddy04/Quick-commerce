import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import ProfileDetailCard from '@/components/ProfileDetailCard';
import Colors from '@/constants/Colors';
import { radius, spacing } from '@/constants/theme';
import { useWalletEnabled } from '@/hooks/useWalletEnabled';
import { useColorScheme } from '@/components/useColorScheme';
import { useAuth } from '@/context/AuthContext';

export default function WalletScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const walletEnabled = useWalletEnabled();

  useEffect(() => {
    if (!walletEnabled) {
      router.replace('/(tabs)/profile');
    }
  }, [router, walletEnabled]);
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const balance = user?.walletBalance ?? 0;

  if (!walletEnabled) return null;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}>
      <View style={[styles.balanceCard, { backgroundColor: colors.primary }]}>
        <Text style={styles.balanceLabel}>Wallet Balance</Text>
        <Text style={styles.balanceValue}>₹{balance.toFixed(2)}</Text>
        <Text style={styles.balanceHint}>Use wallet balance at checkout for faster payments.</Text>
      </View>

      <ProfileDetailCard title="How it works">
        <Text style={[styles.body, { color: colors.textSecondary }]}>
          • Pay with wallet during checkout{'\n'}
          • Balance is deducted instantly{'\n'}
          • Refunds for cancelled orders are credited back to your wallet
        </Text>
      </ProfileDetailCard>

      <ProfileDetailCard title="Recent activity">
        <Text style={[styles.body, { color: colors.textSecondary }]}>
          No wallet transactions yet. Your balance will update after you pay with wallet or receive a
          refund.
        </Text>
      </ProfileDetailCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.lg },
  balanceCard: {
    borderRadius: radius.lg,
    padding: spacing.xl,
    gap: spacing.sm,
  },
  balanceLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 14, fontWeight: '600' },
  balanceValue: { color: '#FFFFFF', fontSize: 36, fontWeight: '800' },
  balanceHint: { color: 'rgba(255,255,255,0.8)', fontSize: 13, lineHeight: 20 },
  body: { fontSize: 14, lineHeight: 24 },
});
