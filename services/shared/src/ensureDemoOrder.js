import { v4 as uuid } from 'uuid';

import { queryAll, queryOne, run } from './db.js';

const DEMO_ORDER_ID = 'MB-10482';

const DEMO_LINE_ITEMS = [
  ['p1', 2, 28],
  ['p3', 1, 45],
  ['p5', 1, 72],
  ['p6', 1, 48],
  ['p8', 2, 32],
];

/** Restore sample order when DB has users/catalog but no orders (common after migrations). */
export function ensureDemoOrder() {
  const customer = queryOne(
    `SELECT id FROM users WHERE email = ? AND role = 'customer' LIMIT 1`,
    ['amar@example.com']
  );
  if (!customer) return;

  const existing = queryOne('SELECT id FROM orders WHERE id = ?', [DEMO_ORDER_ID]);
  if (!existing) {
    run(
      `INSERT INTO orders (id, user_id, date, status, total, delivery_slot, items_count, payment_status, payment_method)
       VALUES (?, ?, ?, 'scheduled', ?, ?, ?, 'paid', 'cod')`,
      [DEMO_ORDER_ID, customer.id, '7 Jun 2026', 312, 'Tomorrow, 6:00 AM', 5]
    );
  }

  const itemCount = queryOne('SELECT COUNT(*) as count FROM order_items WHERE order_id = ?', [
    DEMO_ORDER_ID,
  ]).count;

  if (itemCount === 0) {
    DEMO_LINE_ITEMS.forEach(([productId, quantity, price]) => {
      run(
        'INSERT INTO order_items (id, order_id, product_id, quantity, price) VALUES (?, ?, ?, ?, ?)',
        [uuid(), DEMO_ORDER_ID, productId, quantity, price]
      );
    });
  }
}
