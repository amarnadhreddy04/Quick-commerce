import { randomUUID } from 'crypto';

import { queryAll, queryOne, run } from './db.js';
import { resolveCustomerPincode } from './wholesalerAssignment.js';

export function formatRider(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    email: row.email ?? null,
    vehicleType: row.vehicle_type ?? 'bike',
    pincode: row.pincode,
    active: row.active === 1,
    deliveriesCount: row.deliveries_count ?? 0,
  };
}

export function isOrderReadyForRider(orderId) {
  const tasks = queryAll('SELECT status FROM order_vendor_tasks WHERE order_id = ?', [orderId]);
  if (tasks.length === 0) return true;
  return tasks.every((task) => task.status === 'ready');
}

export function findRiderForPincode(pincode) {
  if (!pincode) return null;
  return queryOne(
    `SELECT * FROM riders
     WHERE pincode = ? AND active = 1
     ORDER BY deliveries_count ASC, created_at ASC
     LIMIT 1`,
    [pincode]
  );
}

export function assignRiderToOrder(orderId, riderId) {
  const rider = queryOne('SELECT * FROM riders WHERE id = ? AND active = 1', [riderId]);
  if (!rider) return null;

  run(
    `UPDATE orders
     SET rider_id = ?, rider_status = 'assigned', rider_assigned_at = datetime('now')
     WHERE id = ?`,
    [riderId, orderId]
  );

  return rider;
}

export function tryAutoAssignRider(orderId, userId) {
  const order = queryOne('SELECT id, rider_id, status FROM orders WHERE id = ?', [orderId]);
  if (!order || order.rider_id || order.status === 'cancelled' || order.status === 'delivered') {
    return null;
  }
  if (!isOrderReadyForRider(orderId)) return null;

  const pincode = resolveCustomerPincode(userId);
  const rider = findRiderForPincode(pincode);
  if (!rider) return null;

  return assignRiderToOrder(orderId, rider.id);
}

export function completeRiderDelivery(orderId, riderId) {
  const order = queryOne('SELECT * FROM orders WHERE id = ? AND rider_id = ?', [orderId, riderId]);
  if (!order) return false;

  run(
    `UPDATE orders
     SET rider_status = 'delivered',
         rider_delivered_at = datetime('now'),
         status = 'delivered',
         payment_status = CASE WHEN payment_method = 'cod' THEN 'paid' ELSE payment_status END
     WHERE id = ?`,
    [orderId]
  );
  run('UPDATE riders SET deliveries_count = deliveries_count + 1 WHERE id = ?', [riderId]);
  return true;
}

export function getRiderDeliveryAddress(userId) {
  const address = queryOne(
    `SELECT line1, line2, pincode, city, label
     FROM user_addresses
     WHERE user_id = ?
     ORDER BY is_default DESC, created_at ASC
     LIMIT 1`,
    [userId]
  );
  if (address) {
    const parts = [address.line1, address.line2, address.city, address.pincode].filter(Boolean);
    return {
      label: address.label,
      line1: address.line1,
      line2: address.line2 ?? null,
      pincode: address.pincode,
      fullAddress: parts.join(', '),
    };
  }

  const user = queryOne('SELECT location, pincode, phone FROM users WHERE id = ?', [userId]);
  return {
    label: 'Home',
    line1: user?.location ?? '',
    line2: null,
    pincode: user?.pincode ?? null,
    fullAddress: user?.location ?? '',
  };
}

export function ensureDemoRiders() {
  const demoRiders = [
    {
      name: 'Suresh Babu',
      phone: '+91 99887 76655',
      email: 'suresh.rider@example.com',
      vehicleType: 'bike',
      pincode: '523201',
      userEmail: 'suresh.rider@example.com',
    },
    {
      name: 'Kiran Kumar',
      phone: '+91 99887 76656',
      email: 'kiran.rider@example.com',
      vehicleType: 'scooter',
      pincode: '523201',
      userEmail: 'kiran.rider@example.com',
    },
  ];

  demoRiders.forEach((demo) => {
    let row = queryOne('SELECT id FROM riders WHERE email = ?', [demo.email]);
    if (!row) {
      const id = randomUUID();
      run(
        `INSERT INTO riders (id, name, phone, email, vehicle_type, pincode, active, deliveries_count)
         VALUES (?, ?, ?, ?, ?, ?, 1, 0)`,
        [id, demo.name, demo.phone, demo.email, demo.vehicleType, demo.pincode]
      );
      row = { id };
    } else {
      run(
        'UPDATE riders SET name = ?, phone = ?, vehicle_type = ?, pincode = ?, active = 1 WHERE id = ?',
        [demo.name, demo.phone, demo.vehicleType, demo.pincode, row.id]
      );
    }

    if (demo.userEmail) {
      run('UPDATE users SET rider_id = ? WHERE email = ?', [row.id, demo.userEmail]);
    }
  });
}
