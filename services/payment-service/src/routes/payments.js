import { Router } from 'express';
import { v4 as uuid } from 'uuid';

import { queryAll, queryOne, run, transaction } from '../../../shared/src/db.js';
import { authRequired } from '../../../shared/src/middleware/auth.js';
import {
  decrementStockForItems,
  publishStockSyncForItems,
  validateOrderStock,
} from '../../../shared/src/productStock.js';
import { publishSyncEvent } from '../../../shared/src/sync/publish.js';
import { calculateOrderAmount, validateOrderTotals } from '../../../shared/src/orderTotals.js';
import { incrementPromoUsage } from '../../../shared/src/promoCodes.js';
import { assignOrderToWholesaler } from '../../../shared/src/wholesalerAssignment.js';
import {
  createRazorpayOrder,
  getRazorpayKeyId,
  isRazorpayConfigured,
  verifyPaymentSignature,
} from '../services/razorpay.js';

const router = Router();

function formatOrder(row) {
  const user = queryOne('SELECT name FROM users WHERE id = ?', [row.user_id]);
  return {
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
    razorpayOrderId: row.razorpay_order_id ?? null,
  };
}

function isWalletEnabled() {
  const settings = queryOne('SELECT wallet_enabled FROM app_settings WHERE id = 1');
  return settings?.wallet_enabled === 1;
}

function paymentMethods() {
  const base = isRazorpayConfigured() ? ['razorpay', 'wallet', 'cod'] : ['demo', 'wallet', 'cod'];
  return isWalletEnabled() ? base : base.filter((method) => method !== 'wallet');
}

router.get('/config', authRequired, (_req, res) => {
  res.json({
    provider: 'razorpay',
    keyId: getRazorpayKeyId(),
    configured: isRazorpayConfigured(),
    currency: 'INR',
    methods: paymentMethods(),
    demoMode: !isRazorpayConfigured(),
  });
});

function insertOrderRow({
  orderId,
  userId,
  date,
  status,
  total,
  deliverySlot,
  itemCount,
  expected,
  paymentStatus,
  paymentMethod,
  razorpayOrderId = null,
  razorpayPaymentId = null,
}) {
  run(
    `INSERT INTO orders (id, user_id, date, status, total, delivery_slot, items_count, delivery_fee, platform_fee, promo_code, promo_discount, payment_status, payment_method, razorpay_order_id, razorpay_payment_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      orderId,
      userId,
      date,
      status,
      total,
      deliverySlot,
      itemCount,
      expected.deliveryFee,
      expected.platformFee,
      expected.promoCode,
      expected.promoDiscount ?? 0,
      paymentStatus,
      paymentMethod,
      razorpayOrderId,
      razorpayPaymentId,
    ]
  );
}

router.post('/create-order', authRequired, async (req, res) => {
  const { items, deliverySlot, total, deliveryFee, platformFee, promoCode, promoDiscount, paymentMethod: rawMethod } =
    req.body;
  const paymentMethod = String(rawMethod ?? '').toLowerCase();

  if (!items?.length || !total) {
    return res.status(400).json({ error: 'Cart items and total are required' });
  }

  const stockCheck = validateOrderStock(items);
  if (!stockCheck.ok) {
    return res.status(400).json({ error: stockCheck.error });
  }

  const expected = calculateOrderAmount(items, null, promoCode ? { code: promoCode } : null);
  if (expected.error) {
    return res.status(400).json({ error: expected.error });
  }

  const totalsError = validateOrderTotals(
    { total, deliveryFee, platformFee, promoCode, promoDiscount: expected.promoDiscount },
    items
  );
  if (totalsError) {
    return res.status(400).json({ error: totalsError });
  }

  const user = queryOne('SELECT * FROM users WHERE id = ?', [req.user.id]);
  const orderId = `MB-${Math.floor(10000 + Math.random() * 90000)}`;
  const date = new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  if (paymentMethod === 'cod') {
    transaction(() => {
      insertOrderRow({
        orderId,
        userId: req.user.id,
        date,
        status: 'scheduled',
        total,
        deliverySlot,
        itemCount: items.length,
        expected,
        paymentStatus: 'pending',
        paymentMethod: 'cod',
      });
      items.forEach((item) => {
        run(
          'INSERT INTO order_items (id, order_id, product_id, quantity, price) VALUES (?, ?, ?, ?, ?)',
          [uuid(), orderId, item.productId, item.quantity, item.price]
        );
      });
      decrementStockForItems(items);
    });

    if (expected.promoCode) incrementPromoUsage(expected.promoCode);
    await assignOrderToWholesaler(orderId, req.user.id);
    const order = queryOne('SELECT * FROM orders WHERE id = ?', [orderId]);
    await Promise.all([
      publishSyncEvent({ domain: 'orders', action: 'created', entity: 'order', id: orderId }),
      publishStockSyncForItems(items),
    ]);
    return res.status(201).json({
      paymentMethod: 'cod',
      order: formatOrder(order),
    });
  }

  if (paymentMethod === 'wallet') {
    if (!isWalletEnabled()) {
      return res.status(400).json({ error: 'Wallet payments are currently disabled' });
    }
    if (user.wallet_balance < total) {
      return res.status(400).json({ error: 'Insufficient wallet balance' });
    }

    transaction(() => {
      run('UPDATE users SET wallet_balance = wallet_balance - ? WHERE id = ?', [total, req.user.id]);
      insertOrderRow({
        orderId,
        userId: req.user.id,
        date,
        status: 'scheduled',
        total,
        deliverySlot,
        itemCount: items.length,
        expected,
        paymentStatus: 'paid',
        paymentMethod: 'wallet',
      });
      items.forEach((item) => {
        run(
          'INSERT INTO order_items (id, order_id, product_id, quantity, price) VALUES (?, ?, ?, ?, ?)',
          [uuid(), orderId, item.productId, item.quantity, item.price]
        );
      });
      decrementStockForItems(items);
    });

    if (expected.promoCode) incrementPromoUsage(expected.promoCode);
    await assignOrderToWholesaler(orderId, req.user.id);
    const order = queryOne('SELECT * FROM orders WHERE id = ?', [orderId]);
    await Promise.all([
      publishSyncEvent({ domain: 'orders', action: 'created', entity: 'order', id: orderId }),
      publishStockSyncForItems(items),
    ]);
    return res.status(201).json({
      paymentMethod: 'wallet',
      order: formatOrder(order),
    });
  }

  const razorpayOrder = await createRazorpayOrder({
    amount: total,
    receipt: orderId,
    notes: { userId: req.user.id, email: user.email },
  });

  transaction(() => {
    insertOrderRow({
      orderId,
      userId: req.user.id,
      date,
      status: 'pending_payment',
      total,
      deliverySlot,
      itemCount: items.length,
      expected,
      paymentStatus: 'pending',
      paymentMethod: 'razorpay',
      razorpayOrderId: razorpayOrder.id,
    });
    items.forEach((item) => {
      run(
        'INSERT INTO order_items (id, order_id, product_id, quantity, price) VALUES (?, ?, ?, ?, ?)',
        [uuid(), orderId, item.productId, item.quantity, item.price]
      );
    });
  });

  res.status(201).json({
    orderId,
    razorpayOrderId: razorpayOrder.id,
    amount: razorpayOrder.amount,
    currency: razorpayOrder.currency ?? 'INR',
    keyId: getRazorpayKeyId(),
    demo: !!razorpayOrder.demo,
    user: {
      name: user.name,
      email: user.email,
      phone: user.phone,
    },
    deliveryFee: expected.deliveryFee,
    platformFee: expected.platformFee,
    promoCode: expected.promoCode,
    promoDiscount: expected.promoDiscount,
  });
});

router.post('/verify', authRequired, async (req, res) => {
  const { orderId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

  if (!orderId || !razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
    return res.status(400).json({ error: 'Missing payment verification fields' });
  }

  const order = queryOne('SELECT * FROM orders WHERE id = ? AND user_id = ?', [
    orderId,
    req.user.id,
  ]);

  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }

  if (order.payment_status === 'paid') {
    return res.json({ success: true, order: formatOrder(order) });
  }

  const valid = verifyPaymentSignature({
    orderId: razorpayOrderId,
    paymentId: razorpayPaymentId,
    signature: razorpaySignature,
  });

  if (!valid) {
    run('UPDATE orders SET payment_status = ? WHERE id = ?', ['failed', orderId]);
    return res.status(400).json({ error: 'Payment verification failed' });
  }

  const lineItems = queryAll(
    'SELECT product_id as productId, quantity FROM order_items WHERE order_id = ?',
    [orderId]
  );
  const stockCheck = validateOrderStock(lineItems);
  if (!stockCheck.ok) {
    return res.status(400).json({ error: stockCheck.error });
  }

  transaction(() => {
    run(
      `UPDATE orders SET payment_status = 'paid', razorpay_payment_id = ?, payment_method = 'razorpay'
       WHERE id = ?`,
      [razorpayPaymentId, orderId]
    );
    decrementStockForItems(lineItems);
  });

  if (order.promo_code) incrementPromoUsage(order.promo_code);
  await assignOrderToWholesaler(orderId, order.user_id);
  const updated = queryOne('SELECT * FROM orders WHERE id = ?', [orderId]);
  await Promise.all([
    publishSyncEvent({ domain: 'orders', action: 'updated', entity: 'order', id: orderId }),
    publishStockSyncForItems(lineItems),
  ]);
  res.json({ success: true, order: formatOrder(updated) });
});

export default router;
