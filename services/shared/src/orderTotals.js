import { queryOne } from './db.js';
import { resolvePromoForOrder } from './promoCodes.js';

export function getAppFeeSettings() {
  const row = queryOne('SELECT * FROM app_settings WHERE id = 1');
  return {
    minOrderValue: row?.min_order_value ?? 299,
    deliveryFee: row?.delivery_fee ?? 30,
    platformFeeEnabled: row?.platform_fee_enabled !== 0,
    platformFee: row?.platform_fee ?? 5,
  };
}

export function calculateOrderAmount(items, settings = null, promo = null) {
  const fees = settings ?? getAppFeeSettings();
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const deliveryFee = subtotal >= fees.minOrderValue ? 0 : fees.deliveryFee;
  const platformFee = fees.platformFeeEnabled ? fees.platformFee : 0;

  let promoCode = null;
  let promoDiscount = 0;
  if (promo?.code) {
    const resolved = resolvePromoForOrder(promo.code, subtotal);
    if (resolved.error) {
      return { error: resolved.error };
    }
    promoCode = resolved.code;
    promoDiscount = resolved.discount;
  } else if (promo?.discount != null && promo?.code) {
    promoCode = promo.code;
    promoDiscount = Math.min(Number(promo.discount), subtotal);
  }

  const total = Math.max(0, subtotal - promoDiscount + deliveryFee + platformFee);

  return {
    subtotal,
    deliveryFee,
    platformFee,
    promoCode,
    promoDiscount,
    total: Math.round(total * 100) / 100,
    minOrderValue: fees.minOrderValue,
  };
}

export function validateOrderTotals(payload, items) {
  const promo =
    payload.promoCode && String(payload.promoCode).trim()
      ? { code: payload.promoCode }
      : null;
  const expected = calculateOrderAmount(items, null, promo);
  if (expected.error) {
    return expected.error;
  }

  const total = Number(payload.total);
  const deliveryFee = Number(payload.deliveryFee ?? 0);
  const platformFee = Number(payload.platformFee ?? 0);
  const promoDiscount = Number(payload.promoDiscount ?? 0);

  if (
    Math.abs(total - expected.total) > 0.01 ||
    Math.abs(deliveryFee - expected.deliveryFee) > 0.01 ||
    Math.abs(platformFee - expected.platformFee) > 0.01 ||
    Math.abs(promoDiscount - (expected.promoDiscount ?? 0)) > 0.01 ||
    (payload.promoCode && expected.promoCode !== normalizePromo(payload.promoCode))
  ) {
    const parts = [`₹${expected.total}`];
    if (expected.promoDiscount) parts.push(`promo -₹${expected.promoDiscount}`);
    if (expected.deliveryFee) parts.push(`delivery ₹${expected.deliveryFee}`);
    if (expected.platformFee) parts.push(`platform fee ₹${expected.platformFee}`);
    return `Order total mismatch. Expected ${parts.join(', ')}`;
  }
  return null;
}

function normalizePromo(code) {
  return String(code ?? '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '');
}
