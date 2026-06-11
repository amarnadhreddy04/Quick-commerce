import { Router } from 'express';
import { randomUUID } from 'crypto';

import { queryAll, queryOne, run } from '../../../shared/src/db.js';
import { adminRequired, authRequired, panelRequired } from '../../../shared/src/middleware/auth.js';
import { buildWholesalerScope, isSuperAdmin, isWholesaler } from '../../../shared/src/panelAccess.js';
import { formatWholesaler } from '../../../shared/src/wholesalerAssignment.js';
import { publishSyncEvent } from '../../../shared/src/sync/publish.js';

const router = Router();

function attachPincodes(wholesaler) {
  const pincodes = queryAll(
    'SELECT pincode, active FROM wholesaler_pincodes WHERE wholesaler_id = ? ORDER BY pincode',
    [wholesaler.id]
  );
  return {
    ...formatWholesaler(wholesaler),
    pincodes: pincodes.map((row) => ({
      pincode: row.pincode,
      active: row.active === 1,
    })),
  };
}

function parsePeriodRange(period, from, to) {
  const now = new Date();
  const end = to ? new Date(`${to}T23:59:59`) : now;
  let start;

  if (from) {
    start = new Date(`${from}T00:00:00`);
  } else if (period === 'month') {
    start = new Date(end.getFullYear(), end.getMonth(), 1);
  } else {
    start = new Date(end);
    start.setDate(start.getDate() - 6);
    start.setHours(0, 0, 0, 0);
  }

  return {
    startIso: start.toISOString().slice(0, 19).replace('T', ' '),
    endIso: end.toISOString().slice(0, 19).replace('T', ' '),
    label: period === 'month' ? 'This month' : 'Last 7 days',
  };
}

router.get('/', authRequired, panelRequired, (req, res) => {
  if (isWholesaler(req.user.role) && req.user.wholesalerId) {
    const row = queryOne('SELECT * FROM wholesalers WHERE id = ?', [req.user.wholesalerId]);
    return res.json({ wholesalers: row ? [attachPincodes(row)] : [] });
  }

  const scope = buildWholesalerScope(req.user);
  let rows;
  if (scope.pincode) {
    rows = queryAll(
      `SELECT w.* FROM wholesalers w
       JOIN wholesaler_pincodes wp ON wp.wholesaler_id = w.id
       WHERE wp.pincode = ? AND wp.active = 1
       ORDER BY w.shop_name`,
      [scope.pincode]
    );
  } else if (isSuperAdmin(req.user.role)) {
    rows = queryAll('SELECT * FROM wholesalers ORDER BY shop_name');
  } else {
    rows = [];
  }

  res.json({ wholesalers: rows.map(attachPincodes) });
});

router.get('/settlements/summary', authRequired, panelRequired, (req, res) => {
  const period = req.query.period === 'month' ? 'month' : 'week';
  const range = parsePeriodRange(period, req.query.from, req.query.to);
  const scope = buildWholesalerScope(req.user);

  let wholesalers = queryAll('SELECT * FROM wholesalers WHERE active = 1 ORDER BY shop_name');
  if (isWholesaler(req.user.role) && scope.wholesalerId) {
    wholesalers = wholesalers.filter((row) => row.id === scope.wholesalerId);
  } else if (scope.pincode) {
    wholesalers = queryAll(
      `SELECT w.* FROM wholesalers w
       JOIN wholesaler_pincodes wp ON wp.wholesaler_id = w.id
       WHERE w.active = 1 AND wp.pincode = ? AND wp.active = 1
       ORDER BY w.shop_name`,
      [scope.pincode]
    );
  } else if (!isSuperAdmin(req.user.role)) {
    wholesalers = [];
  }
  const summary = wholesalers.map((wholesaler) => {
    const stats = queryOne(
      `SELECT COUNT(DISTINCT t.id) as order_count,
              COALESCE(SUM(t.wholesale_cost), 0) as total_payable,
              COALESCE(SUM(t.item_count), 0) as total_items
       FROM order_vendor_tasks t
       JOIN orders o ON o.id = t.order_id
       WHERE t.wholesaler_id = ?
         AND t.status IN ('packed', 'ready')
         AND datetime(COALESCE(t.created_at, o.created_at, o.date)) >= datetime(?)
         AND datetime(COALESCE(t.created_at, o.created_at, o.date)) <= datetime(?)`,
      [wholesaler.id, range.startIso, range.endIso]
    );

    return {
      ...formatWholesaler(wholesaler),
      orderCount: stats?.order_count ?? 0,
      totalItems: stats?.total_items ?? 0,
      totalPayable: Math.round((stats?.total_payable ?? 0) * 100) / 100,
    };
  });

  res.json({ period, range, summary });
});

router.get('/:id/settlement', authRequired, panelRequired, (req, res) => {
  const wholesaler = queryOne('SELECT * FROM wholesalers WHERE id = ?', [req.params.id]);
  if (!wholesaler) {
    return res.status(404).json({ error: 'Wholesaler not found' });
  }

  const scope = buildWholesalerScope(req.user);
  if (isWholesaler(req.user.role) && scope.wholesalerId !== req.params.id) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  if (scope.pincode) {
    const servesPincode = queryOne(
      'SELECT 1 as ok FROM wholesaler_pincodes WHERE wholesaler_id = ? AND pincode = ? AND active = 1',
      [req.params.id, scope.pincode]
    );
    if (!servesPincode) {
      return res.status(403).json({ error: 'Forbidden' });
    }
  }

  const period = req.query.period === 'month' ? 'month' : 'week';
  const range = parsePeriodRange(period, req.query.from, req.query.to);

  const orders = queryAll(
    `SELECT o.id, o.date, o.status, t.status as wholesaler_status, t.wholesale_cost, t.item_count as items_count, o.delivery_slot
     FROM order_vendor_tasks t
     JOIN orders o ON o.id = t.order_id
     WHERE t.wholesaler_id = ?
       AND t.status IN ('packed', 'ready')
       AND datetime(COALESCE(t.created_at, o.created_at, o.date)) >= datetime(?)
       AND datetime(COALESCE(t.created_at, o.created_at, o.date)) <= datetime(?)
     ORDER BY datetime(COALESCE(t.created_at, o.created_at, o.date)) DESC`,
    [wholesaler.id, range.startIso, range.endIso]
  );

  const productBreakdown = queryAll(
    `SELECT oi.product_id,
            COALESCE(p.name, oi.product_id) as product_name,
            COALESCE(p.unit, '') as unit,
            SUM(oi.quantity) as total_quantity,
            COALESCE(oi.wholesale_price, 0) as wholesale_price,
            SUM(oi.quantity * COALESCE(oi.wholesale_price, 0)) as line_total
     FROM order_items oi
     JOIN order_vendor_tasks t ON t.order_id = oi.order_id AND t.wholesaler_id = oi.wholesaler_id
     JOIN orders o ON o.id = oi.order_id
     LEFT JOIN products p ON p.id = oi.product_id
     WHERE oi.wholesaler_id = ?
       AND t.status IN ('packed', 'ready')
       AND datetime(COALESCE(t.created_at, o.created_at, o.date)) >= datetime(?)
       AND datetime(COALESCE(t.created_at, o.created_at, o.date)) <= datetime(?)
     GROUP BY oi.product_id, oi.wholesale_price, p.name, p.unit
     ORDER BY product_name`,
    [wholesaler.id, range.startIso, range.endIso]
  );

  const totals = orders.reduce(
    (acc, order) => {
      acc.orderCount += 1;
      acc.totalItems += order.items_count ?? 0;
      acc.totalPayable += order.wholesale_cost ?? 0;
      return acc;
    },
    { orderCount: 0, totalItems: 0, totalPayable: 0 }
  );

  res.json({
    wholesaler: attachPincodes(wholesaler),
    period,
    range,
    totals: {
      ...totals,
      totalPayable: Math.round(totals.totalPayable * 100) / 100,
    },
    orders: orders.map((order) => ({
      id: order.id,
      date: order.date,
      status: order.status,
      wholesalerStatus: order.wholesaler_status,
      wholesaleCost: order.wholesale_cost,
      items: order.items_count,
      deliverySlot: order.delivery_slot,
    })),
    productBreakdown: productBreakdown.map((row) => ({
      productId: row.product_id,
      productName: row.product_name,
      unit: row.unit,
      totalQuantity: row.total_quantity,
      wholesalePrice: row.wholesale_price,
      lineTotal: Math.round(row.line_total * 100) / 100,
    })),
  });
});

router.post('/', authRequired, adminRequired, async (req, res) => {
  const { name, shopName, phone, email, address, settlementCycle, storeType, pincodes = [] } = req.body;
  if (!name?.trim() || !shopName?.trim() || !phone?.trim()) {
    return res.status(400).json({ error: 'Name, shop name, and phone are required' });
  }

  const id = randomUUID();
  const cycle = settlementCycle === 'monthly' ? 'monthly' : 'weekly';

  run(
    `INSERT INTO wholesalers (id, name, shop_name, phone, email, address, store_type, settlement_cycle, active)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
    [
      id,
      name.trim(),
      shopName.trim(),
      phone.trim(),
      email?.trim() ?? null,
      address?.trim() ?? null,
      storeType ?? 'general',
      cycle,
    ]
  );

  pincodes.forEach((pincode) => {
    const digits = String(pincode).replace(/\D/g, '');
    if (digits.length !== 6) return;
    run(
      'INSERT OR REPLACE INTO wholesaler_pincodes (wholesaler_id, pincode, active) VALUES (?, ?, 1)',
      [id, digits]
    );
  });

  const created = queryOne('SELECT * FROM wholesalers WHERE id = ?', [id]);
  await publishSyncEvent({ domain: 'wholesalers', action: 'created', entity: 'wholesaler', id });
  res.status(201).json({ wholesaler: attachPincodes(created) });
});

router.put('/:id', authRequired, adminRequired, async (req, res) => {
  const existing = queryOne('SELECT * FROM wholesalers WHERE id = ?', [req.params.id]);
  if (!existing) {
    return res.status(404).json({ error: 'Wholesaler not found' });
  }

  const { name, shopName, phone, email, address, settlementCycle, storeType, active, pincodes } = req.body;
  const cycle =
    settlementCycle === 'monthly' ? 'monthly' : settlementCycle === 'weekly' ? 'weekly' : existing.settlement_cycle;

  run(
    `UPDATE wholesalers
     SET name = ?, shop_name = ?, phone = ?, email = ?, address = ?, store_type = ?, settlement_cycle = ?, active = ?
     WHERE id = ?`,
    [
      name?.trim() ?? existing.name,
      shopName?.trim() ?? existing.shop_name,
      phone?.trim() ?? existing.phone,
      email?.trim() ?? existing.email,
      address?.trim() ?? existing.address,
      storeType ?? existing.store_type ?? 'general',
      cycle,
      active === false ? 0 : 1,
      req.params.id,
    ]
  );

  if (Array.isArray(pincodes)) {
    run('DELETE FROM wholesaler_pincodes WHERE wholesaler_id = ?', [req.params.id]);
    pincodes.forEach((pincode) => {
      const digits = String(pincode).replace(/\D/g, '');
      if (digits.length !== 6) return;
      run(
        'INSERT INTO wholesaler_pincodes (wholesaler_id, pincode, active) VALUES (?, ?, 1)',
        [req.params.id, digits]
      );
    });
  }

  const updated = queryOne('SELECT * FROM wholesalers WHERE id = ?', [req.params.id]);
  await publishSyncEvent({ domain: 'wholesalers', action: 'updated', entity: 'wholesaler', id: req.params.id });
  res.json({ wholesaler: attachPincodes(updated) });
});

router.delete('/:id', authRequired, adminRequired, async (req, res) => {
  const existing = queryOne('SELECT id FROM wholesalers WHERE id = ?', [req.params.id]);
  if (!existing) {
    return res.status(404).json({ error: 'Wholesaler not found' });
  }

  run('UPDATE wholesalers SET active = 0 WHERE id = ?', [req.params.id]);
  await publishSyncEvent({ domain: 'wholesalers', action: 'updated', entity: 'wholesaler', id: req.params.id });
  res.json({ success: true });
});

export default router;
