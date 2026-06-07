import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import Colors from '@/constants/Colors';
import { radius, spacing } from '@/constants/theme';
import { useColorScheme } from '@/components/useColorScheme';

type Props = {
  quantity: number;
  onIncrease: () => void;
  onDecrease: () => void;
  compact?: boolean;
};

export default function QuantityStepper({
  quantity,
  onIncrease,
  onDecrease,
  compact = false,
}: Props) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  if (quantity === 0) {
    return (
      <Pressable
        onPress={onIncrease}
        style={[
          styles.addButton,
          compact && styles.addButtonCompact,
          { backgroundColor: colors.primary },
        ]}>
        <Text style={styles.addButtonText}>ADD</Text>
      </Pressable>
    );
  }

  return (
    <View
      style={[
        styles.stepper,
        compact && styles.stepperCompact,
        { borderColor: colors.primary, backgroundColor: colors.card },
      ]}>
      <Pressable onPress={onDecrease} style={styles.stepButton}>
        <Ionicons name="remove" size={16} color={colors.primary} />
      </Pressable>
      <Text style={[styles.quantity, { color: colors.primary }]}>{quantity}</Text>
      <Pressable onPress={onIncrease} style={styles.stepButton}>
        <Ionicons name="add" size={16} color={colors.primary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  addButton: {
    minWidth: 72,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    alignItems: 'center',
  },
  addButtonCompact: {
    minWidth: 64,
    paddingHorizontal: spacing.md,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
    letterSpacing: 0.5,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: radius.sm,
    minWidth: 88,
  },
  stepperCompact: {
    minWidth: 80,
  },
  stepButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  quantity: {
    minWidth: 24,
    textAlign: 'center',
    fontWeight: '700',
    fontSize: 14,
  },
});
