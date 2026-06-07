import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Colors from '@/constants/Colors';
import { radius, spacing } from '@/constants/theme';
import { useDeliveryArea } from '@/context/DeliveryAreaContext';
import { useColorScheme } from '@/components/useColorScheme';

type Props = {
  mode: 'unavailable' | 'permission_denied' | 'loading';
};

export default function UnavailableLocation({ mode }: Props) {
  const insets = useSafeAreaInsets();
  const { message, areaName, distanceKm, recheck } = useDeliveryArea();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const title =
    mode === 'loading'
      ? 'Checking delivery availability'
      : mode === 'permission_denied'
        ? 'Location access needed'
        : 'Delivery unavailable';

  const subtitle =
    mode === 'loading'
      ? 'Please wait while we verify if we deliver to your area.'
      : mode === 'permission_denied'
        ? message
        : message;

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: insets.top + spacing.xl,
          paddingBottom: insets.bottom + spacing.xl,
          backgroundColor: colors.background,
        },
      ]}>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {mode === 'loading' ? (
          <ActivityIndicator size="large" color={colors.primary} />
        ) : (
          <View style={[styles.iconWrap, { backgroundColor: colors.wallet }]}>
            <Ionicons
              name={mode === 'permission_denied' ? 'location-outline' : 'map-outline'}
              size={42}
              color={colors.primary}
            />
          </View>
        )}

        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{subtitle}</Text>

        {mode === 'unavailable' && areaName ? (
          <Text style={[styles.meta, { color: colors.textSecondary }]}>
            Nearest service area: {areaName}
            {distanceKm != null ? ` (${distanceKm} km away)` : ''}
          </Text>
        ) : null}

        {mode !== 'loading' ? (
          <Pressable
            onPress={() => recheck().catch(() => undefined)}
            style={[styles.button, { backgroundColor: colors.primary }]}>
            <Text style={styles.buttonText}>Check Again</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  card: {
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.md,
  },
  iconWrap: {
    width: 88,
    height: 88,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  meta: {
    fontSize: 13,
    textAlign: 'center',
  },
  button: {
    marginTop: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
});
