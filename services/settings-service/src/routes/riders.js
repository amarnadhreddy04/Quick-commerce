import { Router } from 'express';
import { randomUUID } from 'crypto';
import bcrypt from 'bcryptjs';

import { queryAll, queryOne, run } from '../../../shared/src/db.js';
import { adminRequired, authRequired, locationAdminOrSuper } from '../../../shared/src/middleware/auth.js';
import { buildRiderScope, isRider, isSuperAdmin } from '../../../shared/src/panelAccess.js';
import { formatRider } from '../../../shared/src/riderDelivery.js';
import { publishSyncEvent } from '../../../shared/src/sync/publish.js';

const router = Router();

function attachStats(rider) {
  const stats = queryOne(
    `SELECT COUNT(*) as delivered_count
     FROM orders
     WHERE rider_id = ? AND rider_status = 'delivered'`,
    [rider.id]
  );
  return {
    ...formatRider(rider),
    deliveredOrders: stats?.delivered_count ?? rider.deliveries_count ?? 0,
  };
}

router.get('/', authRequired, locationAdminOrSuper, (req, res) => {
  const scope = buildRiderScope(req.user);
  let rows;
  if (scope.pincode) {
    rows = queryAll('SELECT * FROM riders WHERE pincode = ? ORDER BY name', [scope.pincode]);
  } else if (isSuperAdmin(req.user.role)) {
    rows = queryAll('SELECT * FROM riders ORDER BY pincode, name');
  } else {
    rows = [];
  }
  res.json({ riders: rows.map(attachStats) });
});

router.get('/stats/summary', authRequired, locationAdminOrSuper, (req, res) => {
  const scope = buildRiderScope(req.user);
  let riders = queryAll('SELECT * FROM riders WHERE active = 1 ORDER BY name');
  if (scope.pincode) {
    riders = riders.filter((row) => row.pincode === scope.pincode);
  } else if (!isSuperAdmin(req.user.role)) {
    riders = [];
  }

  const summary = riders.map((rider) => {
    const stats = queryOne(
      `SELECT
         COUNT(*) as total_assigned,
         SUM(CASE WHEN rider_status = 'delivered' THEN 1 ELSE 0 END) as delivered,
         SUM(CASE WHEN rider_status IN ('assigned', 'out_for_delivery') THEN 1 ELSE 0 END) as active
       FROM orders
       WHERE rider_id = ?`,
      [rider.id]
    );
    return {
      ...formatRider(rider),
      totalAssigned: stats?.total_assigned ?? 0,
      delivered: stats?.delivered ?? rider.deliveries_count ?? 0,
      activeDeliveries: stats?.active ?? 0,
    };
  });

  res.json({ summary });
});

router.get('/me', authRequired, (req, res) => {
  if (!isRider(req.user.role) || !req.user.riderId) {
    return res.status(403).json({ error: 'Rider access required' });
  }
  const rider = queryOne('SELECT * FROM riders WHERE id = ?', [req.user.riderId]);
  if (!rider) return res.status(404).json({ error: 'Rider profile not found' });
  res.json({ rider: attachStats(rider) });
});

router.post('/', authRequired, adminRequired, async (req, res) => {
  const { name, phone, email, vehicleType, pincode, password } = req.body;
  if (!name?.trim() || !phone?.trim() || !pincode) {
    return res.status(400).json({ error: 'Name, phone, and pincode are required' });
  }
  const digits = String(pincode).replace(/\D/g, '');
  if (digits.length !== 6) {
    return res.status(400).json({ error: 'Enter a valid 6-digit pincode' });
  }

  const id = randomUUID();
  run(
    `INSERT INTO riders (id, name, phone, email, vehicle_type, pincode, active, deliveries_count)
     VALUES (?, ?, ?, ?, ?, ?, 1, 0)`,
    [
      id,
      name.trim(),
      phone.trim(),
      email?.trim() ?? null,
      vehicleType?.trim() || 'bike',
      digits,
    ]
  );

  if (email?.trim() && password?.length >= 6) {
    const userId = randomUUID();
    run(
      `INSERT INTO users (id, name, email, phone, password_hash, role, rider_id, active)
       VALUES (?, ?, ?, ?, ?, 'rider', ?, 1)`,
      [userId, name.trim(), email.trim().toLowerCase(), phone.trim(), bcrypt.hashSync(password, 10), id]
    );
  }

  const created = queryOne('SELECT * FROM riders WHERE id = ?', [id]);
  await publishSyncEvent({ domain: 'users', action: 'created', entity: 'rider', id });
  res.status(201).json({ rider: attachStats(created) });
});

router.put('/:id', authRequired, adminRequired, async (req, res) => {
  const existing = queryOne('SELECT * FROM riders WHERE id = ?', [req.params.id]);
  if (!existing) return res.status(404).json({ error: 'Rider not found' });

  const { name, phone, email, vehicleType, pincode, active } = req.body;
  const digits = pincode ? String(pincode).replace(/\D/g, '') : existing.pincode;

  run(
    `UPDATE riders
     SET name = ?, phone = ?, email = ?, vehicle_type = ?, pincode = ?, active = ?
     WHERE id = ?`,
    [
      name?.trim() ?? existing.name,
      phone?.trim() ?? existing.phone,
      email?.trim() ?? existing.email,
      vehicleType?.trim() || existing.vehicle_type,
      digits,
      active === false ? 0 : 1,
      req.params.id,
    ]
  );

  const updated = queryOne('SELECT * FROM riders WHERE id = ?', [req.params.id]);
  await publishSyncEvent({ domain: 'users', action: 'updated', entity: 'rider', id: req.params.id });
  res.json({ rider: attachStats(updated) });
});

router.delete('/:id', authRequired, adminRequired, async (req, res) => {
  const existing = queryOne('SELECT id FROM riders WHERE id = ?', [req.params.id]);
  if (!existing) return res.status(404).json({ error: 'Rider not found' });
  run('UPDATE riders SET active = 0 WHERE id = ?', [req.params.id]);
  await publishSyncEvent({ domain: 'users', action: 'updated', entity: 'rider', id: req.params.id });
  res.json({ success: true });
});

export default router;
