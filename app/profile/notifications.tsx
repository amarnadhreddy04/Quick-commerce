import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';

import ProfileDetailCard from '@/components/ProfileDetailCard';
import Colors from '@/constants/Colors';
import { spacing } from '@/constants/theme';
import { useColorScheme } from '@/components/useColorScheme';
import { getNotificationsEnabled, setNotificationsEnabled } from '@/lib/notificationPrefs';

export default function NotificationsScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const [enabled, setEnabled] = useState(true);
  const [saving, setSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      getNotificationsEnabled().then(setEnabled).catch(() => undefined);
    }, [])
  );

  const toggleNotifications = async (value: boolean) => {
    setEnabled(value);
    setSaving(true);
    try {
      await setNotificationsEnabled(value);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}>
      <ProfileDetailCard title="Push & email alerts">
        <View style={styles.row}>
          <View style={styles.copy}>
            <Text style={[styles.label, { color: colors.text }]}>Order notifications</Text>
            <Text style={[styles.body, { color: colors.textSecondary }]}>
              Get updates for order confirmation, delivery, and offers.
            </Text>
          </View>
          <Switch
            value={enabled}
            onValueChange={toggleNotifications}
            disabled={saving}
            trackColor={{ false: colors.border, true: colors.primary }}
          />
        </View>
      </ProfileDetailCard>

      <ProfileDetailCard title="You will be notified about">
        <Text style={[styles.body, { color: colors.textSecondary }]}>
          • Order placed successfully{'\n'}
          • Delivery slot reminders{'\n'}
          • Payment confirmations{'\n'}
          • Subscription renewals
        </Text>
      </ProfileDetailCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.lg },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  copy: { flex: 1, gap: spacing.xs },
  label: { fontSize: 15, fontWeight: '600' },
  body: { fontSize: 14, lineHeight: 22 },
});
