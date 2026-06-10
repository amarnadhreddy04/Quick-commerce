import { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import Colors from '@/constants/Colors';
import { radius, shadows, spacing } from '@/constants/theme';
import { useColorScheme } from '@/components/useColorScheme';

type Props = {
  title: string;
  children: ReactNode;
};

export default function ProfileDetailCard({ title, children }: Props) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  return (
    <View style={[styles.card, shadows.card, { backgroundColor: colors.card }]}>
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
});
