import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import RazorpayCheckout from '@/components/RazorpayCheckout';
import Colors from '@/constants/Colors';
import { radius, shadows, spacing } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { useCatalog } from '@/context/CatalogContext';
import {
  createPaymentOrder,
  RazorpayCheckoutData,
  verifyPayment,
} from '@/lib/payments';
import { useColorScheme } from '@/components/useColorScheme';

type PaymentMethod = 'razorpay' | 'wallet';

export default function PaymentScreen() {
  const router = useRouter();
  const { token, user } = useAuth();
  const { settings, refreshOrders } = useCatalog();
  const { items, subtotal, clearCart } = useCart();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('razorpay');
  const [loading, setLoading] = useState(false);
  const [checkoutData, setCheckoutData] = useState<RazorpayCheckoutData | null>(null);
  const [showCheckout, setShowCheckout] = useState(false);

  const deliverySlot = settings.deliverySlot;
  const deliveryFee = subtotal >= settings.minOrderValue * 2 ? 0 : settings.deliveryFee;
  const total = subtotal + deliveryFee;
  const canUseWallet = (user?.walletBalance ?? 0) >= total;

  useEffect(() => {
    if (items.length === 0) {
      router.replace('/cart');
    }
  }, [items.length, router]);

  const buildPayload = () => ({
    items: items.map((item) => ({
      productId: item.product.id,
      quantity: item.quantity,
      price: item.product.price,
    })),
    deliverySlot,
    total,
    deliveryFee,
    paymentMethod,
  });

  const handlePay = async () => {
    if (!token) return;

    setLoading(true);
    try {
      const result = await createPaymentOrder(token, buildPayload());

      if ('paymentMethod' in result && result.paymentMethod === 'wallet') {
        clearCart();
        await refreshOrders();
        Alert.alert('Order Placed!', 'Payment deducted from your wallet.', [
          { text: 'View Orders', onPress: () => router.replace('/orders') },
        ]);
        return;
      }

      setCheckoutData(result as RazorpayCheckoutData);
      setShowCheckout(true);
    } catch (error) {
      Alert.alert('Payment Error', error instanceof Error ? error.message : 'Checkout failed');
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSuccess = async (payment: {
    razorpayPaymentId: string;
    razorpayOrderId: string;
    razorpaySignature: string;
  }) => {
    if (!token || !checkoutData) return;

    setShowCheckout(false);
    setLoading(true);

    try {
      await verifyPayment(token, {
        orderId: checkoutData.orderId,
        razorpayOrderId: payment.razorpayOrderId,
        razorpayPaymentId: payment.razorpayPaymentId,
        razorpaySignature: payment.razorpaySignature,
      });

      clearCart();
      await refreshOrders();
      setCheckoutData(null);
      Alert.alert('Payment Successful!', 'Your order has been placed for tomorrow delivery.', [
        { text: 'View Orders', onPress: () => router.replace('/orders') },
      ]);
    } catch (error) {
      Alert.alert('Verification Failed', error instanceof Error ? error.message : 'Try again');
    } finally {
      setLoading(false);
    }
  };

  if (items.length === 0) {
    return null;
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Payment', headerBackTitle: 'Basket' }} />
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={[styles.summaryCard, shadows.card, { backgroundColor: colors.card }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Order Summary</Text>
            {items.map((item) => (
              <View key={item.product.id} style={styles.summaryItem}>
                <Text style={styles.emoji}>{item.product.image}</Text>
                <View style={styles.summaryInfo}>
                  <Text style={[styles.itemName, { color: colors.text }]} numberOfLines={1}>
                    {item.product.name}
                  </Text>
                  <Text style={[styles.itemMeta, { color: colors.textSecondary }]}>
                    {item.quantity} × ₹{item.product.price}
                  </Text>
                </View>
                <Text style={[styles.itemTotal, { color: colors.text }]}>
                  ₹{item.product.price * item.quantity}
                </Text>
              </View>
            ))}

            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <SummaryRow label="Subtotal" value={`₹${subtotal}`} colors={colors} />
            <SummaryRow
              label="Delivery Fee"
              value={deliveryFee === 0 ? 'FREE' : `₹${deliveryFee}`}
              colors={colors}
              highlight={deliveryFee === 0}
            />
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <SummaryRow label="Total" value={`₹${total}`} colors={colors} bold />
          </View>

          <View style={[styles.slotCard, { backgroundColor: colors.wallet, borderColor: colors.border }]}>
            <Ionicons name="time-outline" size={20} color={colors.primary} />
            <View>
              <Text style={[styles.slotLabel, { color: colors.textSecondary }]}>Delivery Slot</Text>
              <Text style={[styles.slotValue, { color: colors.text }]}>{deliverySlot}</Text>
            </View>
          </View>

          <Text style={[styles.sectionTitle, { color: colors.text }]}>Choose Payment Method</Text>
          <View style={styles.paymentRow}>
            <PaymentOption
              label="Razorpay"
              sublabel="UPI, Card, Netbanking"
              icon="card-outline"
              selected={paymentMethod === 'razorpay'}
              onPress={() => setPaymentMethod('razorpay')}
              colors={colors}
            />
            <PaymentOption
              label="Wallet"
              sublabel={`Balance ₹${(user?.walletBalance ?? 0).toFixed(2)}`}
              icon="wallet-outline"
              selected={paymentMethod === 'wallet'}
              onPress={() => setPaymentMethod('wallet')}
              colors={colors}
              disabled={!canUseWallet}
            />
          </View>
        </ScrollView>

        <View style={[styles.footer, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
          <View>
            <Text style={[styles.footerLabel, { color: colors.textSecondary }]}>Amount to pay</Text>
            <Text style={[styles.footerTotal, { color: colors.text }]}>₹{total}</Text>
          </View>
          <Pressable
            onPress={handlePay}
            disabled={loading || (paymentMethod === 'wallet' && !canUseWallet)}
            style={[
              styles.payButton,
              {
                backgroundColor: colors.primary,
                opacity: loading || (paymentMethod === 'wallet' && !canUseWallet) ? 0.6 : 1,
              },
            ]}>
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.payButtonText}>
                {paymentMethod === 'wallet' ? 'Pay with Wallet' : 'Pay Now'}
              </Text>
            )}
          </Pressable>
        </View>

        <RazorpayCheckout
          visible={showCheckout}
          data={checkoutData}
          onSuccess={handlePaymentSuccess}
          onClose={() => setShowCheckout(false)}
        />
      </View>
    </>
  );
}

function PaymentOption({
  label,
  sublabel,
  icon,
  selected,
  onPress,
  colors,
  disabled,
}: {
  label: string;
  sublabel: string;
  icon: keyof typeof Ionicons.glyphMap;
  selected: boolean;
  onPress: () => void;
  colors: (typeof Colors)['light'];
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.paymentCard,
        {
          backgroundColor: colors.card,
          borderColor: selected ? colors.primary : colors.border,
          opacity: disabled ? 0.5 : 1,
        },
      ]}>
      <Ionicons name={icon} size={22} color={selected ? colors.primary : colors.textSecondary} />
      <Text style={[styles.paymentLabel, { color: colors.text }]}>{label}</Text>
      <Text style={[styles.paymentSub, { color: colors.textSecondary }]}>{sublabel}</Text>
    </Pressable>
  );
}

function SummaryRow({
  label,
  value,
  colors,
  bold,
  highlight,
}: {
  label: string;
  value: string;
  colors: (typeof Colors)['light'];
  bold?: boolean;
  highlight?: boolean;
}) {
  return (
    <View style={styles.summaryRow}>
      <Text
        style={[
          styles.summaryLabel,
          { color: colors.textSecondary },
          bold && { color: colors.text, fontWeight: '700' },
        ]}>
        {label}
      </Text>
      <Text
        style={[
          styles.summaryValue,
          { color: colors.text },
          bold && { fontWeight: '800', fontSize: 18 },
          highlight && { color: colors.success },
        ]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: 120 },
  sectionTitle: { fontSize: 16, fontWeight: '700' },
  summaryCard: { padding: spacing.lg, borderRadius: radius.lg, gap: spacing.sm },
  summaryItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  emoji: { fontSize: 28 },
  summaryInfo: { flex: 1 },
  itemName: { fontSize: 14, fontWeight: '600' },
  itemMeta: { fontSize: 12, marginTop: 2 },
  itemTotal: { fontSize: 14, fontWeight: '700' },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryLabel: { fontSize: 14 },
  summaryValue: { fontSize: 14, fontWeight: '600' },
  divider: { height: 1, marginVertical: spacing.xs },
  slotCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  slotLabel: { fontSize: 12 },
  slotValue: { fontSize: 14, fontWeight: '600' },
  paymentRow: { flexDirection: 'row', gap: spacing.md },
  paymentCard: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.xs,
  },
  paymentLabel: { fontSize: 14, fontWeight: '700' },
  paymentSub: { fontSize: 11 },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderTopWidth: 1,
  },
  footerLabel: { fontSize: 12 },
  footerTotal: { fontSize: 22, fontWeight: '800' },
  payButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    minWidth: 160,
    alignItems: 'center',
  },
  payButtonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
});
