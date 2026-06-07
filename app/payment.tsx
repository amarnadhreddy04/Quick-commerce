import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import ProductImage from '@/components/ProductImage';
import Colors from '@/constants/Colors';
import { radius, shadows, spacing } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { calculateOrderTotal, freeDeliveryMessage } from '@/lib/cartFees';
import { getPaymentConfig, PaymentConfig } from '@/lib/payments';
import { useColorScheme } from '@/components/useColorScheme';
type PaymentMethod = 'razorpay' | 'wallet' | 'cod';

export default function PaymentScreen() {
  const router = useRouter();
  const { token, user } = useAuth();
  const { items, subtotal } = useCart();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const [paymentConfig, setPaymentConfig] = useState<PaymentConfig | null>(null);

  const { deliveryFee, total } = calculateOrderTotal(subtotal);
  const deliveryHint = freeDeliveryMessage(subtotal);
  const canUseWallet = (user?.walletBalance ?? 0) >= total;
  const isDemoMode = paymentConfig?.demoMode ?? !paymentConfig?.configured;

  useEffect(() => {
    if (items.length === 0) {
      router.replace('/(tabs)/cart');
    }
  }, [items.length, router]);

  useEffect(() => {
    if (!token) return;
    getPaymentConfig(token)
      .then(setPaymentConfig)
      .catch(() => undefined);
  }, [token]);

  const goToCheckout = (method: PaymentMethod) => {
    router.push({ pathname: '/checkout', params: { method } });
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
                <View style={styles.itemImageWrap}>
                  <ProductImage product={item.product} style={styles.itemImage} emojiStyle={styles.emoji} />
                </View>
                <View style={styles.summaryInfo}>
                  <Text style={[styles.itemName, { color: colors.text }]} numberOfLines={1}>
                    {item.product.name}
                  </Text>
                  <Text style={[styles.itemMeta, { color: colors.textSecondary }]}>
                    {item.quantity} × ₹{item.product.price}
                  </Text>
                </View>
                <Text style={[styles.itemTotal, { color: colors.text }]}>₹{item.product.price * item.quantity}</Text>
              </View>
            ))}
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            {deliveryHint ? (
              <Text style={[styles.deliveryHint, { color: colors.primary }]}>{deliveryHint}</Text>
            ) : null}
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

          <Text style={[styles.sectionTitle, { color: colors.text }]}>Choose Payment Method</Text>
          <Text style={[styles.sectionHint, { color: colors.textSecondary }]}>
            Tap a method to go to checkout
          </Text>

          <PaymentOption
            label={isDemoMode ? 'Demo Pay (Free)' : 'Razorpay'}
            sublabel={isDemoMode ? 'Test payment — no real charge' : 'UPI, Card, Netbanking'}
            icon={isDemoMode ? 'flask-outline' : 'card-outline'}
            onPress={() => goToCheckout('razorpay')}
            colors={colors}
          />

          <PaymentOption
            label="Cash on Delivery"
            sublabel="Pay when order arrives"
            icon="cash-outline"
            onPress={() => goToCheckout('cod')}
            colors={colors}
          />

          <PaymentOption
            label="Wallet"
            sublabel={`Balance ₹${(user?.walletBalance ?? 0).toFixed(2)}`}
            icon="wallet-outline"
            onPress={() => goToCheckout('wallet')}
            colors={colors}
            disabled={!canUseWallet}
          />
        </ScrollView>

        <View style={[styles.footer, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
          <Text style={[styles.footerLabel, { color: colors.textSecondary }]}>Total payable</Text>
          <Text style={[styles.footerTotal, { color: colors.text }]}>₹{total}</Text>
        </View>
      </View>
    </>
  );
}

function PaymentOption({
  label,
  sublabel,
  icon,
  onPress,
  colors,
  disabled,
}: {
  label: string;
  sublabel: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  colors: (typeof Colors)['light'];
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.paymentCard,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
        },
      ]}>
      <View style={styles.paymentCardRow}>
        <Ionicons name={icon} size={24} color={colors.primary} />
        <View style={styles.paymentCardInfo}>
          <Text style={[styles.paymentLabel, { color: colors.text }]}>{label}</Text>
          <Text style={[styles.paymentSub, { color: colors.textSecondary }]}>{sublabel}</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.primary} />
      </View>
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
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: 100 },
  sectionTitle: { fontSize: 16, fontWeight: '700' },
  sectionHint: { fontSize: 13, marginTop: -spacing.xs },
  summaryCard: { padding: spacing.lg, borderRadius: radius.lg, gap: spacing.sm },
  summaryItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  itemImageWrap: {
    width: 44,
    height: 44,
    borderRadius: radius.sm,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemImage: { width: '100%', height: '100%' },
  emoji: { fontSize: 28 },
  summaryInfo: { flex: 1 },
  itemName: { fontSize: 14, fontWeight: '600' },
  itemMeta: { fontSize: 12, marginTop: 2 },
  itemTotal: { fontSize: 14, fontWeight: '700' },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryLabel: { fontSize: 14 },
  summaryValue: { fontSize: 14, fontWeight: '600' },
  divider: { height: 1, marginVertical: spacing.xs },
  deliveryHint: { fontSize: 13, lineHeight: 18, fontWeight: '500', marginBottom: spacing.xs },
  paymentCard: { borderWidth: 1.5, borderRadius: radius.lg, padding: spacing.lg },
  paymentCardRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  paymentCardInfo: { flex: 1, gap: 2 },
  paymentLabel: { fontSize: 15, fontWeight: '700' },
  paymentSub: { fontSize: 12 },
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
});
