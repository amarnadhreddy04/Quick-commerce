import { Pressable, StyleSheet, Text, View } from 'react-native';

import { radius, spacing } from '@/constants/theme';
import { PromoBanner } from '@/types';

type Props = {
  banner: PromoBanner;
};

export default function CategoryPromoBanner({ banner }: Props) {
  return (
    <View style={styles.wrapper}>
      <View style={styles.banner}>
        <View style={styles.topSection}>
          <View style={styles.sparkleRow}>
            <Text style={styles.sparkle}>✦</Text>
            <Text style={styles.sparkle}>✧</Text>
          </View>

          <View style={styles.content}>
            <View style={styles.textBlock}>
              <Text style={styles.title}>{banner.title}</Text>
              <Text style={styles.subtitle}>{banner.subtitle}</Text>
              <Pressable style={styles.cta}>
                <Text style={styles.ctaText}>{banner.cta}</Text>
              </Pressable>
            </View>

            <View style={styles.productImages}>
              {banner.emojis.map((emoji, index) => (
                <View
                  key={`${banner.id}-${index}`}
                  style={[styles.productBubble, index > 0 && styles.productBubbleOverlap]}>
                  <Text style={styles.productEmoji}>{emoji}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        <View style={styles.checkered}>
          <View style={styles.checkerRow}>
            {Array.from({ length: 12 }).map((_, i) => (
              <View
                key={i}
                style={[styles.checker, i % 2 === 0 ? styles.checkerRed : styles.checkerWhite]}
              />
            ))}
          </View>
        </View>

        <View style={styles.slideBadge}>
          <Text style={styles.slideText}>
            {banner.slide}/{banner.total}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  banner: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    position: 'relative',
  },
  topSection: {
    backgroundColor: '#E85D3B',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    minHeight: 130,
  },
  sparkleRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  sparkle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
  },
  content: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  textBlock: {
    flex: 1,
    gap: 4,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 12,
    fontWeight: '500',
    marginBottom: spacing.sm,
  },
  cta: {
    alignSelf: 'flex-start',
    backgroundColor: '#1A1A1A',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
  },
  ctaText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  productImages: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: spacing.sm,
  },
  productBubble: {
    width: 56,
    height: 72,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  productBubbleOverlap: {
    marginLeft: -12,
  },
  productEmoji: {
    fontSize: 32,
  },
  checkered: {
    height: 18,
    overflow: 'hidden',
  },
  checkerRow: {
    flexDirection: 'row',
    height: '100%',
  },
  checker: {
    flex: 1,
    height: '100%',
  },
  checkerRed: {
    backgroundColor: '#C0392B',
  },
  checkerWhite: {
    backgroundColor: '#FFFFFF',
  },
  slideBadge: {
    position: 'absolute',
    bottom: 22,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: spacing.md,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  slideText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
});
