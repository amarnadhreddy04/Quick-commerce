import { Router } from 'express';
import { v4 as uuid } from 'uuid';

import { queryOne, run, transaction } from '../db.js';
import { authRequired } from '../middleware/auth.js';
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
    deliverySlot: row.delivery_slot,
    paymentStatus: row.payment_status ?? 'pending',
    paymentMethod: row.payment_method ?? null,
    razorpayOrderId: row.razorpay_order_id ?? null,
  };
}

router.get('/config', authRequired, (_req, res) => {
  res.json({
    provider: 'razorpay',
    keyId: getRazorpayKeyId(),
    configured: isRazorpayConfigured(),
    currency: 'INR',
    methods: isRazorpayConfigured() ? ['razorpay', 'wallet', 'cod'] : ['demo', 'wallet', 'cod'],
    demoMode: !isRazorpayConfigured(),
  });
});

const FREE_DELIVERY_MIN_ORDER = 299;
const DELIVERY_CHARGE = 30;

function calculateOrderAmount(items) {
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const deliveryFee = subtotal >= FREE_DELIVERY_MIN_ORDER ? 0 : DELIVERY_CHARGE;
  return { subtotal, deliveryFee, total: subtotal + deliveryFee };
}

router.post('/create-order', authRequired, async (req, res) => {
  const { items, deliverySlot, total, deliveryFee, paymentMethod } = req.body;

  if (!items?.length || !total) {
    return res.status(400).json({ error: 'Cart items and total are required' });
  }

  const expected = calculateOrderAmount(items);
  if (Math.abs(total - expected.total) > 0.01 || (deliveryFee ?? 0) !== expected.deliveryFee) {
    return res.status(400).json({
      error: `Order total mismatch. Expected ₹${expected.total} (delivery fee ₹${expected.deliveryFee})`,
    });
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
      run(
        `INSERT INTO orders (id, user_id, date, status, total, delivery_slot, items_count, payment_status, payment_method, razorpay_order_id, razorpay_payment_id)
         VALUES (?, ?, ?, 'scheduled', ?, ?, ?, 'cod', 'cod', NULL, NULL)`,
        [orderId, req.user.id, date, total, deliverySlot, items.length]
      );
      items.forEach((item) => {
        run(
          'INSERT INTO order_items (id, order_id, product_id, quantity, price) VALUES (?, ?, ?, ?, ?)',
          [uuid(), orderId, item.productId, item.quantity, item.price]
        );
      });
    });

    const order = queryOne('SELECT * FROM orders WHERE id = ?', [orderId]);
    return res.status(201).json({
      paymentMethod: 'cod',
      order: formatOrder(order),
    });
  }

  if (paymentMethod === 'wallet') {
    if (user.wallet_balance < total) {
      return res.status(400).json({ error: 'Insufficient wallet balance' });
    }

    transaction(() => {
      run('UPDATE users SET wallet_balance = wallet_balance - ? WHERE id = ?', [total, req.user.id]);
      run(
        `INSERT INTO orders (id, user_id, date, status, total, delivery_slot, items_count, payment_status, payment_method, razorpay_order_id, razorpay_payment_id)
         VALUES (?, ?, ?, 'scheduled', ?, ?, ?, 'paid', 'wallet', NULL, NULL)`,
        [orderId, req.user.id, date, total, deliverySlot, items.length]
      );
      items.forEach((item) => {
        run(
          'INSERT INTO order_items (id, order_id, product_id, quantity, price) VALUES (?, ?, ?, ?, ?)',
          [uuid(), orderId, item.productId, item.quantity, item.price]
        );
      });
    });

    const order = queryOne('SELECT * FROM orders WHERE id = ?', [orderId]);
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
    run(
      `INSERT INTO orders (id, user_id, date, status, total, delivery_slot, items_count, payment_status, payment_method, razorpay_order_id)
       VALUES (?, ?, ?, 'pending_payment', ?, ?, ?, 'pending', 'razorpay', ?)`,
      [orderId, req.user.id, date, total, deliverySlot, items.length, razorpayOrder.id]
    );
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
    deliveryFee: deliveryFee ?? 0,
  });
});

router.post('/verify', authRequired, (req, res) => {
  const {
    orderId,
    razorpayOrderId,
    razorpayPaymentId,
    razorpaySignature,
  } = req.body;

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

  run(
    `UPDATE orders SET payment_status = 'paid', status = 'scheduled', razorpay_payment_id = ?, payment_method = 'razorpay'
     WHERE id = ?`,
    [razorpayPaymentId, orderId]
  );

  const updated = queryOne('SELECT * FROM orders WHERE id = ?', [orderId]);
  res.json({ success: true, order: formatOrder(updated) });
});

export default router;
