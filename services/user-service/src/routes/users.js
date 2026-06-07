import { Router } from 'express';

import { queryAll, queryOne, run } from '../../../shared/src/db.js';
import { adminRequired, authRequired, formatUser } from '../../../shared/src/middleware/auth.js';
import { publishSyncEvent } from '../../../shared/src/sync/publish.js';

const router = Router();

router.get('/', authRequired, adminRequired, (_req, res) => {
  const rows = queryAll(`
    SELECT u.*, COUNT(o.id) as orders_count
    FROM users u
    LEFT JOIN orders o ON o.user_id = u.id
    WHERE u.role = 'customer'
    GROUP BY u.id
    ORDER BY u.name
  `);
  res.json({ customers: rows.map(formatUser) });
});

router.patch('/:id/toggle', authRequired, adminRequired, async (req, res) => {
  const user = queryOne('SELECT * FROM users WHERE id = ?', [req.params.id]);
  if (!user) return res.status(404).json({ error: 'User not found' });

  run('UPDATE users SET active = ? WHERE id = ?', [user.active ? 0 : 1, req.params.id]);
  const updated = queryOne('SELECT * FROM users WHERE id = ?', [req.params.id]);
  await publishSyncEvent({ domain: 'users', action: 'updated', entity: 'customer', id: req.params.id });
  res.json({ customer: formatUser(updated) });
});

export default router;
