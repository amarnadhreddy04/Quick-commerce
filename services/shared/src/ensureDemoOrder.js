import {
  DEMO_ORDER_ID,
  DEMO_ORDER_LINE_ITEMS,
  insertDemoOrderLineItems,
  repairDemoOrderLineItems,
} from './demoOrderItems.js';
import { getDb, queryOne, queryAll, run } from './db.js';
import { assignOrderToWholesaler } from './wholesalerAssignment.js';

/** Restore sample order when DB has users/catalog but no orders (common after migrations). */
export async function ensureDemoOrder() {
  const customer = queryOne(
    `SELECT id FROM users WHERE email = ? AND role = 'customer' LIMIT 1`,
    ['amar@example.com']
  );
  if (!customer) return;

  const existing = queryOne('SELECT id FROM orders WHERE id = ?', [DEMO_ORDER_ID]);
  if (!existing) {
    run(
      `INSERT INTO orders (id, user_id, date, status, total, delivery_slot, items_count, payment_status, payment_method)
       VALUES (?, ?, ?, 'scheduled', ?, ?, ?, 'pending', 'cod')`,
      [DEMO_ORDER_ID, customer.id, '7 Jun 2026', 312, 'Tomorrow, 6:00 AM', DEMO_ORDER_LINE_ITEMS.length]
    );
  }

  const itemCount = queryOne('SELECT COUNT(*) as count FROM order_items WHERE order_id = ?', [
    DEMO_ORDER_ID,
  ]).count;

  if (itemCount === 0) {
    insertDemoOrderLineItems(run);
  } else {
    repairDemoOrderLineItems({ queryOne, queryAll, run, getDb });
  }

  await assignOrderToWholesaler(DEMO_ORDER_ID, customer.id);
}
