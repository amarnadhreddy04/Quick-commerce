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

import PaymentCheckoutModal from '@/components/PaymentCheckoutModal';
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
  getPaymentConfig,
  PaymentConfig,
  RazorpayCheckoutData,
  RazorpaySuccessPayload,
  verifyPayment,
  WalletOrderResult,
} from '@/lib/payments';
import { useColorScheme } from '@/components/useColorScheme';

type PaymentMethod = 'razorpay' | 'wallet' | 'cod';

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

  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');
  const [paymentConfig, setPaymentConfig] = useState<PaymentConfig | null>(null);
  const [checkoutData, setCheckoutData] = useState<RazorpayCheckoutData | null>(null);
  const [checkoutVisible, setCheckoutVisible] = useState(false);

  const { deliveryFee, platformFee, promoDiscount, total } = calculateOrderTotal(
    subtotal,
    settings,
    appliedPromo?.discount ?? 0
  );
  const deliverySlot = settings.deliverySlot;
  const paymentMode = paymentConfig?.mode ?? (paymentConfig?.demoMode ? 'demo' : 'test');
  const isDemoMode = paymentMode === 'demo';
  const isLiveMode = paymentMode === 'live';

  const methodLabel = useMemo(() => {
    if (method === 'cod') return 'Cash on Delivery';
    if (method === 'wallet') return 'Wallet';
    if (isDemoMode) return 'Demo Pay';
    if (isLiveMode) return 'Razorpay (Live)';
    return 'Razorpay (Test)';
  }, [method, isDemoMode, isLiveMode]);

  useEffect(() => {
    if (!walletEnabled && method === 'wallet') {
      router.replace('/payment');
    }
  }, [walletEnabled, method, router]);

  useEffect(() => {
    if (!token) return;
    getPaymentConfig(token)
      .then(setPaymentConfig)
      .catch(() => undefined);
  }, [token]);

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
      setCheckoutVisible(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not place order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSuccess = async (payment: RazorpaySuccessPayload) => {
    if (!token || !checkoutData) return;

    setError('');
    setVerifying(true);

    try {
      await verifyPayment(token, {
        orderId: checkoutData.orderId,
        razorpayOrderId: payment.razorpayOrderId,
        razorpayPaymentId: payment.razorpayPaymentId,
        razorpaySignature: payment.razorpaySignature,
      });

      setCheckoutVisible(false);
      goToSuccess(ORDER_SUCCESS_MESSAGE, checkoutData.orderId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment verification failed.');
    } finally {
      setVerifying(false);
    }
  };

  const handleCheckoutClose = () => {
    if (verifying) return;
    setCheckoutVisible(false);
    setError('Payment was cancelled. Your order is saved as pending — you can retry from Orders.');
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
        <ScrollView contentContainerStyle={styles.content}>
          <View style={[styles.methodBadge, { backgroundColor: colors.wallet, borderColor: colors.primary }]}>
            <Ionicons
              name={
                method === 'cod'
                  ? 'cash-outline'
                  : method === 'wallet'
                    ? 'wallet-outline'
                    : isDemoMode
                      ? 'flask-outline'
                      : 'card-outline'
              }
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

          {method === 'razorpay' ? (
            <View style={[styles.infoBox, { backgroundColor: colors.wallet, borderColor: colors.border }]}>
              <Ionicons name="shield-checkmark-outline" size={18} color={colors.primary} />
              <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                {isDemoMode
                  ? 'Demo mode — no real money will be charged until you add Razorpay test keys.'
                  : isLiveMode
                    ? 'Live payments — real money will be charged via Razorpay.'
                    : 'Test payments via Razorpay sandbox (no real charge with test cards).'}
              </Text>
            </View>
          ) : null}

          {error ? (
            <View style={[styles.errorBox, { backgroundColor: '#FEE2E2' }]}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <Pressable
            onPress={handleConfirm}
            disabled={loading || verifying}
            style={[
              styles.primaryButton,
              { backgroundColor: colors.primary, opacity: loading || verifying ? 0.7 : 1 },
            ]}>
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryButtonText}>
                {method === 'cod'
                  ? 'Confirm COD Order'
                  : method === 'wallet'
                    ? 'Pay with Wallet'
                    : isDemoMode
                      ? 'Continue to Demo Pay'
                      : isLiveMode
                        ? 'Pay with Razorpay (Live)'
                        : 'Pay with Razorpay (Test)'}
              </Text>
            )}
          </Pressable>
        </ScrollView>
      </SafeAreaView>

      <PaymentCheckoutModal
        visible={checkoutVisible}
        data={checkoutData}
        loading={verifying}
        onSuccess={handlePaymentSuccess}
        onClose={handleCheckoutClose}
      />
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
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  infoText: { flex: 1, fontSize: 13, lineHeight: 18 },
  errorBox: { padding: spacing.md, borderRadius: radius.md },
  errorText: { color: '#B91C1C', fontSize: 14, lineHeight: 20 },
  primaryButton: {
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  primaryButtonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },
});
