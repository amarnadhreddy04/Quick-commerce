import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';

import Colors from '@/constants/Colors';
import { radius, spacing } from '@/constants/theme';
import { buildRazorpayHtml, RazorpayCheckoutData } from '@/lib/payments';
import { useColorScheme } from '@/components/useColorScheme';

type Props = {
  visible: boolean;
  data: RazorpayCheckoutData | null;
  loading?: boolean;
  onSuccess: (payment: {
    razorpayPaymentId: string;
    razorpayOrderId: string;
    razorpaySignature: string;
  }) => void;
  onClose: () => void;
};

export default function PaymentCheckoutModal({
  visible,
  data,
  loading = false,
  onSuccess,
  onClose,
}: Props) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  if (!data) return null;

  const handleDemoPay = () => {
    onSuccess({
      razorpayPaymentId: `pay_demo_${Date.now()}`,
      razorpayOrderId: data.razorpayOrderId,
      razorpaySignature: 'demo_signature',
    });
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { borderBottomColor: colors.border, backgroundColor: colors.card }]}>
          <Text style={[styles.title, { color: colors.text }]}>Complete Payment</Text>
          <Pressable onPress={onClose} hitSlop={12}>
            <Ionicons name="close" size={24} color={colors.textSecondary} />
          </Pressable>
        </View>

        <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.orderId, { color: colors.textSecondary }]}>Order {data.orderId}</Text>
          <Text style={[styles.amount, { color: colors.text }]}>₹{(data.amount / 100).toFixed(2)}</Text>
          {data.demo ? (
            <View style={[styles.demoBadge, { backgroundColor: colors.wallet }]}>
              <Ionicons name="flask-outline" size={16} color={colors.primary} />
              <Text style={[styles.demoText, { color: colors.primary }]}>
                Demo payment — no real money charged
              </Text>
            </View>
          ) : (
            <Text style={[styles.liveText, { color: colors.textSecondary }]}>
              Secured by Razorpay (UPI, Card, Netbanking)
            </Text>
          )}
        </View>

        {data.demo ? (
          <View style={styles.demoBody}>
            <Ionicons name="shield-checkmark-outline" size={48} color={colors.primary} />
            <Text style={[styles.demoTitle, { color: colors.text }]}>Test Payment Gateway</Text>
            <Text style={[styles.demoSubtitle, { color: colors.textSecondary }]}>
              Tap below to simulate a successful payment and place your order.
            </Text>
            <Pressable
              onPress={handleDemoPay}
              disabled={loading}
              style={[styles.payButton, { backgroundColor: colors.primary, opacity: loading ? 0.7 : 1 }]}>
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.payButtonText}>Pay ₹{(data.amount / 100).toFixed(2)} (Demo)</Text>
              )}
            </Pressable>
          </View>
        ) : (
          <WebView
            originWhitelist={['*']}
            javaScriptEnabled
            domStorageEnabled
            source={{ html: buildRazorpayHtml(data) }}
            onMessage={(event) => {
              try {
                const message = JSON.parse(event.nativeEvent.data);
                if (message.status === 'success') {
                  onSuccess({
                    razorpayPaymentId: message.razorpay_payment_id,
                    razorpayOrderId: message.razorpay_order_id,
                    razorpaySignature: message.razorpay_signature,
                  });
                } else if (message.status === 'cancelled') {
                  onClose();
                }
              } catch {
                // ignore malformed messages
              }
            }}
            style={styles.webview}
          />
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: spacing.xl },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  title: { fontSize: 18, fontWeight: '700' },
  summaryCard: {
    margin: spacing.lg,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    alignItems: 'center',
    gap: spacing.sm,
  },
  orderId: { fontSize: 13 },
  amount: { fontSize: 32, fontWeight: '800' },
  demoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.md,
  },
  demoText: { fontSize: 12, fontWeight: '600' },
  liveText: { fontSize: 13, textAlign: 'center' },
  demoBody: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
    gap: spacing.md,
  },
  demoTitle: { fontSize: 20, fontWeight: '700' },
  demoSubtitle: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  payButton: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    minWidth: 240,
    alignItems: 'center',
  },
  payButtonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },
  webview: { flex: 1 },
});
