import type { DeliveryCheck } from '@/lib/api';

export const ALLOWED_PINCODES = [
  { pincode: '523201', label: 'Addanki, Andhra Pradesh' },
  { pincode: '522601', label: 'Vinukonda, Andhra Pradesh' },
  { pincode: '513255', label: 'Rayadurg, Andhra Pradesh' },
] as const;

export function checkPincodeLocally(pincode: string): DeliveryCheck {
  const digits = pincode.replace(/\D/g, '');
  if (digits.length !== 6) {
    return { available: false, message: 'Enter a valid 6-digit pincode' };
  }

  const match = ALLOWED_PINCODES.find((item) => item.pincode === digits);
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
