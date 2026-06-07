import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';

import Colors from '@/constants/Colors';
import { radius, spacing } from '@/constants/theme';
import { buildRazorpayHtml, RazorpayCheckoutData } from '@/lib/payments';
import { useColorScheme } from '@/components/useColorScheme';

type Props = {
  visible: boolean;
  data: RazorpayCheckoutData | null;
  onSuccess: (payment: {
    razorpayPaymentId: string;
    razorpayOrderId: string;
    razorpaySignature: string;
  }) => void;
  onClose: () => void;
};

export default function RazorpayCheckout({ visible, data, onSuccess, onClose }: Props) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  if (!data) return null;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: colors.card }]}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.text }]}>Secure Payment</Text>
          <Pressable onPress={onClose}>
            <Text style={[styles.close, { color: colors.primary }]}>Close</Text>
          </Pressable>
        </View>

        {data.demo ? (
          <View style={[styles.demoBanner, { backgroundColor: colors.wallet }]}>
            <Text style={[styles.demoText, { color: colors.primary }]}>
              Demo mode — tap Pay Now to simulate Razorpay payment
            </Text>
          </View>
        ) : null}

        <WebView
          originWhitelist={['*']}
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
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    marginTop: spacing.xl,
  },
  title: { fontSize: 18, fontWeight: '700' },
  close: { fontSize: 14, fontWeight: '600' },
  demoBanner: {
    margin: spacing.lg,
    padding: spacing.md,
    borderRadius: radius.md,
  },
  demoText: { fontSize: 13, fontWeight: '600', textAlign: 'center' },
  webview: { flex: 1 },
});
