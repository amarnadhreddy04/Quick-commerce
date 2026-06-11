import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import Colors from '@/constants/Colors';
import { radius, shadows, spacing } from '@/constants/theme';
import { useWalletEnabled } from '@/hooks/useWalletEnabled';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { useCatalog } from '@/context/CatalogContext';
import { calculateOrderTotal } from '@/lib/cartFees';
import {
  CodOrderResult,
  createPaymentOrder,
  RazorpayCheckoutData,
  verifyPayment,
  WalletOrderResult,
} from '@/lib/payments';
import { useColorScheme } from '@/components/useColorScheme';

type PaymentMethod = 'razorpay' | 'wallet' | 'cod';
type CheckoutStep = 'review' | 'demo-pay';

const ORDER_SUCCESS_MESSAGE =
  'Thank you for your order! We will deliver tomorrow between 6:00 AM and 9:00 AM.';

function isInstantOrder(
  result: RazorpayCheckoutData | WalletOrderResult | CodOrderResult
): result is WalletOrderResult | CodOrderResult {
  return (
    'paymentMethod' in result &&
    (result.paymentMethod === 'cod' || result.paymentMethod === 'wallet')
  );
}

export default function CheckoutScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ method?: string }>();
  const method = (params.method ?? 'cod') as PaymentMethod;
  const { token } = useAuth();
  const { settings, refreshCatalog, refreshOrders } = useCatalog();
  const { items, subtotal, appliedPromo } = useCart();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const walletEnabled = useWalletEnabled();

  const [step, setStep] = useState<CheckoutStep>('review');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [checkoutData, setCheckoutData] = useState<RazorpayCheckoutData | null>(null);

  const { deliveryFee, platformFee, promoDiscount, total } = calculateOrderTotal(
    subtotal,
    settings,
    appliedPromo?.discount ?? 0
  );
  const deliverySlot = settings.deliverySlot;

  const methodLabel = useMemo(() => {
    if (method === 'cod') return 'Cash on Delivery';
    if (method === 'wallet') return 'Wallet';
    return 'Demo Pay';
  }, [method]);

  useEffect(() => {
    if (!walletEnabled && method === 'wallet') {
      router.replace('/payment');
    }
  }, [walletEnabled, method, router]);

  const buildPayload = () => ({
    items: items.map((item) => ({
      productId: item.product.id,
      quantity: item.quantity,
      price: Number(item.product.price),
    })),
    deliverySlot,
    total: Number(total),
    deliveryFee: Number(deliveryFee),
    platformFee: Number(platformFee),
    promoCode: appliedPromo?.code,
    promoDiscount: Number(promoDiscount),
    paymentMethod: method,
  });

  const goToSuccess = (message: string, orderId?: string) => {
    Promise.all([refreshOrders(), refreshCatalog()]).catch(() => undefined);
    router.replace({
      pathname: '/order-success',
      params: {
        message,
        orderId: orderId ?? '',
      },
    });
  };

  const handleConfirm = async () => {
    if (!token) {
      setError('Please log in again to complete your order.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const result = await createPaymentOrder(token, buildPayload());

      if (method === 'cod' || method === 'wallet') {
        if (!isInstantOrder(result)) {
          setError(
            'Could not place order. Restart backend with "npm run server" and try again.'
          );
          return;
        }

        const orderId =
          result.order && typeof result.order === 'object' && 'id' in result.order
            ? String((result.order as { id: string }).id)
            : undefined;

        const message =
          result.paymentMethod === 'cod'
            ? `${ORDER_SUCCESS_MESSAGE} Please keep cash ready at delivery.`
            : ORDER_SUCCESS_MESSAGE;

        goToSuccess(message, orderId);
        return;
      }

      setCheckoutData(result as RazorpayCheckoutData);
      setStep('demo-pay');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not place order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoPay = async () => {
    if (!token || !checkoutData) return;

    setError('');
    setLoading(true);

    try {
      await verifyPayment(token, {
        orderId: checkoutData.orderId,
        razorpayOrderId: checkoutData.razorpayOrderId,
        razorpayPaymentId: `pay_demo_${Date.now()}`,
        razorpaySignature: 'demo_signature',
      });

      goToSuccess(ORDER_SUCCESS_MESSAGE, checkoutData.orderId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment verification failed.');
    } finally {
      setLoading(false);
    }
  };

  if (items.length === 0) {
    return null;
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Checkout',
          headerBackTitle: 'Payment',
        }}
      />
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
        {step === 'review' ? (
          <ScrollView contentContainerStyle={styles.content}>
            <View style={[styles.methodBadge, { backgroundColor: colors.wallet, borderColor: colors.primary }]}>
              <Ionicons
                name={method === 'cod' ? 'cash-outline' : method === 'wallet' ? 'wallet-outline' : 'flask-outline'}
                size={22}
                color={colors.primary}
              />
              <Text style={[styles.methodText, { color: colors.text }]}>{methodLabel}</Text>
            </View>

            <View style={[styles.card, shadows.card, { backgroundColor: colors.card }]}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>Order Details</Text>
              {items.map((item) => (
                <View key={item.product.id} style={styles.row}>
                  <Text style={[styles.rowName, { color: colors.text }]} numberOfLines={1}>
                    {item.product.name} × {item.quantity}
                  </Text>
                  <Text style={[styles.rowValue, { color: colors.text }]}>₹{item.product.price * item.quantity}</Text>
                </View>
              ))}
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              {promoDiscount > 0 ? (
                <View style={styles.row}>
                  <Text style={[styles.rowName, { color: colors.textSecondary }]}>
                    Promo ({appliedPromo?.code})
                  </Text>
                  <Text style={[styles.rowValue, { color: colors.success }]}>-₹{promoDiscount}</Text>
                </View>
              ) : null}
              <View style={styles.row}>
                <Text style={[styles.rowName, { color: colors.textSecondary }]}>Delivery fee</Text>
                <Text style={[styles.rowValue, { color: colors.text }]}>
                  {deliveryFee === 0 ? 'FREE' : `₹${deliveryFee}`}
                </Text>
              </View>
              {platformFee > 0 ? (
                <View style={styles.row}>
                  <Text style={[styles.rowName, { color: colors.textSecondary }]}>Platform fee</Text>
                  <Text style={[styles.rowValue, { color: colors.text }]}>₹{platformFee}</Text>
                </View>
              ) : null}
              <View style={styles.row}>
                <Text style={[styles.totalLabel, { color: colors.text }]}>Total</Text>
                <Text style={[styles.totalValue, { color: colors.text }]}>₹{total}</Text>
              </View>
            </View>

            <View style={[styles.slotCard, { backgroundColor: colors.wallet, borderColor: colors.border }]}>
              <Ionicons name="time-outline" size={20} color={colors.primary} />
              <Text style={[styles.slotText, { color: colors.text }]}>{deliverySlot}</Text>
            </View>

            {error ? (
              <View style={[styles.errorBox, { backgroundColor: '#FEE2E2' }]}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <Pressable
              onPress={handleConfirm}
              disabled={loading}
              style={[styles.primaryButton, { backgroundColor: colors.primary, opacity: loading ? 0.7 : 1 }]}>
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryButtonText}>
                  {method === 'cod'
                    ? 'Confirm COD Order'
                    : method === 'wallet'
                      ? 'Pay with Wallet'
                      : 'Continue to Demo Pay'}
                </Text>
              )}
            </Pressable>
          </ScrollView>
        ) : (
          <View style={styles.demoContainer}>
            <Ionicons name="shield-checkmark-outline" size={56} color={colors.primary} />
            <Text style={[styles.demoTitle, { color: colors.text }]}>Demo Payment</Text>
            <Text style={[styles.demoSub, { color: colors.textSecondary }]}>
              Order {checkoutData?.orderId}
            </Text>
            <Text style={[styles.demoAmount, { color: colors.text }]}>
              ₹{checkoutData ? (checkoutData.amount / 100).toFixed(2) : total}
            </Text>
            <Text style={[styles.demoHint, { color: colors.textSecondary }]}>
              This is a free test payment. No real money will be charged.
            </Text>

            {error ? (
              <View style={[styles.errorBox, { backgroundColor: '#FEE2E2' }]}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <Pressable
              onPress={handleDemoPay}
              disabled={loading}
              style={[styles.primaryButton, { backgroundColor: colors.primary, opacity: loading ? 0.7 : 1 }]}>
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryButtonText}>
                  Pay ₹{checkoutData ? (checkoutData.amount / 100).toFixed(2) : total} (Demo)
                </Text>
              )}
            </Pressable>

            <Pressable onPress={() => setStep('review')} style={styles.secondaryLink}>
              <Text style={[styles.secondaryLinkText, { color: colors.primary }]}>Back</Text>
            </Pressable>
          </View>
        )}
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  methodBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  methodText: { fontSize: 16, fontWeight: '700' },
  card: { padding: spacing.lg, borderRadius: radius.lg, gap: spacing.sm },
  cardTitle: { fontSize: 16, fontWeight: '700', marginBottom: spacing.xs },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
  rowName: { flex: 1, fontSize: 14 },
  rowValue: { fontSize: 14, fontWeight: '600' },
  divider: { height: 1, marginVertical: spacing.xs },
  totalLabel: { fontSize: 16, fontWeight: '700' },
  totalValue: { fontSize: 20, fontWeight: '800' },
  slotCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  slotText: { fontSize: 14, fontWeight: '600' },
  errorBox: { padding: spacing.md, borderRadius: radius.md },
  errorText: { color: '#B91C1C', fontSize: 14, lineHeight: 20 },
  primaryButton: {
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  primaryButtonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },
  demoContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
    gap: spacing.md,
  },
  demoTitle: { fontSize: 24, fontWeight: '800' },
  demoSub: { fontSize: 14 },
  demoAmount: { fontSize: 36, fontWeight: '800' },
  demoHint: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  secondaryLink: { marginTop: spacing.md },
  secondaryLinkText: { fontSize: 15, fontWeight: '600' },
});
