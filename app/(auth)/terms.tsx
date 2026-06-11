import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Colors from '@/constants/Colors';
import { TERMS_SECTIONS, TERMS_TITLE, TERMS_VERSION } from '@/constants/terms';
import { radius, spacing } from '@/constants/theme';
import { useColorScheme } from '@/components/useColorScheme';

export default function TermsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + spacing.md,
            backgroundColor: colors.card,
            borderBottomColor: colors.border,
          },
        ]}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={[styles.back, { color: colors.primary }]}>Back</Text>
        </Pressable>
        <Text style={[styles.title, { color: colors.text }]}>{TERMS_TITLE}</Text>
        <Text style={[styles.version, { color: colors.textSecondary }]}>Last updated: {TERMS_VERSION}</Text>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + spacing.xl },
        ]}>
        {TERMS_SECTIONS.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{section.title}</Text>
            <Text style={[styles.sectionBody, { color: colors.textSecondary }]}>{section.body}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    gap: spacing.xs,
  },
  back: { fontSize: 16, fontWeight: '600', marginBottom: spacing.sm },
  title: { fontSize: 24, fontWeight: '800' },
  version: { fontSize: 13 },
  content: { padding: spacing.xl, gap: spacing.lg },
  section: { gap: spacing.xs },
  sectionTitle: { fontSize: 16, fontWeight: '700' },
  sectionBody: { fontSize: 14, lineHeight: 22 },
});
