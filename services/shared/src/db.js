import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';

import { DEMO_ORDER_ID, DEMO_ORDER_LINE_ITEMS, repairDemoOrderLineItems } from './demoOrderItems.js';
import { ensureDemoOrder } from './ensureDemoOrder.js';
import { ensureDemoUsers } from './ensureDemoUsers.js';
import { ensureDemoPromoCodes } from './promoCodes.js';
import { ensureAllCustomerReferralCodes } from './referrals.js';
import { ensureDemoRiders, isOrderReadyForRider, tryAutoAssignRider } from './riderDelivery.js';
import { migrateGroceryCategories } from './groceryCategories.js';
import { BANNER_IMAGES, CATEGORY_IMAGES, PRODUCT_IMAGES, isImageUri } from './mediaUrls.js';
import { formatProductImagesRow } from './productImages.js';
import { assignOrderToWholesaler } from './wholesalerAssignment.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '..', '..', '..');
const dataDir = process.env.DB_DIR || path.join(projectRoot, 'server', 'data');
const dbPath = process.env.DB_PATH || path.join(dataDir, 'milkbasket.db');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

let db;
const initLockPath = path.join(dataDir, '.db-init.lock');

function bindParams(params = []) {
  return Array.isArray(params) ? params : [params];
}

async function acquireInitLock() {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    try {
      fs.writeFileSync(initLockPath, String(process.pid), { flag: 'wx' });
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  }
}

function releaseInitLock() {
  try {
    if (fs.existsSync(initLockPath)) {
      fs.unlinkSync(initLockPath);
    }
  } catch {
    // ignore stale lock cleanup errors
  }
}

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

/** No-op: better-sqlite3 persists writes to disk automatically. */
export function saveDatabase() {}

export async function initDatabase() {
  if (db) return db;

  await acquireInitLock();

  try {
    const native = new Database(dbPath);
    native.pragma('journal_mode = WAL');
    native.pragma('foreign_keys = ON');
    native.pragma('busy_timeout = 5000');

    db = {
      native,
      exec: (sql) => native.exec(sql),
      run: (sql, params = []) => native.prepare(sql).run(...bindParams(params)),
    };

    db.exec(SCHEMA);
    await migrateDatabase();
    return db;
  } finally {
    releaseInitLock();
  }
}

async function migrateDatabase() {
  const columns = queryAll('PRAGMA table_info(orders)');
  const names = new Set(columns.map((col) => col.name));

  const additions = [
    ['payment_status', "TEXT DEFAULT 'pending'"],
    ['payment_method', 'TEXT'],
    ['razorpay_order_id', 'TEXT'],
    ['razorpay_payment_id', 'TEXT'],
    ['wholesaler_id', 'TEXT'],
    ['wholesaler_status', 'TEXT'],
    ['wholesale_cost', 'REAL'],
    ['rider_id', 'TEXT'],
    ['rider_status', 'TEXT'],
    ['rider_assigned_at', 'TEXT'],
    ['rider_delivered_at', 'TEXT'],
  ];

  additions.forEach(([name, type]) => {
    if (!names.has(name)) {
      getDb().run(`ALTER TABLE orders ADD COLUMN ${name} ${type}`);
    }
  });
  if (!names.has('created_at')) {
    getDb().run('ALTER TABLE orders ADD COLUMN created_at TEXT');
  }
  getDb().run(`UPDATE orders SET created_at = datetime('now') WHERE created_at IS NULL OR created_at = ''`);

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
  if (!userColumnNames.has('admin_pincode')) {
    getDb().run('ALTER TABLE users ADD COLUMN admin_pincode TEXT');
  }
  if (!userColumnNames.has('wholesaler_id')) {
    getDb().run('ALTER TABLE users ADD COLUMN wholesaler_id TEXT');
  }
  if (!userColumnNames.has('rider_id')) {
    getDb().run('ALTER TABLE users ADD COLUMN rider_id TEXT');
  }
  if (!userColumnNames.has('terms_accepted_at')) {
    getDb().run('ALTER TABLE users ADD COLUMN terms_accepted_at TEXT');
  }
  if (!userColumnNames.has('terms_version')) {
    getDb().run('ALTER TABLE users ADD COLUMN terms_version TEXT');
  }
  if (!userColumnNames.has('referral_code')) {
    getDb().run('ALTER TABLE users ADD COLUMN referral_code TEXT');
  }
  if (!userColumnNames.has('referred_by_user_id')) {
    getDb().run('ALTER TABLE users ADD COLUMN referred_by_user_id TEXT');
  }

  getDb().exec(`
    CREATE TABLE IF NOT EXISTS referrals (
      id TEXT PRIMARY KEY,
      referrer_user_id TEXT NOT NULL,
      referee_user_id TEXT NOT NULL UNIQUE,
      reward_amount REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'registered',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      credited_at TEXT
    );
  `);

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
  if (!settingsColumnNames.has('subscription_enabled')) {
    getDb().run('ALTER TABLE app_settings ADD COLUMN subscription_enabled INTEGER NOT NULL DEFAULT 0');
  }
  if (!settingsColumnNames.has('platform_fee_enabled')) {
    getDb().run('ALTER TABLE app_settings ADD COLUMN platform_fee_enabled INTEGER NOT NULL DEFAULT 1');
  }
  if (!settingsColumnNames.has('platform_fee')) {
    getDb().run('ALTER TABLE app_settings ADD COLUMN platform_fee REAL NOT NULL DEFAULT 5');
  }
  if (!settingsColumnNames.has('referral_enabled')) {
    getDb().run('ALTER TABLE app_settings ADD COLUMN referral_enabled INTEGER NOT NULL DEFAULT 1');
  }
  if (!settingsColumnNames.has('referral_reward_amount')) {
    getDb().run('ALTER TABLE app_settings ADD COLUMN referral_reward_amount REAL NOT NULL DEFAULT 50');
  }
  const settingsRow = queryOne('SELECT id FROM app_settings WHERE id = 1');
  if (!settingsRow) {
    getDb().run(
      `INSERT INTO app_settings (id, delivery_cutoff, delivery_slot, min_order_value, delivery_fee, wallet_enabled, subscription_enabled, platform_fee_enabled, platform_fee)
       VALUES (1, '11:00 PM', 'Tomorrow, 6:00 AM – 8:00 AM', 299, 30, 0, 0, 1, 5)`
    );
  } else {
    getDb().run(
      `UPDATE app_settings
       SET platform_fee_enabled = COALESCE(platform_fee_enabled, 1),
           platform_fee = COALESCE(platform_fee, 5),
           referral_enabled = COALESCE(referral_enabled, 1),
           referral_reward_amount = COALESCE(referral_reward_amount, 50)
       WHERE id = 1`
    );
  }

  ensureAllCustomerReferralCodes();

  const orderColumns = queryAll('PRAGMA table_info(orders)');
  const orderColumnNames = new Set(orderColumns.map((col) => col.name));
  if (!orderColumnNames.has('delivery_fee')) {
    getDb().run('ALTER TABLE orders ADD COLUMN delivery_fee REAL');
  }
  if (!orderColumnNames.has('platform_fee')) {
    getDb().run('ALTER TABLE orders ADD COLUMN platform_fee REAL');
  }
  if (!orderColumnNames.has('promo_code')) {
    getDb().run('ALTER TABLE orders ADD COLUMN promo_code TEXT');
  }
  if (!orderColumnNames.has('promo_discount')) {
    getDb().run('ALTER TABLE orders ADD COLUMN promo_discount REAL');
  }

  getDb().exec(`
    CREATE TABLE IF NOT EXISTS promo_codes (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      description TEXT,
      discount_type TEXT NOT NULL,
      discount_value REAL NOT NULL,
      min_order_value REAL NOT NULL DEFAULT 0,
      max_discount REAL,
      usage_limit INTEGER,
      used_count INTEGER NOT NULL DEFAULT 0,
      expires_at TEXT,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
  ensureDemoPromoCodes();

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
  if (!productColumnNames.has('wholesale_price')) {
    getDb().run('ALTER TABLE products ADD COLUMN wholesale_price REAL');
  }
  if (!productColumnNames.has('store_type')) {
    getDb().run('ALTER TABLE products ADD COLUMN store_type TEXT');
  }

  const orderItemColumns = queryAll('PRAGMA table_info(order_items)');
  const orderItemColumnNames = new Set(orderItemColumns.map((col) => col.name));
  if (!orderItemColumnNames.has('wholesale_price')) {
    getDb().run('ALTER TABLE order_items ADD COLUMN wholesale_price REAL');
  }
  if (!orderItemColumnNames.has('wholesaler_id')) {
    getDb().run('ALTER TABLE order_items ADD COLUMN wholesaler_id TEXT');
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
  repairDemoOrderLineItems({ queryOne, queryAll, run, getDb });
  migrateCodPaymentStatus();
  migrateWholesalers();
  migrateRiders();
  ensureDemoUsers();
  await ensureDemoOrder();
  await backfillWholesalerAssignments();
  backfillRiderAssignments();
}

function migrateRiders() {
  getDb().exec(`
    CREATE TABLE IF NOT EXISTS riders (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT,
      vehicle_type TEXT NOT NULL DEFAULT 'bike',
      pincode TEXT NOT NULL,
      active INTEGER NOT NULL DEFAULT 1,
      deliveries_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  ensureDemoRiders();
}

function backfillRiderAssignments() {
  const orders = queryAll(
    `SELECT id, user_id FROM orders
     WHERE rider_id IS NULL
       AND status NOT IN ('cancelled', 'delivered')`
  );
  orders.forEach((order) => {
    if (isOrderReadyForRider(order.id)) {
      tryAutoAssignRider(order.id, order.user_id);
    }
  });
}

function migrateWholesalers() {
  getDb().exec(`
    CREATE TABLE IF NOT EXISTS wholesalers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      shop_name TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT,
      address TEXT,
      store_type TEXT NOT NULL DEFAULT 'general',
      settlement_cycle TEXT NOT NULL DEFAULT 'weekly',
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS wholesaler_pincodes (
      wholesaler_id TEXT NOT NULL,
      pincode TEXT NOT NULL,
      active INTEGER NOT NULL DEFAULT 1,
      PRIMARY KEY (wholesaler_id, pincode)
    );
    CREATE TABLE IF NOT EXISTS order_vendor_tasks (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      wholesaler_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'assigned',
      wholesale_cost REAL NOT NULL DEFAULT 0,
      item_count INTEGER NOT NULL DEFAULT 0,
      notified_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  const wholesalerColumns = queryAll('PRAGMA table_info(wholesalers)');
  const wholesalerColumnNames = new Set(wholesalerColumns.map((col) => col.name));
  if (!wholesalerColumnNames.has('store_type')) {
    getDb().run("ALTER TABLE wholesalers ADD COLUMN store_type TEXT NOT NULL DEFAULT 'general'");
  }

  const demoStores = [
    {
      shopName: 'Ravi General Store',
      name: 'Ravi Kumar',
      phone: '+91 91234 56789',
      email: 'ravi.wholesale@example.com',
      address: 'Main Road, Addanki',
      storeType: 'general',
      userEmail: 'ravi.wholesale@example.com',
    },
    {
      shopName: 'Addanki Vegetable Store',
      name: 'Srinivas Rao',
      phone: '+91 91234 56780',
      email: 'addanki-veg@example.com',
      address: 'Market Road, Addanki',
      storeType: 'vegetables',
      userEmail: 'addanki-veg@example.com',
    },
    {
      shopName: 'Milk & Bread Store',
      name: 'Lakshmi Devi',
      phone: '+91 91234 56781',
      email: 'addanki-milk@example.com',
      address: 'Station Road, Addanki',
      storeType: 'milk_bread',
      userEmail: 'addanki-milk@example.com',
    },
  ];

  demoStores.forEach((store) => {
    let row = queryOne('SELECT id FROM wholesalers WHERE shop_name = ?', [store.shopName]);
    if (!row) {
      const id = randomUUID();
      getDb().run(
        `INSERT INTO wholesalers (id, name, shop_name, phone, email, address, store_type, settlement_cycle, active)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'weekly', 1)`,
        [id, store.name, store.shopName, store.phone, store.email, store.address, store.storeType]
      );
      row = { id };
    } else {
      getDb().run(
        'UPDATE wholesalers SET store_type = ?, phone = ?, email = ?, active = 1 WHERE id = ?',
        [store.storeType, store.phone, store.email, row.id]
      );
    }

    getDb().run(
      'INSERT OR IGNORE INTO wholesaler_pincodes (wholesaler_id, pincode, active) VALUES (?, ?, 1)',
      [row.id, '523201']
    );

    if (store.userEmail) {
      getDb().run('UPDATE users SET wholesaler_id = ? WHERE email = ?', [row.id, store.userEmail]);
    }
  });

  getDb().run(
    `UPDATE products SET store_type = 'milk_bread'
     WHERE store_type IS NULL AND category_id IN ('milk', 'eggs', 'bread', 'breakfast', 'beverages', 'tea-coffee')`
  );
  getDb().run(
    `UPDATE products SET store_type = 'vegetables'
     WHERE store_type IS NULL AND category_id IN ('fruits', 'vegetables', 'organic')`
  );
  getDb().run(
    `UPDATE products SET store_type = 'general'
     WHERE store_type IS NULL OR store_type = ''`
  );
}

async function backfillWholesalerAssignments() {
  const pending = queryAll(
    `SELECT id, user_id FROM orders WHERE status NOT IN ('cancelled')`
  );
  for (const order of pending) {
    await assignOrderToWholesaler(order.id, order.user_id);
  }
}

function migrateCodPaymentStatus() {
  getDb().run(
    `UPDATE orders
     SET payment_status = 'pending'
     WHERE payment_method = 'cod'
       AND status != 'delivered'
       AND payment_status IN ('cod', 'paid')`
  );
  getDb().run(
    `UPDATE orders
     SET payment_status = 'paid'
     WHERE payment_method = 'cod' AND status = 'delivered'`
  );
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
  [DEMO_ORDER_ID]: DEMO_ORDER_LINE_ITEMS,
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
  return getDb().native.prepare(sql).all(...bindParams(params));
}

export function queryOne(sql, params = []) {
  return getDb().native.prepare(sql).get(...bindParams(params)) ?? null;
}

export function run(sql, params = []) {
  getDb().run(sql, params);
}

export function transaction(fn) {
  const wrapped = getDb().native.transaction(fn);
  wrapped();
}
