import { ScrollView, StyleSheet, Text } from 'react-native';

import ProfileDetailCard from '@/components/ProfileDetailCard';
import Colors from '@/constants/Colors';
import { spacing } from '@/constants/theme';
import { useColorScheme } from '@/components/useColorScheme';
import { useAuth } from '@/context/AuthContext';

export default function EmailScreen() {
  const { user } = useAuth();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}>
      <ProfileDetailCard title="Registered email">
        <Text style={[styles.email, { color: colors.text }]}>{user?.email ?? '—'}</Text>
        <Text style={[styles.body, { color: colors.textSecondary }]}>
          Order confirmations, delivery updates, and account alerts are sent to this email address.
        </Text>
      </ProfileDetailCard>

      <ProfileDetailCard title="Email notifications">
        <Text style={[styles.body, { color: colors.textSecondary }]}>
          You will receive emails for order placement, delivery reminders, and promotional offers when
          notifications are enabled.
        </Text>
      </ProfileDetailCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.lg },
  email: { fontSize: 18, fontWeight: '700' },
  body: { fontSize: 14, lineHeight: 22 },
});
