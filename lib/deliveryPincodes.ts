import type { DeliveryCheck } from '@/lib/api';

export type PincodeLocation = {
  pincode: string;
  label: string;
  latitude: number;
  longitude: number;
};

export const ALLOWED_PINCODES: readonly PincodeLocation[] = [
  { pincode: '523201', label: 'Addanki, Andhra Pradesh', latitude: 15.8097, longitude: 79.9813 },
  { pincode: '523157', label: 'Chirala, Andhra Pradesh', latitude: 15.8236, longitude: 80.3522 },
  { pincode: '522601', label: 'Vinukonda, Andhra Pradesh', latitude: 16.0583, longitude: 79.7256 },
  { pincode: '513255', label: 'Rayadurg, Andhra Pradesh', latitude: 14.9652, longitude: 76.8458 },
] as const;

export function getPincodeLocation(pincode: string): PincodeLocation | null {
  const digits = pincode.replace(/\D/g, '');
  return ALLOWED_PINCODES.find((item) => item.pincode === digits) ?? null;
}

export function checkPincodeLocally(pincode: string): DeliveryCheck {
  const digits = pincode.replace(/\D/g, '');
  if (digits.length !== 6) {
    return { available: false, message: 'Enter a valid 6-digit pincode' };
  }

  const match = getPincodeLocation(digits);
  if (match) {
    return {
      available: true,
      pincode: digits,
      label: match.label,
    };
  }

  const pincodeList = ALLOWED_PINCODES.map((item) => item.pincode).join(', ');
  return {
    available: false,
    pincode: digits,
    message: `We're currently unable to deliver to pincode ${digits}. We serve: ${pincodeList}`,
    allowedPincodes: ALLOWED_PINCODES.map((item) => ({
      pincode: item.pincode,
      label: item.label,
    })),
  };
}
