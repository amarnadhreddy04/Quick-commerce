import { queryAll, queryOne, run } from './db.js';
import { publishSyncEvent } from './sync/publish.js';

export function validateOrderStock(items) {
  if (!items?.length) {
    return { ok: false, error: 'Order items are required' };
  }

  for (const item of items) {
    const product = queryOne('SELECT id, name, stock, active FROM products WHERE id = ?', [
      item.productId,
    ]);

    if (!product || !product.active) {
      return { ok: false, error: `${item.productName ?? item.productId ?? 'Item'} is unavailable` };
    }

    const quantity = Number(item.quantity ?? 0);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      return { ok: false, error: 'Invalid item quantity' };
    }

    if (product.stock < quantity) {
      if (product.stock <= 0) {
        return { ok: false, error: `${product.name} is out of stock` };
      }
      return {
        ok: false,
        error: `Only ${product.stock} left for ${product.name}`,
      };
    }
  }

  return { ok: true };
}

export function decrementStockForItems(items) {
  items.forEach((item) => {
    run('UPDATE products SET stock = stock - ? WHERE id = ?', [item.quantity, item.productId]);
  });
}

export function decrementStockForOrder(orderId) {
  const items = queryAll(
    'SELECT product_id as productId, quantity FROM order_items WHERE order_id = ?',
    [orderId]
  );
  decrementStockForItems(items);
  return items;
}

export async function publishStockSyncForItems(items) {
  const uniqueIds = [...new Set(items.map((item) => item.productId).filter(Boolean))];
  await Promise.all(
    uniqueIds.map((id) =>
      publishSyncEvent({ domain: 'catalog', action: 'updated', entity: 'product', id })
    )
  );
}
