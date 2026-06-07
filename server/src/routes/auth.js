import bcrypt from 'bcryptjs';
import { Router } from 'express';
import { v4 as uuid } from 'uuid';

import { queryOne, run } from '../db.js';
import { authRequired, formatUser, signToken } from '../middleware/auth.js';

const router = Router();

router.post('/register', (req, res) => {
  const { name, email, phone, password, location } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  const existing = queryOne('SELECT id FROM users WHERE email = ?', [email.toLowerCase()]);
  if (existing) {
    return res.status(409).json({ error: 'Email already registered' });
  }

  const id = uuid();
  const passwordHash = bcrypt.hashSync(password, 10);

  run(
    `INSERT INTO users (id, name, email, phone, password_hash, role, location, wallet_balance, active)
     VALUES (?, ?, ?, ?, ?, 'customer', ?, 0, 1)`,
    [id, name, email.toLowerCase(), phone ?? null, passwordHash, location ?? null]
  );

  const user = queryOne('SELECT * FROM users WHERE id = ?', [id]);
  const token = signToken(user);
  res.status(201).json({ token, user: formatUser(user) });
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
