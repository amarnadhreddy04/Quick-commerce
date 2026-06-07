import { Router } from 'express';

import { queryAll, queryOne, run } from '../db.js';
import { adminRequired, authRequired, formatUser } from '../middleware/auth.js';

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

router.patch('/:id/toggle', authRequired, adminRequired, (req, res) => {
  const user = queryOne('SELECT * FROM users WHERE id = ?', [req.params.id]);
  if (!user) return res.status(404).json({ error: 'User not found' });

  run('UPDATE users SET active = ? WHERE id = ?', [user.active ? 0 : 1, req.params.id]);
  const updated = queryOne('SELECT * FROM users WHERE id = ?', [req.params.id]);
  res.json({ customer: formatUser(updated) });
});

export default router;
