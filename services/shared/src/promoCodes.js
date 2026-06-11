import { randomUUID } from 'crypto';

import { queryOne, run } from './db.js';

export function normalizePromoCode(code) {
  return String(code ?? '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '');
}

export function formatPromoCode(row) {
  if (!row) return null;
  return {
    id: row.id,
    code: row.code,
    description: row.description ?? '',
    discountType: row.discount_type,
    discountValue: row.discount_value,
    minOrderValue: row.min_order_value ?? 0,
    maxDiscount: row.max_discount ?? null,
    active: row.active === 1,
    usageLimit: row.usage_limit ?? null,
    usedCount: row.used_count ?? 0,
    expiresAt: row.expires_at ?? null,
    createdAt: row.created_at,
  };
}

export function computePromoDiscount(subtotal, promo) {
  if (!promo || subtotal <= 0) return 0;

  let discount = 0;
  if (promo.discount_type === 'percent') {
    discount = (subtotal * promo.discount_value) / 100;
    if (promo.max_discount != null && promo.max_discount > 0) {
      discount = Math.min(discount, promo.max_discount);
    }
  } else {
    discount = promo.discount_value;
  }

  return Math.round(Math.min(discount, subtotal) * 100) / 100;
}

export function validatePromoCode(code, subtotal) {
  const normalized = normalizePromoCode(code);
  if (!normalized) {
    return { valid: false, error: 'Enter a promo code' };
  }

  const promo = queryOne('SELECT * FROM promo_codes WHERE code = ?', [normalized]);
  if (!promo) {
    return { valid: false, error: 'Invalid promo code' };
  }
  if (promo.active !== 1) {
    return { valid: false, error: 'This promo code is not active' };
  }
  if (promo.expires_at) {
    const expires = new Date(promo.expires_at.replace(' ', 'T'));
    if (!Number.isNaN(expires.getTime()) && expires < new Date()) {
      return { valid: false, error: 'This promo code has expired' };
    }
  }
  if (promo.usage_limit != null && promo.used_count >= promo.usage_limit) {
    return { valid: false, error: 'This promo code has reached its usage limit' };
  }
  if (subtotal < (promo.min_order_value ?? 0)) {
    return {
      valid: false,
      error: `Minimum order value ₹${promo.min_order_value} required for this code`,
    };
  }

  const discount = computePromoDiscount(subtotal, promo);
  if (discount <= 0) {
    return { valid: false, error: 'This promo code does not apply to your cart' };
  }

  return {
    valid: true,
    code: promo.code,
    discount,
    promo: formatPromoCode(promo),
  };
}

export function resolvePromoForOrder(code, subtotal) {
  const result = validatePromoCode(code, subtotal);
  if (!result.valid) {
    return { error: result.error };
  }
  return {
    code: result.code,
    discount: result.discount,
    promo: result.promo,
  };
}

export function incrementPromoUsage(code) {
  const normalized = normalizePromoCode(code);
  if (!normalized) return;
  run('UPDATE promo_codes SET used_count = used_count + 1 WHERE code = ?', [normalized]);
}

export function ensureDemoPromoCodes() {
  const demos = [
    {
      code: 'WELCOME50',
      description: '₹50 off on your first big basket',
      discountType: 'flat',
      discountValue: 50,
      minOrderValue: 299,
      maxDiscount: null,
    },
    {
      code: 'SAVE10',
      description: '10% off groceries (max ₹100)',
      discountType: 'percent',
      discountValue: 10,
      minOrderValue: 199,
      maxDiscount: 100,
    },
  ];

  demos.forEach((demo) => {
    const existing = queryOne('SELECT id FROM promo_codes WHERE code = ?', [demo.code]);
    if (existing) {
      run(
        `UPDATE promo_codes
         SET description = ?, discount_type = ?, discount_value = ?, min_order_value = ?, max_discount = ?, active = 1
         WHERE code = ?`,
        [
          demo.description,
          demo.discountType,
          demo.discountValue,
          demo.minOrderValue,
          demo.maxDiscount,
          demo.code,
        ]
      );
      return;
    }
    run(
      `INSERT INTO promo_codes (id, code, description, discount_type, discount_value, min_order_value, max_discount, active, used_count)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1, 0)`,
      [
        randomUUID(),
        demo.code,
        demo.description,
        demo.discountType,
        demo.discountValue,
        demo.minOrderValue,
        demo.maxDiscount,
      ]
    );
  });
}
