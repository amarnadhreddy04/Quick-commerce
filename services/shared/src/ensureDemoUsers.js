import bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';

import { queryOne, run } from './db.js';

const DEMO_USERS = [
  {
    email: 'admin@milkbasket.com',
    name: 'Pachari Admin',
    phone: '+91 90000 00001',
    password: 'admin123',
    role: 'admin',
    location: 'Noida HQ',
    pincode: null,
    adminPincode: null,
    wholesalerId: null,
    walletBalance: 0,
  },
  {
    email: 'addanki-admin@milkbasket.com',
    name: 'Addanki Location Admin',
    phone: '+91 90000 00002',
    password: 'location123',
    role: 'location_admin',
    location: 'Addanki, Andhra Pradesh',
    pincode: null,
    adminPincode: '523201',
    wholesalerId: null,
    walletBalance: 0,
  },
  {
    email: 'ravi.wholesale@example.com',
    name: 'Ravi Kumar',
    phone: '+91 91234 56789',
    password: 'vendor123',
    role: 'wholesaler',
    location: 'Addanki, Andhra Pradesh',
    pincode: null,
    adminPincode: null,
    wholesalerId: null,
    walletBalance: 0,
    wholesalerShop: 'Ravi General Store',
  },
  {
    email: 'addanki-veg@example.com',
    name: 'Srinivas Rao',
    phone: '+91 91234 56780',
    password: 'vendor123',
    role: 'wholesaler',
    location: 'Addanki, Andhra Pradesh',
    pincode: null,
    adminPincode: null,
    wholesalerId: null,
    walletBalance: 0,
    wholesalerShop: 'Addanki Vegetable Store',
  },
  {
    email: 'addanki-milk@example.com',
    name: 'Lakshmi Devi',
    phone: '+91 91234 56781',
    password: 'vendor123',
    role: 'wholesaler',
    location: 'Addanki, Andhra Pradesh',
    pincode: null,
    adminPincode: null,
    wholesalerId: null,
    walletBalance: 0,
    wholesalerShop: 'Milk & Bread Store',
  },
  {
    email: 'suresh.rider@example.com',
    name: 'Suresh Babu',
    phone: '+91 99887 76655',
    password: 'rider123',
    role: 'rider',
    location: 'Addanki, Andhra Pradesh',
    pincode: null,
    adminPincode: null,
    wholesalerId: null,
    riderId: null,
    walletBalance: 0,
    riderName: 'Suresh Babu',
  },
  {
    email: 'kiran.rider@example.com',
    name: 'Kiran Kumar',
    phone: '+91 99887 76656',
    password: 'rider123',
    role: 'rider',
    location: 'Addanki, Andhra Pradesh',
    pincode: null,
    adminPincode: null,
    wholesalerId: null,
    riderId: null,
    walletBalance: 0,
    riderName: 'Kiran Kumar',
  },
  {
    email: 'amar@example.com',
    name: 'Amar Kumar',
    phone: '+91 98765 43210',
    password: 'user123',
    role: 'customer',
    location: 'Addanki, Andhra Pradesh',
    pincode: '523201',
    adminPincode: null,
    wholesalerId: null,
    walletBalance: 248.5,
  },
];

export function ensureDemoUsers() {
  DEMO_USERS.forEach((demo) => {
    const email = demo.email.toLowerCase();
    const existing = queryOne('SELECT id, password_hash FROM users WHERE email = ?', [email]);
    const passwordHash = bcrypt.hashSync(demo.password, 10);
    let wholesalerId = demo.wholesalerId;
    let riderId = demo.riderId ?? null;
    if (demo.role === 'wholesaler' && demo.wholesalerShop) {
      const wholesaler = queryOne('SELECT id FROM wholesalers WHERE shop_name = ?', [demo.wholesalerShop]);
      wholesalerId = wholesaler?.id ?? null;
    }
    if (demo.role === 'rider' && demo.email) {
      const rider = queryOne('SELECT id FROM riders WHERE email = ?', [demo.email]);
      riderId = rider?.id ?? null;
    }

    if (existing) {
      run(
        `UPDATE users
         SET name=?, phone=?, password_hash=?, role=?, location=?, pincode=?, admin_pincode=?, wholesaler_id=?, rider_id=?, wallet_balance=?, active=1
         WHERE email=?`,
        [
          demo.name,
          demo.phone,
          passwordHash,
          demo.role,
          demo.location,
          demo.pincode,
          demo.adminPincode,
          wholesalerId,
          riderId,
          demo.walletBalance,
          email,
        ]
      );
      return;
    }

    run(
      `INSERT INTO users (id, name, email, phone, password_hash, role, location, pincode, admin_pincode, wholesaler_id, rider_id, wallet_balance, active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [
        uuid(),
        demo.name,
        email,
        demo.phone,
        passwordHash,
        demo.role,
        demo.location,
        demo.pincode,
        demo.adminPincode,
        wholesalerId,
        riderId,
        demo.walletBalance,
      ]
    );
  });
}
