import type { AppSettings } from '@/lib/api';

export type FeeSettings = Pick<
  AppSettings,
  'minOrderValue' | 'deliveryFee' | 'platformFeeEnabled' | 'platformFee'
>;

const defaultFeeSettings: FeeSettings = {
  minOrderValue: 299,
  deliveryFee: 30,
  platformFeeEnabled: true,
  platformFee: 5,
};

export function calculateDeliveryFee(subtotal: number, settings: FeeSettings = defaultFeeSettings) {
  return subtotal >= settings.minOrderValue ? 0 : settings.deliveryFee;
}

export function calculatePlatformFee(settings: FeeSettings = defaultFeeSettings) {
  return settings.platformFeeEnabled ? settings.platformFee : 0;
}

export function calculateOrderTotal(
  subtotal: number,
  settings: FeeSettings = defaultFeeSettings,
  promoDiscount = 0
) {
  const deliveryFee = calculateDeliveryFee(subtotal, settings);
  const platformFee = calculatePlatformFee(settings);
  const discount = Math.min(Math.max(0, promoDiscount), subtotal);
  const total = Math.max(0, subtotal - discount + deliveryFee + platformFee);
  return {
    deliveryFee,
    platformFee,
    promoDiscount: discount,
    total: Math.round(total * 100) / 100,
    minOrderValue: settings.minOrderValue,
  };
}

export function amountForFreeDelivery(subtotal: number, settings: FeeSettings = defaultFeeSettings) {
  const remaining = settings.minOrderValue - subtotal;
  return remaining > 0 ? Math.ceil(remaining) : 0;
}

export function freeDeliveryMessage(subtotal: number, settings: FeeSettings = defaultFeeSettings) {
  const gap = amountForFreeDelivery(subtotal, settings);
  if (gap <= 0) return null;
  return `Please add ₹${gap} more to get free delivery (no ₹${settings.deliveryFee} delivery fee)`;
}
