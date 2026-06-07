import { Router } from 'express';

import { queryOne, run } from '../../../shared/src/db.js';
import { adminRequired, authRequired } from '../../../shared/src/middleware/auth.js';
import { publishSyncEvent } from '../../../shared/src/sync/publish.js';

const router = Router();

function formatSettings(row) {
  return {
    deliveryCutoff: row.delivery_cutoff,
    deliverySlot: row.delivery_slot,
    minOrderValue: row.min_order_value,
    deliveryFee: row.delivery_fee,
  };
}

router.get('/', (_req, res) => {
  const settings = queryOne('SELECT * FROM app_settings WHERE id = 1');
  if (!settings) {
    return res.status(404).json({ error: 'Settings not found' });
  }
  res.json({ settings: formatSettings(settings) });
});

router.put('/', authRequired, adminRequired, async (req, res) => {
  const s = req.body;
  run(
    `UPDATE app_settings SET delivery_cutoff=?, delivery_slot=?, min_order_value=?, delivery_fee=?
     WHERE id=1`,
    [s.deliveryCutoff, s.deliverySlot, s.minOrderValue, s.deliveryFee]
  );
  const settings = queryOne('SELECT * FROM app_settings WHERE id = 1');
  await publishSyncEvent({ domain: 'settings', action: 'updated', entity: 'settings' });
  res.json({ settings: formatSettings(settings) });
});

export default router;
