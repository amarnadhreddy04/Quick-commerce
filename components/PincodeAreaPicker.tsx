import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import PincodeMapPreview from '@/components/PincodeMapPreview';
import Colors from '@/constants/Colors';
import { radius, spacing } from '@/constants/theme';
import { useColorScheme } from '@/components/useColorScheme';
import { ALLOWED_PINCODES, type PincodeLocation } from '@/lib/deliveryPincodes';

type Props = {
  selectedPincode: string;
  onSelect: (location: PincodeLocation) => void;
};

export default function PincodeAreaPicker({ selectedPincode, onSelect }: Props) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  return (
    <View style={styles.wrap}>
      <Text style={[styles.hint, { color: colors.textSecondary }]}>
        Tap a delivery area — pincode and location will be filled automatically.
      </Text>

      <View style={styles.list}>
        {ALLOWED_PINCODES.map((item) => {
          const selected = selectedPincode === item.pincode;
          return (
            <Pressable
              key={item.pincode}
              onPress={() => onSelect(item)}
              style={[
                styles.card,
                {
                  backgroundColor: selected ? colors.wallet : colors.card,
                  borderColor: selected ? colors.primary : colors.border,
                },
              ]}>
              <Ionicons
                name={selected ? 'radio-button-on' : 'radio-button-off'}
                size={20}
                color={selected ? colors.primary : colors.textSecondary}
              />
              <View style={styles.cardBody}>
                <Text style={[styles.pincode, { color: colors.text }]}>{item.pincode}</Text>
                <Text style={[styles.label, { color: colors.textSecondary }]}>{item.label}</Text>
              </View>
              {selected ? (
                <View style={[styles.selectedBadge, { backgroundColor: colors.primary }]}>
                  <Text style={styles.selectedBadgeText}>Selected</Text>
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </View>

      {selectedPincode ? (
        <View style={styles.preview}>
          <PincodeMapPreview pincode={selectedPincode} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.md },
  hint: {
    fontSize: 13,
    lineHeight: 20,
  },
  list: { gap: spacing.sm },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  cardBody: { flex: 1, gap: 2 },
  pincode: {
    fontSize: 16,
    fontWeight: '800',
  },
  label: {
    fontSize: 13,
    lineHeight: 18,
  },
  selectedBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  selectedBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  preview: {
    marginTop: spacing.xs,
  },
});
