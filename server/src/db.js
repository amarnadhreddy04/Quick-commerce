import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import initSqlJs from 'sql.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, '..', 'data');
const dbPath = path.join(dataDir, 'milkbasket.db');

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
    thumbnail TEXT
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
    min_order_value REAL NOT NULL DEFAULT 99,
    delivery_fee REAL NOT NULL DEFAULT 15
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
