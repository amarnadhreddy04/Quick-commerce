import type { PincodeLocation } from '@/lib/deliveryPincodes';

export function getPincodeMapUrl(location: PincodeLocation, width = 640, height = 240) {
  const { latitude, longitude } = location;
  const zoom = 12;
  return `https://staticmap.openstreetmap.de/staticmap.php?center=${latitude},${longitude}&zoom=${zoom}&size=${width}x${height}&markers=${latitude},${longitude},red-pushpin`;
}
