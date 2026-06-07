import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Colors from '@/constants/Colors';
import { spacing } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useDeliveryAreaOptional } from '@/context/DeliveryAreaContext';
import { useColorScheme } from '@/components/useColorScheme';

export default function HomeHeader() {
  const { user } = useAuth();
  const areaName = useDeliveryAreaOptional()?.areaName;
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
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
            <Text style={[styles.location, { color: colors.textSecondary }]}>
              Delivering to {areaName ?? user?.location ?? 'your area'}
            </Text>
          </View>
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
  },
  location: {
    fontSize: 12,
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
