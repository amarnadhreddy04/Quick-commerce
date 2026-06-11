import { randomUUID } from 'crypto';
import { v4 as uuid } from 'uuid';

export const DEMO_ORDER_ID = 'MB-10482';

/** productId, quantity, price at time of order */
export const DEMO_ORDER_LINE_ITEMS = [
  ['p51', 2, 28],
  ['p26', 1, 45],
  ['p50', 1, 72],
  ['p53', 1, 48],
  ['p52', 2, 32],
];

export function repairDemoOrderLineItems({ queryOne, queryAll, run, getDb }) {
  const order = queryOne('SELECT id FROM orders WHERE id = ?', [DEMO_ORDER_ID]);
  if (!order) return false;

  const stale = queryOne(
    `SELECT 1 as ok
     FROM order_items oi
     LEFT JOIN products p ON p.id = oi.product_id
     WHERE oi.order_id = ? AND p.id IS NULL
     LIMIT 1`,
    [DEMO_ORDER_ID]
  );

  if (!stale) return false;

  getDb().run('DELETE FROM order_items WHERE order_id = ?', [DEMO_ORDER_ID]);
  DEMO_ORDER_LINE_ITEMS.forEach(([productId, quantity, price]) => {
    run(
      'INSERT INTO order_items (id, order_id, product_id, quantity, price) VALUES (?, ?, ?, ?, ?)',
      [randomUUID(), DEMO_ORDER_ID, productId, quantity, price]
    );
  });

  return true;
}

export function insertDemoOrderLineItems(run, orderId = DEMO_ORDER_ID) {
  DEMO_ORDER_LINE_ITEMS.forEach(([productId, quantity, price]) => {
    run(
      'INSERT INTO order_items (id, order_id, product_id, quantity, price) VALUES (?, ?, ?, ?, ?)',
      [uuid(), orderId, productId, quantity, price]
    );
  });
}
