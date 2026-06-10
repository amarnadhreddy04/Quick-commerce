import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import Colors from '@/constants/Colors';
import { radius, spacing } from '@/constants/theme';
import { useColorScheme } from '@/components/useColorScheme';
import { getPincodeLocation } from '@/lib/deliveryPincodes';
import { getPincodeMapUrl } from '@/lib/pincodeMap';

type Props = {
  pincode: string;
};

function LocationFallback({
  label,
  pincode,
  latitude,
  longitude,
  colors,
}: {
  label: string;
  pincode: string;
  latitude: number;
  longitude: number;
  colors: (typeof Colors)['light'];
}) {
  return (
    <View style={[styles.fallback, { backgroundColor: colors.wallet, borderColor: colors.primary }]}>
      <Ionicons name="map" size={36} color={colors.primary} />
      <Text style={[styles.fallbackTitle, { color: colors.text }]}>{label}</Text>
      <Text style={[styles.fallbackMeta, { color: colors.textSecondary }]}>
        Pincode {pincode} · {latitude.toFixed(4)}, {longitude.toFixed(4)}
      </Text>
    </View>
  );
}

export default function PincodeMapPreview({ pincode }: Props) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const location = getPincodeLocation(pincode);
  const [mapFailed, setMapFailed] = useState(false);

  if (!location) {
    return (
      <View style={[styles.placeholder, { backgroundColor: colors.background, borderColor: colors.border }]}>
        <Ionicons name="location-outline" size={28} color={colors.textSecondary} />
        <Text style={[styles.placeholderText, { color: colors.textSecondary }]}>
          Select a delivery area to preview it on the map.
        </Text>
      </View>
    );
  }

  const showFallback = mapFailed;

  return (
    <View style={[styles.wrap, { borderColor: colors.border }]}>
      {showFallback ? (
        <LocationFallback
          label={location.label}
          pincode={location.pincode}
          latitude={location.latitude}
          longitude={location.longitude}
          colors={colors}
        />
      ) : (
        <Image
          key={location.pincode}
          source={{ uri: getPincodeMapUrl(location) }}
          style={styles.map}
          resizeMode="cover"
          onError={() => setMapFailed(true)}
        />
      )}
      <View style={[styles.caption, { backgroundColor: colors.card }]}>
        <Ionicons name="location" size={14} color={colors.primary} />
        <Text style={[styles.captionText, { color: colors.text }]}>
          {location.label} · {location.pincode}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderWidth: 1,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  map: {
    height: 180,
    width: '100%',
    backgroundColor: '#E5E7EB',
  },
  caption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  captionText: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  placeholder: {
    height: 180,
    borderWidth: 1,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.sm,
  },
  placeholderText: {
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
  },
  fallback: {
    height: 180,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.xs,
  },
  fallbackTitle: {
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
  fallbackMeta: {
    fontSize: 12,
    textAlign: 'center',
  },
});
