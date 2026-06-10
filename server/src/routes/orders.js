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
    paymentStatus: row.payment_status ?? 'pending',
    paymentMethod: row.payment_method ?? null,
  };
}

function formatOrderDetail(row) {
  const user = queryOne(
    'SELECT name, email, phone, location, pincode FROM users WHERE id = ?',
    [row.user_id]
  );
  const lineRows = queryAll(
    `SELECT oi.product_id, oi.quantity, oi.price, p.name as product_name, p.brand, p.unit, p.image, p.images
     FROM order_items oi
     LEFT JOIN products p ON p.id = oi.product_id
     WHERE oi.order_id = ?
     ORDER BY oi.product_id`,
    [row.id]
  );

  return {
    ...formatOrder(row),
    customerEmail: user?.email ?? null,
    customerPhone: user?.phone ?? null,
    customerLocation: user?.location ?? null,
    customerPincode: user?.pincode ?? null,
    lineItems: lineRows.map((item) => ({
      productId: item.product_id,
      productName: item.product_name ?? item.product_id,
      brand: item.brand ?? '',
      unit: item.unit ?? '',
      image: resolveLineItemImage(item),
      quantity: item.quantity,
      price: item.price,
      lineTotal: item.price * item.quantity,
    })),
  };
}

function resolveLineItemImage(item) {
  if (item.image) return item.image;
  try {
    const images = JSON.parse(item.images || '[]');
    if (Array.isArray(images) && images[0]) return images[0];
  } catch {
    // ignore invalid JSON
  }
  return '';
}

router.get('/', authRequired, (req, res) => {
  const orderId = typeof req.query.id === 'string' ? req.query.id.trim() : '';

  if (orderId) {
    const order = queryOne('SELECT * FROM orders WHERE id = ?', [orderId]);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (req.user.role !== 'admin' && order.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    return res.json({ order: formatOrderDetail(order) });
  }

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

router.get('/:id', authRequired, (req, res) => {
  const order = queryOne('SELECT * FROM orders WHERE id = ?', [req.params.id]);
  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }

  if (req.user.role !== 'admin' && order.user_id !== req.user.id) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  res.json({ order: formatOrderDetail(order) });
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
