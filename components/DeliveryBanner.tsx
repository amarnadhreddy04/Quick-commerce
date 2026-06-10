import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import Colors from '@/constants/Colors';
import { radius, spacing } from '@/constants/theme';
import { useColorScheme } from '@/components/useColorScheme';
import { useCatalog } from '@/context/CatalogContext';

export default function DeliveryBanner() {
  const { settings } = useCatalog();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  return (
    <View style={[styles.banner, { backgroundColor: colors.primary }]}>
      <View style={styles.row}>
        <Ionicons name="alarm-outline" size={20} color="#FFFFFF" />
        <Text style={styles.title}>Order before {settings.deliveryCutoff}</Text>
      </View>
      <Text style={styles.subtitle}>Get delivery {settings.deliverySlot.toLowerCase()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    marginBottom: spacing.md,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  subtitle: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 13,
  },
});
