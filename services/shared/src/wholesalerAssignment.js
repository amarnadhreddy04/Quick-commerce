import { randomUUID } from 'crypto';

import { queryAll, queryOne, run } from './db.js';
import { resolveStoreType } from './storeTypes.js';

const NOTIFICATION_URL = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3017';

export function resolveCustomerPincode(userId) {
  const user = queryOne('SELECT pincode FROM users WHERE id = ?', [userId]);
  if (user?.pincode) {
    const digits = String(user.pincode).replace(/\D/g, '');
    if (digits.length === 6) return digits;
  }

  const address = queryOne(
    'SELECT pincode FROM user_addresses WHERE user_id = ? ORDER BY is_default DESC, created_at ASC LIMIT 1',
    [userId]
  );
  if (address?.pincode) {
    const digits = String(address.pincode).replace(/\D/g, '');
    if (digits.length === 6) return digits;
  }

  return null;
}

export function findWholesalerForPincodeAndStore(pincode, storeType) {
  if (!pincode || !storeType) return null;

  return queryOne(
    `SELECT w.*
     FROM wholesalers w
     JOIN wholesaler_pincodes wp ON wp.wholesaler_id = w.id
     WHERE wp.pincode = ? AND wp.active = 1 AND w.active = 1 AND w.store_type = ?
     LIMIT 1`,
    [pincode, storeType]
  );
}

export function getWholesaleUnitPrice(product) {
  if (product?.wholesale_price != null && product.wholesale_price > 0) {
    return Number(product.wholesale_price);
  }
  const retail = Number(product?.price ?? 0);
  return Math.round(retail * 0.85 * 100) / 100;
}

function getProductStoreType(productId) {
  const product = queryOne('SELECT store_type, category_id, price, wholesale_price FROM products WHERE id = ?', [
    productId,
  ]);
  if (!product) return { storeType: 'general', product: null };
  return {
    storeType: resolveStoreType({
      storeType: product.store_type,
      categoryId: product.category_id,
    }),
    product,
  };
}

async function notifyVendorTask(task, orderId, pincode) {
  const wholesaler = queryOne('SELECT * FROM wholesalers WHERE id = ?', [task.wholesalerId]);
  if (!wholesaler) return;

  try {
    await fetch(`${NOTIFICATION_URL}/api/notifications/vendor-order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: wholesaler.name,
        email: wholesaler.email,
        phone: wholesaler.phone,
        shopName: wholesaler.shop_name,
        orderId,
        pincode,
        itemCount: task.itemCount,
        wholesaleCost: task.wholesaleCost,
        storeType: wholesaler.store_type,
      }),
    });
    run('UPDATE order_vendor_tasks SET notified_at = datetime(\'now\') WHERE id = ?', [task.taskId]);
  } catch (error) {
    console.warn('[vendor-notify] Failed:', error.message);
  }
}

/** Split order line items across store vendors in the same pincode. */
export async function assignOrderToWholesaler(orderId, userId) {
  const pincode = resolveCustomerPincode(userId);
  const items = queryAll('SELECT id, product_id, quantity FROM order_items WHERE order_id = ?', [orderId]);

  const vendorBuckets = new Map();

  items.forEach((item) => {
    const { storeType, product } = getProductStoreType(item.product_id);
    const wholesaler = pincode ? findWholesalerForPincodeAndStore(pincode, storeType) : null;
    const wholesalePrice = getWholesaleUnitPrice(product ?? { price: 0 });

    run('UPDATE order_items SET wholesale_price = ?, wholesaler_id = ? WHERE id = ?', [
      wholesalePrice,
      wholesaler?.id ?? null,
      item.id,
    ]);

    if (!wholesaler) return;

    const bucket = vendorBuckets.get(wholesaler.id) ?? {
      wholesaler,
      wholesaleCost: 0,
      itemCount: 0,
    };
    bucket.wholesaleCost += wholesalePrice * item.quantity;
    bucket.itemCount += item.quantity;
    vendorBuckets.set(wholesaler.id, bucket);
  });

  run('DELETE FROM order_vendor_tasks WHERE order_id = ?', [orderId]);

  let totalWholesale = 0;
  const createdTasks = [];

  vendorBuckets.forEach((bucket, wholesalerId) => {
    const wholesaleCost = Math.round(bucket.wholesaleCost * 100) / 100;
    totalWholesale += wholesaleCost;
    const taskId = randomUUID();

    run(
      `INSERT INTO order_vendor_tasks (id, order_id, wholesaler_id, status, wholesale_cost, item_count)
       VALUES (?, ?, ?, 'assigned', ?, ?)`,
      [taskId, orderId, wholesalerId, wholesaleCost, bucket.itemCount]
    );

    createdTasks.push({
      taskId,
      wholesalerId,
      wholesaler: bucket.wholesaler,
      wholesaleCost,
      itemCount: bucket.itemCount,
    });
  });

  if (createdTasks.length > 0) {
    const primary = createdTasks[0];
    run(
      `UPDATE orders
       SET wholesaler_id = ?, wholesaler_status = 'assigned', wholesale_cost = ?, status = 'processing'
       WHERE id = ?`,
      [primary.wholesalerId, totalWholesale, orderId]
    );
  } else {
    run("UPDATE orders SET wholesale_cost = ?, status = 'processing' WHERE id = ?", [totalWholesale, orderId]);
  }

  for (const task of createdTasks) {
    await notifyVendorTask(task, orderId, pincode);
  }

  return {
    pincode,
    wholesaleCost: totalWholesale,
    vendorTasks: createdTasks,
  };
}

export function formatWholesaler(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    shopName: row.shop_name,
    storeType: row.store_type ?? 'general',
    phone: row.phone,
    email: row.email ?? null,
    address: row.address ?? null,
    settlementCycle: row.settlement_cycle ?? 'weekly',
    active: row.active === 1,
    pincodes: [],
  };
}

export function getVendorTasksForOrder(orderId, wholesalerId = null) {
  let sql = 'SELECT * FROM order_vendor_tasks WHERE order_id = ?';
  const params = [orderId];
  if (wholesalerId) {
    sql += ' AND wholesaler_id = ?';
    params.push(wholesalerId);
  }
  return queryAll(`${sql} ORDER BY created_at ASC`, params);
}

export function getVendorLineItems(orderId, wholesalerId) {
  return queryAll(
    `SELECT oi.*, p.name as product_name, p.brand, p.unit, p.image, p.images
     FROM order_items oi
     LEFT JOIN products p ON p.id = oi.product_id
     WHERE oi.order_id = ? AND oi.wholesaler_id = ?
     ORDER BY oi.product_id`,
    [orderId, wholesalerId]
  );
}
