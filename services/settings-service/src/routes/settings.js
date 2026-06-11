import { Router } from 'express';

import { queryOne, run } from '../../../shared/src/db.js';
import { adminRequired, authRequired } from '../../../shared/src/middleware/auth.js';
import { publishSyncEvent } from '../../../shared/src/sync/publish.js';

const router = Router();

function formatSettings(row) {
  return {
    deliveryCutoff: row.delivery_cutoff,
    deliverySlot: row.delivery_slot,
    minOrderValue: row.min_order_value ?? 299,
    deliveryFee: row.delivery_fee ?? 30,
    walletEnabled: row.wallet_enabled === 1,
    subscriptionEnabled: row.subscription_enabled === 1,
    platformFeeEnabled: row.platform_fee_enabled !== 0,
    platformFee: row.platform_fee ?? 5,
    referralEnabled: row.referral_enabled !== 0,
    referralRewardAmount: row.referral_reward_amount ?? 50,
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
    `UPDATE app_settings SET delivery_cutoff=?, delivery_slot=?, min_order_value=?, delivery_fee=?, wallet_enabled=?, subscription_enabled=?, platform_fee_enabled=?, platform_fee=?, referral_enabled=?, referral_reward_amount=?
     WHERE id=1`,
    [
      s.deliveryCutoff,
      s.deliverySlot,
      s.minOrderValue,
      s.deliveryFee,
      s.walletEnabled ? 1 : 0,
      s.subscriptionEnabled ? 1 : 0,
      s.platformFeeEnabled === false ? 0 : 1,
      s.platformFee ?? 5,
      s.referralEnabled === false ? 0 : 1,
      s.referralRewardAmount ?? 50,
    ]
  );
  const settings = queryOne('SELECT * FROM app_settings WHERE id = 1');
  await publishSyncEvent({ domain: 'settings', action: 'updated', entity: 'settings' });
  res.json({ settings: formatSettings(settings) });
});

export default router;
