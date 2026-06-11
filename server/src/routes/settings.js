import { Router } from 'express';

import { queryOne, run } from '../db.js';
import { adminRequired, authRequired } from '../middleware/auth.js';

const router = Router();

function formatSettings(row) {
  return {
    deliveryCutoff: row.delivery_cutoff,
    deliverySlot: row.delivery_slot,
    minOrderValue: row.min_order_value ?? 299,
    deliveryFee: row.delivery_fee ?? 30,
    walletEnabled: row.wallet_enabled === 1,
    subscriptionEnabled: row.subscription_enabled === 1,
  };
}

router.get('/', (_req, res) => {
  const settings = queryOne('SELECT * FROM app_settings WHERE id = 1');
  if (!settings) {
    return res.status(404).json({ error: 'Settings not found' });
  }
  res.json({ settings: formatSettings(settings) });
});

router.put('/', authRequired, adminRequired, (req, res) => {
  const s = req.body;
  run(
    `UPDATE app_settings SET delivery_cutoff=?, delivery_slot=?, min_order_value=?, delivery_fee=?, wallet_enabled=?, subscription_enabled=?
     WHERE id=1`,
    [
      s.deliveryCutoff,
      s.deliverySlot,
      s.minOrderValue,
      s.deliveryFee,
      s.walletEnabled ? 1 : 0,
      s.subscriptionEnabled ? 1 : 0,
    ]
  );
  const settings = queryOne('SELECT * FROM app_settings WHERE id = 1');
  res.json({ settings: formatSettings(settings) });
});

export default router;
