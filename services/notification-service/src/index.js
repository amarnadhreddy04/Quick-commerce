import 'dotenv/config';
import { Router } from 'express';

import { createServiceApp } from '../../shared/src/createApp.js';
import {
  sendRegistrationNotifications,
  sendStockAvailableNotifications,
  sendVendorOrderNotification,
} from './services/notifications.js';

const app = createServiceApp('notification-service');
const PORT = process.env.NOTIFICATION_PORT || 3017;
const router = Router();

router.post('/stock-available', async (req, res) => {
  const { name, email, phone, productName } = req.body ?? {};
  if (!name || !email || !productName) {
    return res.status(400).json({ error: 'Name, email, and productName are required' });
  }

  const notifications = await sendStockAvailableNotifications({ name, email, phone, productName });
  res.json(notifications);
});

router.post('/vendor-order', async (req, res) => {
  const payload = req.body ?? {};
  if (!payload.shopName || !payload.orderId) {
    return res.status(400).json({ error: 'shopName and orderId are required' });
  }

  const result = await sendVendorOrderNotification(payload);
  res.json(result);
});

router.post('/registration', async (req, res) => {
  const { name, email, phone } = req.body ?? {};
  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email are required' });
  }

  const notifications = await sendRegistrationNotifications({ name, email, phone });
  res.json(notifications);
});

app.use('/api/notifications', router);

app.listen(PORT, () => {
  console.log(`Notification service running at http://localhost:${PORT}`);
});
