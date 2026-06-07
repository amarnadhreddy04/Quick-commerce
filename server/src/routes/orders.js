import { Router } from 'express';
import { v4 as uuid } from 'uuid';

import { queryAll, queryOne, run, transaction } from '../db.js';
import { adminRequired, authRequired } from '../middleware/auth.js';

const router = Router();

function formatOrder(row) {
  const user = queryOne('SELECT name FROM users WHERE id = ?', [row.user_id]);
  return {
    id: row.id,
    customerId: row.user_id,
    customerName: user?.name ?? 'Unknown',
    date: row.date,
    status: row.status,
    items: row.items_count,
    total: row.total,
    deliverySlot: row.delivery_slot,
  };
}

router.get('/', authRequired, (req, res) => {
  const rows =
    req.user.role === 'admin'
      ? queryAll('SELECT * FROM orders ORDER BY date DESC')
      : queryAll('SELECT * FROM orders WHERE user_id = ? ORDER BY date DESC', [req.user.id]);
  res.json({ orders: rows.map(formatOrder) });
});

router.post('/', authRequired, (req, res) => {
  const { items, deliverySlot, total } = req.body;
  if (!items?.length) {
    return res.status(400).json({ error: 'Order items are required' });
  }

  const orderId = `MB-${Math.floor(10000 + Math.random() * 90000)}`;
  const date = new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  transaction(() => {
    run(
      `INSERT INTO orders (id, user_id, date, status, total, delivery_slot, items_count)
       VALUES (?, ?, ?, 'scheduled', ?, ?, ?)`,
      [orderId, req.user.id, date, total, deliverySlot, items.length]
    );
    items.forEach((item) => {
      run(
        'INSERT INTO order_items (id, order_id, product_id, quantity, price) VALUES (?, ?, ?, ?, ?)',
        [uuid(), orderId, item.productId, item.quantity, item.price]
      );
    });
  });

  const order = queryOne('SELECT * FROM orders WHERE id = ?', [orderId]);
  res.status(201).json({ order: formatOrder(order) });
});

router.patch('/:id/status', authRequired, adminRequired, (req, res) => {
  const { status } = req.body;
  const order = queryOne('SELECT * FROM orders WHERE id = ?', [req.params.id]);
  if (!order) return res.status(404).json({ error: 'Order not found' });

  run('UPDATE orders SET status = ? WHERE id = ?', [status, req.params.id]);
  const updated = queryOne('SELECT * FROM orders WHERE id = ?', [req.params.id]);
  res.json({ order: formatOrder(updated) });
});

export default router;
