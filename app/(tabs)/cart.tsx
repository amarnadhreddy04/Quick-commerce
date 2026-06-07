import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import QuantityStepper from '@/components/QuantityStepper';
import RazorpayCheckout from '@/components/RazorpayCheckout';
import Colors from '@/constants/Colors';
import { radius, shadows, spacing } from '@/constants/theme';
import { deliverySlot } from '@/data/mockData';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import {
  createPaymentOrder,
  RazorpayCheckoutData,
  verifyPayment,
} from '@/lib/payments';
import { useColorScheme } from '@/components/useColorScheme';

type PaymentMethod = 'razorpay' | 'wallet';

export default function CartScreen() {
  const router = useRouter();
  const { token, user } = useAuth();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const { items, subtotal, updateQuantity, getQuantity, clearCart } = useCart();

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('razorpay');
  const [loading, setLoading] = useState(false);
  const [checkoutData, setCheckoutData] = useState<RazorpayCheckoutData | null>(null);
  const [showCheckout, setShowCheckout] = useState(false);

  if (items.length === 0) {
    return (
      <View style={[styles.empty, { backgroundColor: colors.background }]}>
        <Ionicons name="basket-outline" size={64} color={colors.textSecondary} />
        <Text style={[styles.emptyTitle, { color: colors.text }]}>Your basket is empty</Text>
        <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
          Add milk, bread, and daily essentials for tomorrow morning delivery.
        </Text>
      </View>
    );
  }

  const deliveryFee = subtotal >= 200 ? 0 : 15;
  const total = subtotal + deliveryFee;
  const canUseWallet = (user?.walletBalance ?? 0) >= total;

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

  const handleCheckout = async () => {
    if (!token) return;

    setLoading(true);
    try {
      const result = await createPaymentOrder(token, buildPayload());

      if ('paymentMethod' in result && result.paymentMethod === 'wallet') {
        clearCart();
        Alert.alert('Order Placed!', 'Payment deducted from your wallet.', [
          { text: 'View Orders', onPress: () => router.push('/orders') },
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
      setCheckoutData(null);
      Alert.alert('Payment Successful!', 'Your order has been placed for tomorrow delivery.', [
        { text: 'View Orders', onPress: () => router.push('/orders') },
      ]);
    } catch (error) {
      Alert.alert('Verification Failed', error instanceof Error ? error.message : 'Try again');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.slotCard, { backgroundColor: colors.wallet, borderColor: colors.border }]}>
          <Ionicons name="time-outline" size={20} color={colors.primary} />
          <View>
            <Text style={[styles.slotLabel, { color: colors.textSecondary }]}>Delivery Slot</Text>
            <Text style={[styles.slotValue, { color: colors.text }]}>{deliverySlot}</Text>
          </View>
        </View>

        {items.map((item) => (
          <View
            key={item.product.id}
            style={[styles.itemCard, shadows.card, { backgroundColor: colors.card }]}>
            <Text style={styles.emoji}>{item.product.image}</Text>
            <View style={styles.itemInfo}>
              <Text style={[styles.itemBrand, { color: colors.textSecondary }]}>{item.product.brand}</Text>
              <Text style={[styles.itemName, { color: colors.text }]}>{item.product.name}</Text>
              <Text style={[styles.itemUnit, { color: colors.textSecondary }]}>{item.product.unit}</Text>
              <Text style={[styles.itemPrice, { color: colors.text }]}>₹{item.product.price * item.quantity}</Text>
            </View>
            <QuantityStepper
              quantity={getQuantity(item.product.id)}
              onIncrease={() => updateQuantity(item.product.id, item.quantity + 1)}
              onDecrease={() => updateQuantity(item.product.id, item.quantity - 1)}
            />
          </View>
        ))}

        <Text style={[styles.sectionTitle, { color: colors.text }]}>Payment Method</Text>
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

        <View style={[styles.summary, shadows.card, { backgroundColor: colors.card }]}>
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
      </ScrollView>

      <View style={[styles.footer, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
        <View>
          <Text style={[styles.footerLabel, { color: colors.textSecondary }]}>Total payable</Text>
          <Text style={[styles.footerTotal, { color: colors.text }]}>₹{total}</Text>
        </View>
        <Pressable
          onPress={handleCheckout}
          disabled={loading || (paymentMethod === 'wallet' && !canUseWallet)}
          style={[
            styles.checkoutButton,
            {
              backgroundColor: colors.primary,
              opacity: loading || (paymentMethod === 'wallet' && !canUseWallet) ? 0.6 : 1,
            },
          ]}>
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.checkoutText}>
              {paymentMethod === 'wallet' ? 'Pay with Wallet' : 'Pay with Razorpay'}
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
      <Text style={[styles.summaryLabel, { color: colors.textSecondary }, bold && { color: colors.text, fontWeight: '700' }]}>
        {label}
      </Text>
      <Text style={[styles.summaryValue, { color: colors.text }, bold && { fontWeight: '800', fontSize: 18 }, highlight && { color: colors.success }]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: 120 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xxl, gap: spacing.md },
  emptyTitle: { fontSize: 20, fontWeight: '700' },
  emptySubtitle: { textAlign: 'center', lineHeight: 22 },
  slotCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg, borderRadius: radius.lg, borderWidth: 1 },
  slotLabel: { fontSize: 12 },
  slotValue: { fontSize: 14, fontWeight: '600' },
  itemCard: { flexDirection: 'row', alignItems: 'center', padding: spacing.lg, borderRadius: radius.lg, gap: spacing.md },
  emoji: { fontSize: 36 },
  itemInfo: { flex: 1, gap: 2 },
  itemBrand: { fontSize: 11 },
  itemName: { fontSize: 15, fontWeight: '600' },
  itemUnit: { fontSize: 12 },
  itemPrice: { fontSize: 15, fontWeight: '700', marginTop: spacing.xs },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginTop: spacing.sm },
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
  summary: { padding: spacing.lg, borderRadius: radius.lg, gap: spacing.sm },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryLabel: { fontSize: 14 },
  summaryValue: { fontSize: 14, fontWeight: '600' },
  divider: { height: 1, marginVertical: spacing.xs },
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
  checkoutButton: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderRadius: radius.md, minWidth: 160, alignItems: 'center' },
  checkoutText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
});
