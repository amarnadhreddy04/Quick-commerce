import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Colors from '@/constants/Colors';
import { spacing } from '@/constants/theme';
import { useDeliveryAreaOptional } from '@/context/DeliveryAreaContext';
import { useColorScheme } from '@/components/useColorScheme';

export default function HomeHeader() {
  const router = useRouter();
  const delivery = useDeliveryAreaOptional();
  const activeAddress = delivery?.activeAddress;
  const areaName = delivery?.areaName;
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: insets.top + spacing.sm,
          backgroundColor: colors.card,
          borderBottomColor: colors.border,
        },
      ]}>
      <View style={styles.brandRow}>
        <View>
          <Text style={[styles.brand, { color: colors.primary }]}>Milkbasket</Text>
          <Pressable
            onPress={() => router.push('/profile/address')}
            style={styles.locationRow}
            hitSlop={8}>
            <Ionicons name="location-outline" size={14} color={colors.primary} />
            <Text style={[styles.location, { color: colors.textSecondary }]} numberOfLines={1}>
              Delivering to {activeAddress?.label ?? areaName ?? 'your area'}
            </Text>
            <Ionicons name="chevron-down" size={14} color={colors.primary} />
          </Pressable>
        </View>
        <View style={[styles.searchPill, { backgroundColor: colors.background }]}>
          <Ionicons name="search-outline" size={18} color={colors.textSecondary} />
          <Text style={[styles.searchText, { color: colors.textSecondary }]}>
            Search milk, bread, eggs...
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
  },
  brandRow: {
    gap: spacing.md,
  },
  brand: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
    maxWidth: '100%',
  },
  location: {
    fontSize: 12,
    flexShrink: 1,
  },
  searchPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 12,
  },
  searchText: {
    fontSize: 14,
  },
});
