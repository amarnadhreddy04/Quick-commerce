import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import ProfileDetailCard from '@/components/ProfileDetailCard';
import Colors from '@/constants/Colors';
import { radius, spacing } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useCatalog } from '@/context/CatalogContext';
import { useReferralEnabled } from '@/hooks/useReferralEnabled';
import { fetchReferralStats, type ReferralStats } from '@/lib/api';
import { useColorScheme } from '@/components/useColorScheme';

export default function ReferScreen() {
  const router = useRouter();
  const { token } = useAuth();
  const { settings } = useCatalog();
  const referralEnabled = useReferralEnabled();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!referralEnabled) {
      router.replace('/(tabs)/profile');
    }
  }, [referralEnabled, router]);

  useEffect(() => {
    if (!token || !referralEnabled) return;
    fetchReferralStats(token)
      .then((response) => setStats(response.referral))
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [token, referralEnabled]);

  const shareReferral = async () => {
    if (!stats?.code) return;
    const reward = settings.referralRewardAmount ?? stats.rewardPerReferral;
    await Share.share({
      message: `Join Milkbasket for morning milk & groceries delivery! Use my referral code ${stats.code} when you sign up. We both benefit — you get great daily essentials delivered early morning.`,
      title: `Milkbasket — Refer & Earn ₹${reward}`,
    });
  };

  if (!referralEnabled) return null;

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (error || !stats) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.danger }}>{error || 'Could not load referral info'}</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}>
      <View style={[styles.heroCard, { backgroundColor: colors.primary }]}>
        <Ionicons name="gift-outline" size={32} color="#fff" />
        <Text style={styles.heroTitle}>Refer & Earn</Text>
        <Text style={styles.heroSubtitle}>
          Invite friends to Milkbasket. Earn ₹{stats.rewardPerReferral} in your wallet when they sign up
          with your code.
        </Text>
      </View>

      <View style={[styles.codeCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.codeLabel, { color: colors.textSecondary }]}>Your referral code</Text>
        <Text style={[styles.codeValue, { color: colors.text }]}>{stats.code}</Text>
        <Pressable
          onPress={shareReferral}
          style={[styles.shareButton, { backgroundColor: colors.primary }]}>
          <Ionicons name="share-social-outline" size={18} color="#fff" />
          <Text style={styles.shareText}>Share with friends</Text>
        </Pressable>
      </View>

      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.statValue, { color: colors.text }]}>{stats.referralsCount}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Friends joined</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.statValue, { color: colors.success }]}>₹{stats.totalEarned}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total earned</Text>
        </View>
      </View>

      <ProfileDetailCard title="How it works">
        <Text style={[styles.body, { color: colors.textSecondary }]}>
          1. Share your code with friends{'\n'}
          2. They enter it when creating an account{'\n'}
          3. You earn ₹{stats.rewardPerReferral} credited to your wallet{'\n'}
          4. Use wallet balance at checkout for orders
        </Text>
      </ProfileDetailCard>

      <ProfileDetailCard title="Recent referrals">
        {stats.recentReferrals.length === 0 ? (
          <Text style={[styles.body, { color: colors.textSecondary }]}>
            No referrals yet. Share your code to start earning!
          </Text>
        ) : (
          stats.recentReferrals.map((item) => (
            <View key={item.id} style={[styles.referralRow, { borderBottomColor: colors.border }]}>
              <View>
                <Text style={[styles.referralName, { color: colors.text }]}>{item.refereeName}</Text>
                <Text style={[styles.referralDate, { color: colors.textSecondary }]}>
                  {item.createdAt?.slice(0, 10) ?? '—'}
                </Text>
              </View>
              {item.rewardAmount > 0 ? (
                <Text style={[styles.referralReward, { color: colors.success }]}>
                  +₹{item.rewardAmount}
                </Text>
              ) : (
                <Text style={[styles.referralDate, { color: colors.textSecondary }]}>Joined</Text>
              )}
            </View>
          ))
        )}
      </ProfileDetailCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  heroCard: {
    borderRadius: radius.lg,
    padding: spacing.xl,
    gap: spacing.sm,
    alignItems: 'flex-start',
  },
  heroTitle: { color: '#fff', fontSize: 22, fontWeight: '800' },
  heroSubtitle: { color: 'rgba(255,255,255,0.9)', fontSize: 14, lineHeight: 20 },
  codeCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  codeLabel: { fontSize: 13 },
  codeValue: { fontSize: 28, fontWeight: '800', letterSpacing: 2 },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
  },
  shareText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  statsRow: { flexDirection: 'row', gap: spacing.md },
  statCard: {
    flex: 1,
    borderRadius: radius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    gap: 4,
  },
  statValue: { fontSize: 24, fontWeight: '800' },
  statLabel: { fontSize: 12 },
  body: { fontSize: 14, lineHeight: 22 },
  referralRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
  },
  referralName: { fontSize: 14, fontWeight: '600' },
  referralDate: { fontSize: 12, marginTop: 2 },
  referralReward: { fontSize: 14, fontWeight: '700' },
});
