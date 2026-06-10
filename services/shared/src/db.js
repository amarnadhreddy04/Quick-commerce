import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import initSqlJs from 'sql.js';

import { ensureDemoOrder } from './ensureDemoOrder.js';
import { ensureDemoUsers } from './ensureDemoUsers.js';
import { migrateGroceryCategories } from './groceryCategories.js';
import { BANNER_IMAGES, CATEGORY_IMAGES, PRODUCT_IMAGES, isImageUri } from './mediaUrls.js';
import { formatProductImagesRow } from './productImages.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '..', '..', '..');
const dataDir = process.env.DB_DIR || path.join(projectRoot, 'server', 'data');
const dbPath = process.env.DB_PATH || path.join(dataDir, 'milkbasket.db');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

let SQL;
let db;

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    phone TEXT,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'customer',
    location TEXT,
    wallet_balance REAL NOT NULL DEFAULT 0,
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    icon TEXT,
    color TEXT,
    thumbnail TEXT,
    description TEXT
  );

  CREATE TABLE IF NOT EXISTS sub_categories (
    id TEXT PRIMARY KEY,
    category_id TEXT NOT NULL,
    name TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    brand TEXT,
    category_id TEXT NOT NULL,
    sub_category_id TEXT,
    price REAL NOT NULL,
    mrp REAL,
    unit TEXT,
    image TEXT,
    images TEXT,
    description TEXT,
    subscription INTEGER NOT NULL DEFAULT 0,
    tag TEXT,
    stock INTEGER NOT NULL DEFAULT 0,
    active INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS promo_banners (
    id TEXT PRIMARY KEY,
    category_id TEXT NOT NULL,
    title TEXT NOT NULL,
    subtitle TEXT,
    cta TEXT,
    emojis TEXT,
    slide INTEGER DEFAULT 1,
    total INTEGER DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    date TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'scheduled',
    total REAL NOT NULL,
    delivery_slot TEXT,
    items_count INTEGER NOT NULL DEFAULT 0,
    payment_status TEXT DEFAULT 'pending',
    payment_method TEXT,
    razorpay_order_id TEXT,
    razorpay_payment_id TEXT
  );

  CREATE TABLE IF NOT EXISTS order_items (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    price REAL NOT NULL
  );

  CREATE TABLE IF NOT EXISTS app_settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    delivery_cutoff TEXT NOT NULL,
    delivery_slot TEXT NOT NULL,
    min_order_value REAL NOT NULL DEFAULT 299,
    delivery_fee REAL NOT NULL DEFAULT 30
  );

  CREATE TABLE IF NOT EXISTS service_areas (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    radius_km REAL NOT NULL DEFAULT 15,
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS service_pincodes (
    pincode TEXT PRIMARY KEY,
    label TEXT NOT NULL,
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS product_pincodes (
    product_id TEXT NOT NULL,
    pincode TEXT NOT NULL,
    active INTEGER NOT NULL DEFAULT 1,
    PRIMARY KEY (product_id, pincode)
  );

  CREATE TABLE IF NOT EXISTS category_pincodes (
    category_id TEXT NOT NULL,
    pincode TEXT NOT NULL,
    active INTEGER NOT NULL DEFAULT 1,
    PRIMARY KEY (category_id, pincode)
  );

  CREATE TABLE IF NOT EXISTS stock_notify_requests (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    notified_at TEXT,
    UNIQUE(user_id, product_id)
  );

  CREATE TABLE IF NOT EXISTS user_addresses (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    label TEXT NOT NULL DEFAULT 'Home',
    line1 TEXT NOT NULL,
    line2 TEXT,
    pincode TEXT NOT NULL,
    city TEXT,
    is_default INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`;

export function saveDatabase() {
  if (!db) return;
  const data = db.export();
  fs.writeFileSync(dbPath, Buffer.from(data));
}

export async function initDatabase() {
  if (db) return db;

  SQL = await initSqlJs();

  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  db.run('PRAGMA foreign_keys = ON;');
  db.exec(SCHEMA);
  migrateDatabase();
  saveDatabase();
  return db;
}

function migrateDatabase() {
  const columns = queryAll('PRAGMA table_info(orders)');
  const names = new Set(columns.map((col) => col.name));

  const additions = [
    ['payment_status', "TEXT DEFAULT 'pending'"],
    ['payment_method', 'TEXT'],
    ['razorpay_order_id', 'TEXT'],
    ['razorpay_payment_id', 'TEXT'],
  ];

  additions.forEach(([name, type]) => {
    if (!names.has(name)) {
      getDb().run(`ALTER TABLE orders ADD COLUMN ${name} ${type}`);
    }
  });

  getDb().exec(`
    CREATE TABLE IF NOT EXISTS service_areas (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      radius_km REAL NOT NULL DEFAULT 15,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  const userColumns = queryAll('PRAGMA table_info(users)');
  const userColumnNames = new Set(userColumns.map((col) => col.name));
  if (!userColumnNames.has('pincode')) {
    getDb().run('ALTER TABLE users ADD COLUMN pincode TEXT');
  }

  getDb().exec(`
    CREATE TABLE IF NOT EXISTS service_pincodes (
      pincode TEXT PRIMARY KEY,
      label TEXT NOT NULL,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  const defaultPincodes = [
    ['523201', 'Addanki, Andhra Pradesh'],
    ['523157', 'Chirala, Andhra Pradesh'],
    ['522601', 'Vinukonda, Andhra Pradesh'],
    ['513255', 'Rayadurg, Andhra Pradesh'],
  ];

  defaultPincodes.forEach(([pincode, label]) => {
    getDb().run(
      `INSERT OR IGNORE INTO service_pincodes (pincode, label, active) VALUES (?, ?, 1)`,
      [pincode, label]
    );
    getDb().run(
      `UPDATE service_pincodes SET label = ?, active = 1 WHERE pincode = ?`,
      [label, pincode]
    );
  });

  getDb().run('UPDATE app_settings SET min_order_value = 299, delivery_fee = 30 WHERE id = 1');

  const settingsColumns = queryAll('PRAGMA table_info(app_settings)');
  const settingsColumnNames = new Set(settingsColumns.map((col) => col.name));
  if (!settingsColumnNames.has('wallet_enabled')) {
    getDb().run('ALTER TABLE app_settings ADD COLUMN wallet_enabled INTEGER NOT NULL DEFAULT 0');
  }
  const settingsRow = queryOne('SELECT id FROM app_settings WHERE id = 1');
  if (!settingsRow) {
    getDb().run(
      `INSERT INTO app_settings (id, delivery_cutoff, delivery_slot, min_order_value, delivery_fee, wallet_enabled)
       VALUES (1, '11:00 PM', 'Tomorrow, 6:00 AM – 8:00 AM', 299, 30, 0)`
    );
  }

  getDb().run(
    `UPDATE users SET pincode = '523201', location = 'Addanki, Andhra Pradesh'
     WHERE email = 'amar@example.com' AND (pincode IS NULL OR pincode = '')`
  );

  const categoryColumns = queryAll('PRAGMA table_info(categories)');
  const categoryColumnNames = new Set(categoryColumns.map((col) => col.name));
  if (!categoryColumnNames.has('description')) {
    getDb().run('ALTER TABLE categories ADD COLUMN description TEXT');
  }

  const productColumns = queryAll('PRAGMA table_info(products)');
  const productColumnNames = new Set(productColumns.map((col) => col.name));
  if (!productColumnNames.has('description')) {
    getDb().run('ALTER TABLE products ADD COLUMN description TEXT');
  }
  if (!productColumnNames.has('images')) {
    getDb().run('ALTER TABLE products ADD COLUMN images TEXT');
  }

  getDb().exec(`
    CREATE TABLE IF NOT EXISTS product_pincodes (
      product_id TEXT NOT NULL,
      pincode TEXT NOT NULL,
      active INTEGER NOT NULL DEFAULT 1,
      PRIMARY KEY (product_id, pincode)
    );
    CREATE TABLE IF NOT EXISTS category_pincodes (
      category_id TEXT NOT NULL,
      pincode TEXT NOT NULL,
      active INTEGER NOT NULL DEFAULT 1,
      PRIMARY KEY (category_id, pincode)
    );
  `);

  getDb().exec(`
    CREATE TABLE IF NOT EXISTS stock_notify_requests (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      notified_at TEXT,
      UNIQUE(user_id, product_id)
    );
    CREATE TABLE IF NOT EXISTS user_addresses (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      label TEXT NOT NULL DEFAULT 'Home',
      line1 TEXT NOT NULL,
      line2 TEXT,
      pincode TEXT NOT NULL,
      city TEXT,
      is_default INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  migrateUserAddresses();

  migrateCatalogImages();
  migrateProductImages();
  migrateOrderItems();
  migrateLocationCatalog();
  migrateGroceryCategories({ queryOne, run, getDb, queryAll });
  ensureDemoUsers();
  ensureDemoOrder();
}

function migrateUserAddresses() {
  const users = queryAll(
    `SELECT id, location, pincode FROM users
     WHERE role = 'customer' AND pincode IS NOT NULL AND pincode != ''`
  );

  users.forEach((user) => {
    const existing = queryOne('SELECT id FROM user_addresses WHERE user_id = ? LIMIT 1', [user.id]);
    if (existing) return;

    const pincode = String(user.pincode).replace(/\D/g, '');
    if (pincode.length !== 6) return;

    const line1 = user.location?.replace(/\s*\d{6}\s*$/, '').trim() || 'Home';
    getDb().run(
      `INSERT INTO user_addresses (id, user_id, label, line1, line2, pincode, city, is_default)
       VALUES (?, ?, 'Home', ?, NULL, ?, ?, 1)`,
      [randomUUID(), user.id, line1, pincode, user.location ?? pincode]
    );
  });
}

function migrateLocationCatalog() {
  const eggsCategory = queryOne('SELECT id FROM categories WHERE id = ?', ['eggs']);
  const eggsProduct = queryOne('SELECT id FROM products WHERE id = ?', ['p5']);
  const eggsCategoryPins = queryOne('SELECT 1 as ok FROM category_pincodes WHERE category_id = ?', ['eggs']);
  const eggsProductPins = queryOne('SELECT 1 as ok FROM product_pincodes WHERE product_id = ?', ['p5']);

  if (eggsCategory && !eggsCategoryPins) {
    getDb().run(
      'INSERT OR IGNORE INTO category_pincodes (category_id, pincode, active) VALUES (?, ?, 1)',
      ['eggs', '523201']
    );
  }

  if (eggsProduct && !eggsProductPins) {
    getDb().run(
      'INSERT OR IGNORE INTO product_pincodes (product_id, pincode, active) VALUES (?, ?, 1)',
      ['p5', '523201']
    );
  }
}

const DEMO_ORDER_ITEMS = {
  'MB-10482': [
    ['p1', 2, 28],
    ['p3', 1, 45],
    ['p5', 1, 72],
    ['p6', 1, 48],
    ['p8', 2, 32],
  ],
};

function migrateOrderItems() {
  const orphans = queryAll(`
    SELECT o.id
    FROM orders o
    WHERE o.items_count > 0
      AND NOT EXISTS (SELECT 1 FROM order_items oi WHERE oi.order_id = o.id)
  `);

  orphans.forEach((order) => {
    const items = DEMO_ORDER_ITEMS[order.id];
    if (!items) return;

    items.forEach(([productId, quantity, price]) => {
      getDb().run(
        'INSERT INTO order_items (id, order_id, product_id, quantity, price) VALUES (?, ?, ?, ?, ?)',
        [randomUUID(), order.id, productId, quantity, price]
      );
    });
  });

  if (orphans.some((order) => DEMO_ORDER_ITEMS[order.id])) {
    saveDatabase();
  }
}

function migrateProductImages() {
  const rows = queryAll('SELECT id, image, images FROM products');
  rows.forEach((row) => {
    const { images, image } = formatProductImagesRow(row);
    getDb().run('UPDATE products SET image = ?, images = ? WHERE id = ?', [
      image,
      JSON.stringify(images),
      row.id,
    ]);
  });
}

function migrateCatalogImages() {
  Object.entries(CATEGORY_IMAGES).forEach(([id, url]) => {
    const row = queryOne('SELECT thumbnail FROM categories WHERE id = ?', [id]);
    if (row && !isImageUri(row.thumbnail)) {
      getDb().run('UPDATE categories SET thumbnail = ? WHERE id = ?', [url, id]);
    }
  });

  Object.entries(PRODUCT_IMAGES).forEach(([id, url]) => {
    const row = queryOne('SELECT image FROM products WHERE id = ?', [id]);
    if (row && !isImageUri(row.image)) {
      getDb().run('UPDATE products SET image = ? WHERE id = ?', [url, id]);
    }
  });

  Object.entries(BANNER_IMAGES).forEach(([id, urls]) => {
    const row = queryOne('SELECT emojis FROM promo_banners WHERE id = ?', [id]);
    if (!row) return;
    const current = JSON.parse(row.emojis || '[]');
    const needsUpdate = current.length === 0 || current.some((item) => !isImageUri(item));
    if (needsUpdate) {
      getDb().run('UPDATE promo_banners SET emojis = ? WHERE id = ?', [JSON.stringify(urls), id]);
    }
  });
}

export function getDb() {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

export function queryAll(sql, params = []) {
  const stmt = getDb().prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

export function queryOne(sql, params = []) {
  return queryAll(sql, params)[0] ?? null;
}

export function run(sql, params = []) {
  getDb().run(sql, params);
  saveDatabase();
}

export function transaction(fn) {
  fn();
  saveDatabase();
}
