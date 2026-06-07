import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import Colors from '@/constants/Colors';
import { radius, spacing } from '@/constants/theme';
import { useColorScheme } from '@/components/useColorScheme';

export default function OrderSuccessScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ message?: string; orderId?: string }>();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const message =
    params.message ||
    'Your order has been placed successfully for tomorrow morning delivery.';

  return (
    <>
      <Stack.Screen options={{ title: 'Order Placed', headerBackVisible: false }} />
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
        <View style={styles.content}>
          <View style={[styles.iconCircle, { backgroundColor: colors.wallet }]}>
            <Ionicons name="checkmark-circle" size={72} color={colors.primary} />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>Order Placed!</Text>
          {params.orderId ? (
            <Text style={[styles.orderId, { color: colors.textSecondary }]}>Order ID: {params.orderId}</Text>
          ) : null}
          <Text style={[styles.message, { color: colors.textSecondary }]}>{message}</Text>

          <Pressable
            onPress={() => router.replace('/(tabs)/orders')}
            style={[styles.primaryButton, { backgroundColor: colors.primary }]}>
            <Text style={styles.primaryButtonText}>View My Orders</Text>
          </Pressable>

          <Pressable onPress={() => router.replace('/(tabs)')} style={styles.secondaryButton}>
            <Text style={[styles.secondaryButtonText, { color: colors.primary }]}>Continue Shopping</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
    gap: spacing.md,
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  title: { fontSize: 28, fontWeight: '800' },
  orderId: { fontSize: 14, fontWeight: '600' },
  message: { fontSize: 15, textAlign: 'center', lineHeight: 22 },
  primaryButton: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    minWidth: 220,
    alignItems: 'center',
  },
  primaryButtonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },
  secondaryButton: { padding: spacing.md },
  secondaryButtonText: { fontSize: 15, fontWeight: '600' },
});
