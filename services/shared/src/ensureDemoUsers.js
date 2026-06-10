import bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';

import { queryOne, run } from './db.js';

const DEMO_USERS = [
  {
    email: 'admin@milkbasket.com',
    name: 'Milkbasket Admin',
    phone: '+91 90000 00001',
    password: 'admin123',
    role: 'admin',
    location: 'Noida HQ',
    pincode: null,
    walletBalance: 0,
  },
  {
    email: 'amar@example.com',
    name: 'Amar Kumar',
    phone: '+91 98765 43210',
    password: 'user123',
    role: 'customer',
    location: 'Addanki, Andhra Pradesh',
    pincode: '523201',
    walletBalance: 248.5,
  },
];

export function ensureDemoUsers() {
  DEMO_USERS.forEach((demo) => {
    const email = demo.email.toLowerCase();
    const existing = queryOne('SELECT id, password_hash FROM users WHERE email = ?', [email]);
    const passwordHash = bcrypt.hashSync(demo.password, 10);

    if (existing) {
      run(
        `UPDATE users SET name=?, phone=?, password_hash=?, role=?, location=?, pincode=?, wallet_balance=?, active=1 WHERE email=?`,
        [
          demo.name,
          demo.phone,
          passwordHash,
          demo.role,
          demo.location,
          demo.pincode,
          demo.walletBalance,
          email,
        ]
      );
      return;
    }

    run(
      `INSERT INTO users (id, name, email, phone, password_hash, role, location, pincode, wallet_balance, active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [
        uuid(),
        demo.name,
        email,
        demo.phone,
        passwordHash,
        demo.role,
        demo.location,
        demo.pincode,
        demo.walletBalance,
      ]
    );
  });
}
