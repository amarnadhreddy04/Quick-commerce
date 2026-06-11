import { Router } from 'express';
import { v4 as uuid } from 'uuid';

import { queryAll, queryOne, run, transaction } from '../../../shared/src/db.js';
import {
  adminRequired,
  authRequired,
  locationAdminOrSuper,
  panelRequired,
  riderRequired,
} from '../../../shared/src/middleware/auth.js';
import {
  buildOrderListFilter,
  canAccessOrder,
  getCustomerPincodeForUser,
  isPanelRole,
  isRider,
  isWholesaler,
} from '../../../shared/src/panelAccess.js';
import {
  assignRiderToOrder,
  completeRiderDelivery,
  getRiderDeliveryAddress,
  tryAutoAssignRider,
} from '../../../shared/src/riderDelivery.js';
import {
  decrementStockForItems,
  publishStockSyncForItems,
  validateOrderStock,
} from '../../../shared/src/productStock.js';
import { publishSyncEvent } from '../../../shared/src/sync/publish.js';
import { storeTypeLabel } from '../../../shared/src/storeTypes.js';
import {
  assignOrderToWholesaler,
  getVendorLineItems,
  getVendorTasksForOrder,
} from '../../../shared/src/wholesalerAssignment.js';

const router = Router();

function riderFields(row) {
  if (!row.rider_id) {
    return {
      riderId: null,
      riderName: null,
      riderPhone: null,
      riderStatus: row.rider_status ?? null,
      riderAssignedAt: row.rider_assigned_at ?? null,
      riderDeliveredAt: row.rider_delivered_at ?? null,
    };
  }

  const rider = queryOne('SELECT name, phone FROM riders WHERE id = ?', [row.rider_id]);
  return {
    riderId: row.rider_id,
    riderName: rider?.name ?? null,
    riderPhone: rider?.phone ?? null,
    riderStatus: row.rider_status ?? null,
    riderAssignedAt: row.rider_assigned_at ?? null,
    riderDeliveredAt: row.rider_delivered_at ?? null,
  };
}

function wholesalerFields(row) {
  if (!row.wholesaler_id) {
    return {
      wholesalerId: null,
      wholesalerName: null,
      wholesalerShopName: null,
      wholesalerStatus: null,
      wholesaleCost: row.wholesale_cost ?? null,
    };
  }

  const wholesaler = queryOne('SELECT name, shop_name FROM wholesalers WHERE id = ?', [
    row.wholesaler_id,
  ]);

  return {
    wholesalerId: row.wholesaler_id,
    wholesalerName: wholesaler?.name ?? null,
    wholesalerShopName: wholesaler?.shop_name ?? null,
    wholesalerStatus: row.wholesaler_status ?? null,
    wholesaleCost: row.wholesale_cost ?? null,
  };
}

function formatOrder(row, viewerRole = 'admin') {
  const user = queryOne('SELECT name FROM users WHERE id = ?', [row.user_id]);
  const base = {
    id: row.id,
    customerId: row.user_id,
    customerName: user?.name ?? 'Unknown',
    date: row.date,
    status: row.status,
    items: row.items_count,
    total: row.total,
    deliveryFee: row.delivery_fee ?? null,
    platformFee: row.platform_fee ?? null,
    promoCode: row.promo_code ?? null,
    promoDiscount: row.promo_discount ?? null,
    deliverySlot: row.delivery_slot,
    paymentStatus: row.payment_status ?? 'pending',
    paymentMethod: row.payment_method ?? null,
    ...wholesalerFields(row),
    ...riderFields(row),
  };

  if (isRider(viewerRole)) {
    return {
      id: base.id,
      date: base.date,
      status: base.status,
      items: base.items,
      total: base.total,
      deliverySlot: base.deliverySlot,
      riderStatus: base.riderStatus,
      customerName: base.customerName,
    };
  }

  if (isWholesaler(viewerRole)) {
    return {
      id: base.id,
      date: base.date,
      status: base.status,
      items: base.items,
      deliverySlot: base.deliverySlot,
      wholesalerStatus: base.wholesalerStatus,
      wholesaleCost: base.wholesaleCost,
      customerName: base.customerName,
    };
  }

  return base;
}

function formatOrderDetail(row, viewerRole = 'admin', wholesalerId = null) {
  const user = queryOne(
    'SELECT name, email, phone, location, pincode FROM users WHERE id = ?',
    [row.user_id]
  );
  const customerPincode = getCustomerPincodeForUser(row.user_id);
  const lineRows = wholesalerId
    ? getVendorLineItems(row.id, wholesalerId)
    : queryAll(
        `SELECT oi.product_id, oi.quantity, oi.price, oi.wholesale_price, oi.wholesaler_id,
                p.name as product_name, p.brand, p.unit, p.image, p.images, p.store_type,
                w.shop_name as vendor_shop_name
         FROM order_items oi
         LEFT JOIN products p ON p.id = oi.product_id
         LEFT JOIN wholesalers w ON w.id = oi.wholesaler_id
         WHERE oi.order_id = ?
         ORDER BY oi.product_id`,
        [row.id]
      );

  const lineItems = lineRows.map((item) => {
    const wholesaleLineTotal = (item.wholesale_price ?? 0) * item.quantity;
    if (isWholesaler(viewerRole)) {
      return {
        productId: item.product_id,
        productName: item.product_name ?? item.product_id,
        brand: item.brand ?? '',
        unit: item.unit ?? '',
        image: resolveLineItemImage(item),
        quantity: item.quantity,
        wholesalePrice: item.wholesale_price ?? null,
        lineTotal: wholesaleLineTotal,
      };
    }

    return {
      productId: item.product_id,
      productName: item.product_name ?? item.product_id,
      brand: item.brand ?? '',
      unit: item.unit ?? '',
      image: resolveLineItemImage(item),
      quantity: item.quantity,
      price: item.price,
      wholesalePrice: item.wholesale_price ?? null,
      lineTotal: item.price * item.quantity,
      storeType: item.store_type ?? null,
      storeLabel: storeTypeLabel(item.store_type ?? 'general'),
      vendorShopName: item.vendor_shop_name ?? null,
    };
  });

  const base = formatOrder(row, viewerRole);

  if (isRider(viewerRole)) {
    const address = getRiderDeliveryAddress(row.user_id);
    const user = queryOne('SELECT name, phone FROM users WHERE id = ?', [row.user_id]);
    return {
      ...base,
      customerName: user?.name ?? base.customerName,
      customerPhone: user?.phone ?? null,
      customerPincode: address.pincode ?? getCustomerPincodeForUser(row.user_id),
      deliveryAddress: address,
      lineItems,
    };
  }

  if (isWholesaler(viewerRole)) {
    const tasks = wholesalerId ? getVendorTasksForOrder(row.id, wholesalerId) : [];
    const task = tasks[0] ?? null;
    const vendor = wholesalerId
      ? queryOne('SELECT shop_name, store_type FROM wholesalers WHERE id = ?', [wholesalerId])
      : null;

    return {
      ...base,
      vendorTaskId: task?.id ?? null,
      items: task?.item_count ?? base.items,
      wholesalerStatus: task?.status ?? base.wholesalerStatus,
      wholesaleCost: task?.wholesale_cost ?? base.wholesaleCost,
      storeType: vendor?.store_type ?? null,
      storeLabel: storeTypeLabel(vendor?.store_type ?? 'general'),
      customerLocation: user?.location ?? null,
      customerPincode,
      lineItems,
    };
  }

  const vendorTasks = getVendorTasksForOrder(row.id).map((task) => {
    const vendor = queryOne('SELECT shop_name, store_type FROM wholesalers WHERE id = ?', [
      task.wholesaler_id,
    ]);
    return {
      id: task.id,
      wholesalerId: task.wholesaler_id,
      shopName: vendor?.shop_name ?? null,
      storeType: vendor?.store_type ?? null,
      storeLabel: storeTypeLabel(vendor?.store_type ?? 'general'),
      status: task.status,
      wholesaleCost: task.wholesale_cost,
      itemCount: task.item_count,
    };
  });

  return {
    ...base,
    customerEmail: user?.email ?? null,
    customerPhone: user?.phone ?? null,
    customerLocation: user?.location ?? null,
    customerPincode,
    lineItems,
    vendorTasks,
  };
}

function formatRiderQueueEntry(order) {
  const user = queryOne('SELECT name, phone FROM users WHERE id = ?', [order.user_id]);
  const address = getRiderDeliveryAddress(order.user_id);
  return {
    id: order.id,
    customerName: user?.name ?? 'Unknown',
    customerPhone: user?.phone ?? null,
    date: order.date,
    status: order.status,
    items: order.items_count,
    total: order.total,
    deliverySlot: order.delivery_slot,
    riderStatus: order.rider_status,
    deliveryAddress: address,
    customerPincode: address.pincode ?? getCustomerPincodeForUser(order.user_id),
  };
}

function formatVendorQueueEntry(task, order) {
  const vendor = queryOne('SELECT shop_name, store_type FROM wholesalers WHERE id = ?', [
    task.wholesaler_id,
  ]);
  const user = queryOne('SELECT name FROM users WHERE id = ?', [order.user_id]);
  return {
    vendorTaskId: task.id,
    id: order.id,
    customerName: user?.name ?? 'Unknown',
    date: order.date,
    status: order.status,
    items: task.item_count,
    deliverySlot: order.delivery_slot,
    wholesalerId: task.wholesaler_id,
    wholesalerShopName: vendor?.shop_name ?? null,
    storeType: vendor?.store_type ?? null,
    storeLabel: storeTypeLabel(vendor?.store_type ?? 'general'),
    wholesalerStatus: task.status,
    wholesaleCost: task.wholesale_cost,
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

function assertOrderAccess(req, order) {
  const customerPincode = getCustomerPincodeForUser(order.user_id);
  if (!canAccessOrder(req.user, order, customerPincode)) {
    return false;
  }
  return true;
}

router.get('/', authRequired, (req, res) => {
  const orderId = typeof req.query.id === 'string' ? req.query.id.trim() : '';

  if (orderId) {
    const order = queryOne('SELECT * FROM orders WHERE id = ?', [orderId]);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (!assertOrderAccess(req, order)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const wholesalerId = isWholesaler(req.user.role) ? req.user.wholesalerId : null;
    return res.json({
      order: formatOrderDetail(order, req.user.role, wholesalerId),
    });
  }

  if (isPanelRole(req.user.role)) {
    const filter = buildOrderListFilter(req.user);
    const rows = queryAll(
      `SELECT o.* FROM ${filter.from} ${filter.sql} ORDER BY datetime(COALESCE(o.created_at, o.date)) DESC`,
      filter.params
    );
    return res.json({ orders: rows.map((row) => formatOrder(row, req.user.role)) });
  }

  const rows = queryAll('SELECT * FROM orders WHERE user_id = ? ORDER BY date DESC', [req.user.id]);
  res.json({ orders: rows.map((row) => formatOrder(row, req.user.role)) });
});

router.post('/', authRequired, async (req, res) => {
  const { items, deliverySlot, total } = req.body;
  if (!items?.length) {
    return res.status(400).json({ error: 'Order items are required' });
  }

  const stockCheck = validateOrderStock(items);
  if (!stockCheck.ok) {
    return res.status(400).json({ error: stockCheck.error });
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
    decrementStockForItems(items);
  });

  await assignOrderToWholesaler(orderId, req.user.id);
  const order = queryOne('SELECT * FROM orders WHERE id = ?', [orderId]);
  await Promise.all([
    publishSyncEvent({ domain: 'orders', action: 'created', entity: 'order', id: orderId }),
    publishStockSyncForItems(items),
  ]);
  res.status(201).json({ order: formatOrder(order, req.user.role) });
});

router.get('/rider-queue', authRequired, riderRequired, (req, res) => {
  const status = typeof req.query.status === 'string' ? req.query.status : '';
  let sql = `
    SELECT o.*
    FROM orders o
    WHERE o.rider_id = ?
      AND o.status NOT IN ('cancelled')
  `;
  const params = [req.user.riderId];

  if (status) {
    sql += ' AND o.rider_status = ?';
    params.push(status);
  } else {
    sql += " AND o.rider_status IN ('assigned', 'out_for_delivery')";
  }

  sql += ' ORDER BY datetime(COALESCE(o.rider_assigned_at, o.created_at, o.date)) DESC';
  const rows = queryAll(sql, params);
  res.json({ orders: rows.map(formatRiderQueueEntry) });
});

router.get('/rider-history', authRequired, riderRequired, (req, res) => {
  const rows = queryAll(
    `SELECT o.*
     FROM orders o
     WHERE o.rider_id = ? AND o.rider_status = 'delivered'
     ORDER BY datetime(COALESCE(o.rider_delivered_at, o.created_at, o.date)) DESC
     LIMIT 50`,
    [req.user.riderId]
  );
  res.json({ orders: rows.map(formatRiderQueueEntry) });
});

router.get('/wholesaler-queue', authRequired, panelRequired, (req, res) => {
  const status = typeof req.query.status === 'string' ? req.query.status : '';
  const wholesalerId =
    typeof req.query.wholesalerId === 'string' ? req.query.wholesalerId.trim() : '';
  let sql = `
    SELECT t.*, o.user_id, o.date, o.status as order_status, o.delivery_slot, o.created_at as order_created_at
    FROM order_vendor_tasks t
    JOIN orders o ON o.id = t.order_id
    WHERE 1 = 1
  `;
  const params = [];

  if (req.user.role === 'wholesaler' && req.user.wholesalerId) {
    sql += ' AND t.wholesaler_id = ?';
    params.push(req.user.wholesalerId);
  } else if (req.user.role === 'location_admin') {
    const filter = buildOrderListFilter(req.user);
    sql += ` AND o.id IN (SELECT o2.id FROM orders o2 ${filter.sql.replace(/^WHERE\s+/, 'WHERE ')})`;
    params.push(...filter.params);
  }

  if (wholesalerId && req.user.role !== 'wholesaler') {
    sql += ' AND t.wholesaler_id = ?';
    params.push(wholesalerId);
  }

  if (status) {
    sql += ' AND t.status = ?';
    params.push(status);
  } else {
    sql += " AND t.status IN ('assigned', 'packed')";
  }

  sql += ' ORDER BY datetime(COALESCE(t.created_at, o.created_at, o.date)) DESC';
  const rows = queryAll(sql, params);
  res.json({
    orders: rows.map((row) =>
      formatVendorQueueEntry(row, {
        id: row.order_id,
        user_id: row.user_id,
        date: row.date,
        status: row.order_status,
        delivery_slot: row.delivery_slot,
      })
    ),
  });
});

router.patch('/:id/wholesaler-status', authRequired, panelRequired, async (req, res) => {
  const { status, vendorTaskId } = req.body;
  const allowed = ['assigned', 'packed', 'ready'];
  if (!allowed.includes(status)) {
    return res.status(400).json({ error: 'Invalid wholesaler status' });
  }

  const order = queryOne('SELECT * FROM orders WHERE id = ?', [req.params.id]);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  if (!assertOrderAccess(req, order)) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  let taskSql = 'SELECT * FROM order_vendor_tasks WHERE order_id = ?';
  const taskParams = [req.params.id];
  if (vendorTaskId) {
    taskSql += ' AND id = ?';
    taskParams.push(vendorTaskId);
  } else if (req.user.role === 'wholesaler' && req.user.wholesalerId) {
    taskSql += ' AND wholesaler_id = ?';
    taskParams.push(req.user.wholesalerId);
  }

  const tasks = queryAll(taskSql, taskParams);
  if (tasks.length === 0) {
    return res.status(404).json({ error: 'Vendor task not found' });
  }

  tasks.forEach((task) => {
    run('UPDATE order_vendor_tasks SET status = ? WHERE id = ?', [status, task.id]);
  });

  const remaining = queryAll(
    `SELECT status FROM order_vendor_tasks WHERE order_id = ? AND status NOT IN ('packed', 'ready')`,
    [req.params.id]
  );
  const aggregateStatus =
    remaining.length === 0 ? status : remaining.some((row) => row.status === 'assigned') ? 'assigned' : 'packed';
  run('UPDATE orders SET wholesaler_status = ? WHERE id = ?', [aggregateStatus, req.params.id]);

  if (status === 'ready') {
    tryAutoAssignRider(req.params.id, order.user_id);
  }

  const updated = queryOne('SELECT * FROM orders WHERE id = ?', [req.params.id]);
  await publishSyncEvent({ domain: 'orders', action: 'updated', entity: 'order', id: req.params.id });
  res.json({ order: formatOrder(updated, req.user.role) });
});

router.patch('/:id/rider-status', authRequired, riderRequired, async (req, res) => {
  const { status } = req.body;
  const allowed = ['out_for_delivery', 'delivered'];
  if (!allowed.includes(status)) {
    return res.status(400).json({ error: 'Invalid rider status' });
  }

  const order = queryOne('SELECT * FROM orders WHERE id = ? AND rider_id = ?', [
    req.params.id,
    req.user.riderId,
  ]);
  if (!order) return res.status(404).json({ error: 'Delivery not found' });

  if (status === 'delivered') {
    completeRiderDelivery(req.params.id, req.user.riderId);
  } else {
    run('UPDATE orders SET rider_status = ? WHERE id = ?', [status, req.params.id]);
  }

  const updated = queryOne('SELECT * FROM orders WHERE id = ?', [req.params.id]);
  await publishSyncEvent({ domain: 'orders', action: 'updated', entity: 'order', id: req.params.id });
  res.json({ order: formatOrderDetail(updated, req.user.role) });
});

router.patch('/:id/assign-rider', authRequired, locationAdminOrSuper, async (req, res) => {
  const { riderId } = req.body;
  if (!riderId) return res.status(400).json({ error: 'riderId is required' });

  const order = queryOne('SELECT * FROM orders WHERE id = ?', [req.params.id]);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  if (!assertOrderAccess(req, order)) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const rider = assignRiderToOrder(req.params.id, riderId);
  if (!rider) return res.status(404).json({ error: 'Rider not found or inactive' });

  const updated = queryOne('SELECT * FROM orders WHERE id = ?', [req.params.id]);
  await publishSyncEvent({ domain: 'orders', action: 'updated', entity: 'order', id: req.params.id });
  res.json({ order: formatOrder(updated, req.user.role) });
});

router.get('/:id', authRequired, (req, res) => {
  const order = queryOne('SELECT * FROM orders WHERE id = ?', [req.params.id]);
  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }

  if (!assertOrderAccess(req, order)) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const wholesalerId = isWholesaler(req.user.role) ? req.user.wholesalerId : null;
  res.json({
    order: formatOrderDetail(order, req.user.role, wholesalerId),
  });
});

router.patch('/:id/status', authRequired, locationAdminOrSuper, async (req, res) => {
  const { status } = req.body;
  const order = queryOne('SELECT * FROM orders WHERE id = ?', [req.params.id]);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  if (!assertOrderAccess(req, order)) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  run('UPDATE orders SET status = ? WHERE id = ?', [status, req.params.id]);
  const updated = queryOne('SELECT * FROM orders WHERE id = ?', [req.params.id]);
  await publishSyncEvent({ domain: 'orders', action: 'updated', entity: 'order', id: req.params.id });
  res.json({ order: formatOrder(updated, req.user.role) });
});

export default router;
