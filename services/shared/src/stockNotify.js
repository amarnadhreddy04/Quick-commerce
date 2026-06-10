import { randomUUID } from 'crypto';

import { queryAll, queryOne, run } from './db.js';

const NOTIFICATION_URL = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3017';

export function getStockNotifyStatus(userId, productId) {
  const row = queryOne(
    'SELECT id FROM stock_notify_requests WHERE user_id = ? AND product_id = ? AND notified_at IS NULL',
    [userId, productId]
  );
  return { subscribed: !!row };
}

export function subscribeStockNotify(userId, productId) {
  const product = queryOne('SELECT id, name, stock, active FROM products WHERE id = ?', [productId]);
  if (!product || !product.active) {
    return { ok: false, error: 'Product not found' };
  }
  if (product.stock > 0) {
    return { ok: false, error: 'Product is already in stock' };
  }

  const existing = queryOne(
    'SELECT id, notified_at FROM stock_notify_requests WHERE user_id = ? AND product_id = ?',
    [userId, productId]
  );

  if (existing && !existing.notified_at) {
    return { ok: true, alreadySubscribed: true };
  }

  if (existing) {
    run(
      `UPDATE stock_notify_requests
       SET notified_at = NULL, created_at = datetime('now')
       WHERE id = ?`,
      [existing.id]
    );
  } else {
    run('INSERT INTO stock_notify_requests (id, user_id, product_id) VALUES (?, ?, ?)', [
      randomUUID(),
      userId,
      productId,
    ]);
  }

  return { ok: true };
}

export function unsubscribeStockNotify(userId, productId) {
  run(
    'DELETE FROM stock_notify_requests WHERE user_id = ? AND product_id = ? AND notified_at IS NULL',
    [userId, productId]
  );
  return { ok: true };
}

export async function notifySubscribersForProduct(productId, productName) {
  const subscribers = queryAll(
    `SELECT snr.id, snr.user_id, u.name, u.email, u.phone
     FROM stock_notify_requests snr
     JOIN users u ON u.id = snr.user_id
     WHERE snr.product_id = ? AND snr.notified_at IS NULL`,
    [productId]
  );

  if (!subscribers.length) {
    return { notified: 0 };
  }

  let notified = 0;
  for (const subscriber of subscribers) {
    try {
      await fetch(`${NOTIFICATION_URL}/api/notifications/stock-available`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: subscriber.name,
          email: subscriber.email,
          phone: subscriber.phone,
          productName: productName ?? 'Product',
        }),
      });
    } catch (error) {
      console.warn(`[stock-notify] Failed to notify ${subscriber.user_id}:`, error.message);
    }

    run(`UPDATE stock_notify_requests SET notified_at = datetime('now') WHERE id = ?`, [subscriber.id]);
    notified += 1;
  }

  return { notified };
}

export function maybeNotifyRestocked(previousStock, newStock, productId, productName) {
  const wasOut = (previousStock ?? 0) <= 0;
  const nowIn = (newStock ?? 0) > 0;
  if (!wasOut || !nowIn) {
    return Promise.resolve({ notified: 0 });
  }
  return notifySubscribersForProduct(productId, productName);
}
