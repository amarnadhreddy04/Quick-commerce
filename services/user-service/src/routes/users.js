import { Router } from 'express';

import { queryAll, queryOne, run } from '../../../shared/src/db.js';
import {
  authRequired,
  adminRequired,
  locationAdminOrSuper,
  formatUser,
} from '../../../shared/src/middleware/auth.js';
import {
  getAdminReferralSummary,
  getReferralStatsForUser,
} from '../../../shared/src/referrals.js';
import { buildCustomerListFilter } from '../../../shared/src/panelAccess.js';
import { publishSyncEvent } from '../../../shared/src/sync/publish.js';

const router = Router();

router.get('/referral', authRequired, (req, res) => {
  if (req.user.role !== 'customer') {
    return res.status(403).json({ error: 'Customer access required' });
  }
  const stats = getReferralStatsForUser(req.user.id);
  if (!stats) {
    return res.status(404).json({ error: 'User not found' });
  }
  res.json({ referral: stats });
});

router.get('/referrals/summary', authRequired, adminRequired, (_req, res) => {
  res.json({ summary: getAdminReferralSummary() });
});

router.get('/', authRequired, locationAdminOrSuper, (req, res) => {
  const filter = buildCustomerListFilter(req.user);
  const rows = queryAll(
    `
    SELECT u.*,
           COUNT(DISTINCT o.id) as orders_count,
           COUNT(DISTINCT refs.id) as referrals_count,
           referrer.name as referred_by_name
    FROM users u
    LEFT JOIN orders o ON o.user_id = u.id
    LEFT JOIN users refs ON refs.referred_by_user_id = u.id
    LEFT JOIN users referrer ON referrer.id = u.referred_by_user_id
    ${filter.sql}
    GROUP BY u.id
    ORDER BY u.name
  `,
    filter.params
  );
  res.json({ customers: rows.map(formatUser) });
});

router.patch('/:id/toggle', authRequired, locationAdminOrSuper, async (req, res) => {
  const user = queryOne('SELECT * FROM users WHERE id = ?', [req.params.id]);
  if (!user) return res.status(404).json({ error: 'User not found' });

  run('UPDATE users SET active = ? WHERE id = ?', [user.active ? 0 : 1, req.params.id]);
  const updated = queryOne('SELECT * FROM users WHERE id = ?', [req.params.id]);
  await publishSyncEvent({ domain: 'users', action: 'updated', entity: 'customer', id: req.params.id });
  res.json({ customer: formatUser(updated) });
});

export default router;
