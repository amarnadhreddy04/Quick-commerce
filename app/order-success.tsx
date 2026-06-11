import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import Colors from '@/constants/Colors';
import { radius, spacing } from '@/constants/theme';
import { useCart } from '@/context/CartContext';
import { useCatalog } from '@/context/CatalogContext';
import { useColorScheme } from '@/components/useColorScheme';

const SUCCESS_REDIRECT_MS = 3500;

const DEFAULT_MESSAGE =
  'Thank you for your order! We will deliver tomorrow between 6:00 AM and 9:00 AM.';

export default function OrderSuccessScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ message?: string; orderId?: string }>();
  const { clearCart } = useCart();
  const { refreshOrders } = useCatalog();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const message = params.message || DEFAULT_MESSAGE;
  const orderId = params.orderId?.trim() || '';
  const clearedRef = useRef(false);

  useEffect(() => {
    refreshOrders().catch(() => undefined);
  }, [refreshOrders]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!clearedRef.current) {
        clearedRef.current = true;
        clearCart();
      }
      router.replace('/(tabs)');
    }, SUCCESS_REDIRECT_MS);
    return () => clearTimeout(timer);
  }, [router, clearCart]);

  return (
    <>
      <Stack.Screen options={{ title: 'Order Placed', headerBackVisible: false }} />
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
        <View style={styles.content}>
          <View style={[styles.iconCircle, { backgroundColor: colors.wallet }]}>
            <Ionicons name="checkmark-circle" size={72} color={colors.primary} />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>Thank You!</Text>
          {orderId ? (
            <Text style={[styles.orderId, { color: colors.textSecondary }]}>Order ID: {orderId}</Text>
          ) : null}
          <Text style={[styles.message, { color: colors.textSecondary }]}>{message}</Text>
          <Text style={[styles.redirectHint, { color: colors.textSecondary }]}>
            Taking you to home in a moment...
          </Text>
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
  title: { fontSize: 30, fontWeight: '800' },
  orderId: { fontSize: 14, fontWeight: '600' },
  message: { fontSize: 16, textAlign: 'center', lineHeight: 24 },
  redirectHint: { fontSize: 13, textAlign: 'center', marginTop: spacing.sm },
});
