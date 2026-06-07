import 'dotenv/config';
import { Router } from 'express';

import { createServiceApp } from '../../shared/src/createApp.js';
import { sendRegistrationNotifications } from './services/notifications.js';

const app = createServiceApp('notification-service');
const PORT = process.env.NOTIFICATION_PORT || 3017;
const router = Router();

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
