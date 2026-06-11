import { Router } from 'express';
import { randomUUID } from 'crypto';

import { queryAll, queryOne, run } from '../../../shared/src/db.js';
import { adminRequired, authRequired } from '../../../shared/src/middleware/auth.js';
import {
  formatPromoCode,
  normalizePromoCode,
  validatePromoCode,
} from '../../../shared/src/promoCodes.js';
import { publishSyncEvent } from '../../../shared/src/sync/publish.js';

const router = Router();

router.get('/', authRequired, adminRequired, (_req, res) => {
  const rows = queryAll('SELECT * FROM promo_codes ORDER BY created_at DESC');
  res.json({ promoCodes: rows.map(formatPromoCode) });
});

router.post('/validate', authRequired, (req, res) => {
  const { code, subtotal } = req.body;
  const amount = Number(subtotal ?? 0);
  const result = validatePromoCode(code, amount);
  if (!result.valid) {
    return res.status(400).json({ valid: false, error: result.error });
  }
  res.json({
    valid: true,
    code: result.code,
    discount: result.discount,
    promo: result.promo,
  });
});

router.post('/', authRequired, adminRequired, async (req, res) => {
  const {
    code,
    description,
    discountType,
    discountValue,
    minOrderValue,
    maxDiscount,
    usageLimit,
    expiresAt,
  } = req.body;

  const normalized = normalizePromoCode(code);
  if (!normalized) {
    return res.status(400).json({ error: 'Promo code is required' });
  }
  if (!['flat', 'percent'].includes(discountType)) {
    return res.status(400).json({ error: 'Discount type must be flat or percent' });
  }
  if (!discountValue || discountValue <= 0) {
    return res.status(400).json({ error: 'Discount value must be greater than 0' });
  }
  if (discountType === 'percent' && discountValue > 100) {
    return res.status(400).json({ error: 'Percent discount cannot exceed 100' });
  }

  const existing = queryOne('SELECT id FROM promo_codes WHERE code = ?', [normalized]);
  if (existing) {
    return res.status(409).json({ error: 'Promo code already exists' });
  }

  const id = randomUUID();
  run(
    `INSERT INTO promo_codes (id, code, description, discount_type, discount_value, min_order_value, max_discount, usage_limit, expires_at, active, used_count)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0)`,
    [
      id,
      normalized,
      description?.trim() ?? '',
      discountType,
      discountValue,
      minOrderValue ?? 0,
      maxDiscount ?? null,
      usageLimit ?? null,
      expiresAt ?? null,
    ]
  );

  const created = queryOne('SELECT * FROM promo_codes WHERE id = ?', [id]);
  await publishSyncEvent({ domain: 'settings', action: 'updated', entity: 'promo_code', id });
  res.status(201).json({ promoCode: formatPromoCode(created) });
});

router.put('/:id', authRequired, adminRequired, async (req, res) => {
  const existing = queryOne('SELECT * FROM promo_codes WHERE id = ?', [req.params.id]);
  if (!existing) {
    return res.status(404).json({ error: 'Promo code not found' });
  }

  const {
    description,
    discountType,
    discountValue,
    minOrderValue,
    maxDiscount,
    usageLimit,
    expiresAt,
    active,
  } = req.body;

  const type =
    discountType === 'percent' ? 'percent' : discountType === 'flat' ? 'flat' : existing.discount_type;
  const value =
    discountValue != null && discountValue > 0 ? discountValue : existing.discount_value;

  run(
    `UPDATE promo_codes
     SET description = ?, discount_type = ?, discount_value = ?, min_order_value = ?, max_discount = ?, usage_limit = ?, expires_at = ?, active = ?
     WHERE id = ?`,
    [
      description?.trim() ?? existing.description,
      type,
      value,
      minOrderValue ?? existing.min_order_value,
      maxDiscount ?? existing.max_discount,
      usageLimit ?? existing.usage_limit,
      expiresAt ?? existing.expires_at,
      active === false ? 0 : active === true ? 1 : existing.active,
      req.params.id,
    ]
  );

  const updated = queryOne('SELECT * FROM promo_codes WHERE id = ?', [req.params.id]);
  await publishSyncEvent({ domain: 'settings', action: 'updated', entity: 'promo_code', id: req.params.id });
  res.json({ promoCode: formatPromoCode(updated) });
});

router.delete('/:id', authRequired, adminRequired, async (req, res) => {
  const existing = queryOne('SELECT id FROM promo_codes WHERE id = ?', [req.params.id]);
  if (!existing) {
    return res.status(404).json({ error: 'Promo code not found' });
  }
  run('UPDATE promo_codes SET active = 0 WHERE id = ?', [req.params.id]);
  await publishSyncEvent({ domain: 'settings', action: 'updated', entity: 'promo_code', id: req.params.id });
  res.json({ success: true });
});

export default router;
