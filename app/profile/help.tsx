import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import ProfileDetailCard from '@/components/ProfileDetailCard';
import Colors from '@/constants/Colors';
import { radius, spacing } from '@/constants/theme';
import { useColorScheme } from '@/components/useColorScheme';
import { useWalletEnabled } from '@/hooks/useWalletEnabled';

export default function HelpScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const walletEnabled = useWalletEnabled();

  const faqs = [
    {
      question: 'What is the order cutoff time?',
      answer: 'Place orders before 11:00 PM for next-morning delivery.',
    },
    {
      question: 'What is the minimum order value?',
      answer: 'Orders below ₹299 include a ₹30 delivery fee. Orders of ₹299+ get free delivery.',
    },
    {
      question: 'What payment methods are available?',
      answer: walletEnabled
        ? 'You can pay with wallet, cash on delivery, or demo pay during checkout.'
        : 'You can pay with cash on delivery or demo pay during checkout.',
    },
  ];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}>
      <ProfileDetailCard title="Contact support">
        <Text style={[styles.body, { color: colors.textSecondary }]}>
          Need help with an order or delivery? Reach us anytime.
        </Text>
        <Pressable
          style={[styles.contactButton, { backgroundColor: colors.primary }]}
          onPress={() => Linking.openURL('mailto:support@pachari.com')}>
          <Text style={styles.contactText}>Email support@pachari.com</Text>
        </Pressable>
        <Pressable
          style={[styles.contactButton, { backgroundColor: colors.wallet, borderColor: colors.primary }]}
          onPress={() => Linking.openURL('tel:+919876543210')}>
          <Text style={[styles.contactText, { color: colors.primary }]}>Call +91 98765 43210</Text>
        </Pressable>
      </ProfileDetailCard>

      <ProfileDetailCard title="FAQs">
        {faqs.map((item) => (
          <View key={item.question} style={styles.faqItem}>
            <Text style={[styles.question, { color: colors.text }]}>{item.question}</Text>
            <Text style={[styles.body, { color: colors.textSecondary }]}>{item.answer}</Text>
          </View>
        ))}
      </ProfileDetailCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl },
  body: { fontSize: 14, lineHeight: 22 },
  contactButton: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  contactText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
  faqItem: { gap: spacing.xs, marginBottom: spacing.md },
  question: { fontSize: 15, fontWeight: '700' },
});
