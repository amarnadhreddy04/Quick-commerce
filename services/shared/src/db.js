import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import initSqlJs from 'sql.js';

import { BANNER_IMAGES, CATEGORY_IMAGES, PRODUCT_IMAGES, isImageUri } from './mediaUrls.js';

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

  migrateCatalogImages();
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
