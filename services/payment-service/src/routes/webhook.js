import { queryAll, queryOne, run, transaction } from '../../../shared/src/db.js';
import {
  decrementStockForItems,
  publishStockSyncForItems,
  validateOrderStock,
} from '../../../shared/src/productStock.js';
import { publishSyncEvent } from '../../../shared/src/sync/publish.js';
import { incrementPromoUsage } from '../../../shared/src/promoCodes.js';
import { assignOrderToWholesaler } from '../../../shared/src/wholesalerAssignment.js';
import { verifyWebhookSignature } from '../services/razorpay.js';

export async function handleRazorpayWebhook(req, res) {
  const signature = req.headers['x-razorpay-signature'];
  const rawBody = req.body;

  if (!Buffer.isBuffer(rawBody)) {
    return res.status(400).json({ error: 'Invalid webhook payload' });
  }

  if (!verifyWebhookSignature(rawBody, signature)) {
    return res.status(400).json({ error: 'Invalid webhook signature' });
  }

  let event;
  try {
    event = JSON.parse(rawBody.toString('utf8'));
  } catch {
    return res.status(400).json({ error: 'Invalid JSON payload' });
  }

  if (event.event !== 'payment.captured') {
    return res.json({ received: true, ignored: event.event });
  }

  const payment = event.payload?.payment?.entity;
  const razorpayOrderId = payment?.order_id;
  const razorpayPaymentId = payment?.id;

  if (!razorpayOrderId || !razorpayPaymentId) {
    return res.status(400).json({ error: 'Missing payment details' });
  }

  const order = queryOne('SELECT * FROM orders WHERE razorpay_order_id = ?', [razorpayOrderId]);
  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }

  if (order.payment_status === 'paid') {
    return res.json({ received: true, alreadyPaid: true });
  }

  const lineItems = queryAll(
    'SELECT product_id as productId, quantity FROM order_items WHERE order_id = ?',
    [order.id]
  );
  const stockCheck = validateOrderStock(lineItems);
  if (!stockCheck.ok) {
    return res.status(409).json({ error: stockCheck.error });
  }

  transaction(() => {
    run(
      `UPDATE orders SET status = 'scheduled', payment_status = 'paid', razorpay_payment_id = ?, payment_method = 'razorpay'
       WHERE id = ?`,
      [razorpayPaymentId, order.id]
    );
    decrementStockForItems(lineItems);
  });

  if (order.promo_code) incrementPromoUsage(order.promo_code);
  await assignOrderToWholesaler(order.id, order.user_id);
  await Promise.all([
    publishSyncEvent({ domain: 'orders', action: 'updated', entity: 'order', id: order.id }),
    publishStockSyncForItems(lineItems),
  ]);

  res.json({ received: true, orderId: order.id });
}
