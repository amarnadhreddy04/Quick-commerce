import bcrypt from 'bcryptjs';
import { Router } from 'express';
import { v4 as uuid } from 'uuid';

import { queryOne, run } from '../../../shared/src/db.js';
import { authRequired, formatUser, signToken } from '../../../shared/src/middleware/auth.js';
import { createAddress } from '../../../shared/src/userAddresses.js';
import addressRoutes from './addresses.js';

const router = Router();

router.use('/addresses', addressRoutes);
const NOTIFICATION_URL = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3017';
const DEFAULT_PINCODES = ['523201', '523157', '522601', '513255'];

function isPincodeServiceable(pincodeDigits) {
  try {
    const row = queryOne(
      'SELECT pincode FROM service_pincodes WHERE pincode = ? AND active = 1',
      [pincodeDigits]
    );
    if (row) return true;
  } catch {
    // Fall back to default list if table is missing
  }
  return DEFAULT_PINCODES.includes(pincodeDigits);
}

async function sendRegistrationNotifications(payload) {
  try {
    const response = await fetch(`${NOTIFICATION_URL}/api/notifications/registration`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return response.json();
  } catch {
    return { email: { success: false }, sms: { success: false, devMode: true } };
  }
}

router.post('/register', async (req, res) => {
  const { name, email, phone, password, location, pincode } = req.body;

  if (!name || !email || !password || !phone) {
    return res.status(400).json({ error: 'Name, email, phone, and password are required' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  const phoneDigits = phone.replace(/\D/g, '');
  if (phoneDigits.length < 10) {
    return res.status(400).json({ error: 'Enter a valid 10-digit phone number' });
  }

  const pincodeDigits = (pincode ?? '').replace(/\D/g, '');
  if (pincodeDigits.length !== 6) {
    return res.status(400).json({ error: 'Enter a valid 6-digit delivery pincode' });
  }

  if (!isPincodeServiceable(pincodeDigits)) {
    return res.status(400).json({
      error: 'Delivery is not available for this pincode. We currently serve: 523201, 523157, 522601, 513255',
    });
  }

  const existing = queryOne('SELECT id FROM users WHERE email = ?', [email.toLowerCase()]);
  if (existing) {
    return res.status(409).json({ error: 'Email already registered' });
  }

  const id = uuid();
  const passwordHash = bcrypt.hashSync(password, 10);

  run(
    `INSERT INTO users (id, name, email, phone, password_hash, role, location, pincode, wallet_balance, active)
     VALUES (?, ?, ?, ?, ?, 'customer', ?, ?, 0, 1)`,
    [id, name, email.toLowerCase(), phone, passwordHash, location ?? null, pincodeDigits]
  );

  createAddress(id, {
    label: 'Home',
    line1: location?.replace(/\s*\d{6}\s*$/, '').trim() || 'Home',
    pincode: pincodeDigits,
    isDefault: true,
  });

  const user = queryOne('SELECT * FROM users WHERE id = ?', [id]);
  const token = signToken(user);

  // Respond immediately; welcome email/SMS run in the background.
  const notificationsPromise = sendRegistrationNotifications({ name, email, phone });
  notificationsPromise.catch((error) => {
    console.warn('[auth] Registration notifications failed:', error.message);
  });

  res.status(201).json({
    token,
    user: formatUser(user),
    notifications: {
      emailSent: false,
      smsSent: false,
      emailPreviewUrl: null,
      smsDevMode: true,
    },
  });
});

router.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const user = queryOne('SELECT * FROM users WHERE email = ?', [email.toLowerCase()]);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  if (!user.active) {
    return res.status(403).json({ error: 'Account is deactivated' });
  }

  const token = signToken(user);
  res.json({ token, user: formatUser(user) });
});

router.get('/me', authRequired, (req, res) => {
  const user = queryOne('SELECT * FROM users WHERE id = ?', [req.user.id]);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  res.json({ user: formatUser(user) });
});

export default router;
