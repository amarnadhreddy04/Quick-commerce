import bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';

import { initDatabase, queryOne, run, transaction } from './db.js';
import { BANNER_IMAGES, CATEGORY_IMAGES, PRODUCT_IMAGE_SETS } from './mediaUrls.js';

await initDatabase();

const userCount = queryOne('SELECT COUNT(*) as count FROM users').count;
if (userCount > 0) {
  console.log('Database already seeded.');
  process.exit(0);
}

const hash = (password) => bcrypt.hashSync(password, 10);

const categories = [
  ['milk', 'Milk', 'water', '#DBEAFE', CATEGORY_IMAGES.milk, 'Fresh milk delivered every morning.'],
  ['bread', 'Bread', 'restaurant', '#FEF3C7', CATEGORY_IMAGES.bread, 'Bakery-fresh breads and buns.'],
  ['eggs', 'Eggs', 'egg', '#FFEDD5', CATEGORY_IMAGES.eggs, 'Farm-fresh eggs for your daily meals.'],
  ['fruits', 'Fruits', 'leaf', '#DCFCE7', CATEGORY_IMAGES.fruits, 'Seasonal fruits picked for freshness.'],
  ['vegetables', 'Vegetables', 'nutrition', '#D1FAE5', CATEGORY_IMAGES.vegetables, 'Daily vegetables from local farms.'],
  ['beverages', 'Beverages', 'cafe', '#E0E7FF', CATEGORY_IMAGES.beverages, 'Juices, tea, coffee and health drinks.'],
  ['snacks', 'Snacks', 'fast-food', '#FCE7F3', CATEGORY_IMAGES.snacks, 'Chips, biscuits and quick bites.'],
  ['breakfast', 'Breakfast', 'sunny', '#FEF9C3', CATEGORY_IMAGES.breakfast, 'Oats, cereals and breakfast essentials.'],
];

transaction(() => {
  categories.forEach(([id, name, icon, color, thumb, description]) => {
    run(
      'INSERT INTO categories (id, name, icon, color, thumbnail, description) VALUES (?, ?, ?, ?, ?, ?)',
      [id, name, icon, color, thumb, description]
    );
  });

  const subs = [
    ['toned', 'milk', 'Toned Milk'],
    ['full-cream', 'milk', 'Full Cream'],
    ['organic', 'milk', 'Organic'],
    ['brown', 'bread', 'Brown Bread'],
    ['farm', 'eggs', 'Farm Fresh'],
    ['seasonal', 'fruits', 'Seasonal'],
    ['root', 'vegetables', 'Root Veg'],
    ['juice', 'beverages', 'Juices'],
    ['chips', 'snacks', 'Chips'],
    ['oats', 'breakfast', 'Oats'],
  ];
  subs.forEach(([id, cat, name]) => {
    run('INSERT INTO sub_categories (id, category_id, name) VALUES (?, ?, ?)', [id, cat, name]);
  });

  const products = [
    ['p1', 'Toned Milk', 'Amul', 'milk', 'toned', 28, 30, '500 ml', PRODUCT_IMAGE_SETS.p1, 'Pasteurized toned milk, perfect for daily tea and coffee.', 1, 'Daily Essential', 120],
    ['p2', 'Full Cream Milk', 'Mother Dairy', 'milk', 'full-cream', 34, 36, '500 ml', PRODUCT_IMAGE_SETS.p2, 'Rich and creamy full-cream milk for the whole family.', 1, null, 85],
    ['p3', 'Brown Bread', 'Britannia', 'bread', 'brown', 45, 50, '400 g', PRODUCT_IMAGE_SETS.p3, 'Soft brown bread baked fresh for a healthy breakfast.', 0, 'Fresh Today', 60],
    ['p5', 'Farm Fresh Eggs', 'Eggoz', 'eggs', 'farm', 72, 80, '6 pcs', PRODUCT_IMAGE_SETS.p5, 'Protein-rich farm eggs with bright yolks.', 1, null, 95],
    ['p6', 'Banana', 'Fresh', 'fruits', 'seasonal', 48, null, '6 pcs', PRODUCT_IMAGE_SETS.p6, 'Naturally ripened bananas, sweet and ready to eat.', 0, null, 70],
    ['p8', 'Tomato', 'Fresh', 'fruits', 'leafy', 32, null, '500 g', PRODUCT_IMAGE_SETS.p8, 'Juicy red tomatoes for curries, salads and chutneys.', 0, null, 55],
    ['p12', 'Potato Chips', 'Lays', 'snacks', 'chips', 20, null, '52 g', PRODUCT_IMAGE_SETS.p12, 'Classic salted potato chips for quick snacking.', 0, null, 100],
  ];
  products.forEach(([id, name, brand, cat, sub, price, mrp, unit, images, description, sub_flag, tag, stock]) => {
    run(
      `INSERT INTO products (id, name, brand, category_id, sub_category_id, price, mrp, unit, image, images, description, subscription, tag, stock, active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [id, name, brand, cat, sub, price, mrp, unit, images[0], JSON.stringify(images), description, sub_flag, tag, stock]
    );
  });

  run(
    `INSERT INTO promo_banners (id, category_id, title, subtitle, cta, emojis, slide, total)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ['b-milk', 'milk', 'Up To 40% Off', 'On Amul & Mother Dairy Milk', 'Buy Now', JSON.stringify(BANNER_IMAGES['b-milk']), 3, 12]
  );

  const adminId = uuid();
  const customerId = uuid();

  run(
    `INSERT INTO users (id, name, email, phone, password_hash, role, location, wallet_balance, active)
     VALUES (?, ?, ?, ?, ?, 'admin', ?, 0, 1)`,
    [adminId, 'Milkbasket Admin', 'admin@milkbasket.com', '+91 90000 00001', hash('admin123'), 'Noida HQ']
  );

  run(
    `INSERT INTO users (id, name, email, phone, password_hash, role, location, pincode, wallet_balance, active)
     VALUES (?, ?, ?, ?, ?, 'customer', ?, ?, 248.5, 1)`,
    [customerId, 'Amar Kumar', 'amar@example.com', '+91 98765 43210', hash('user123'), 'Addanki, Andhra Pradesh', '523201']
  );

  run(
    `INSERT INTO orders (id, user_id, date, status, total, delivery_slot, items_count)
     VALUES (?, ?, ?, 'scheduled', ?, ?, ?)`,
    ['MB-10482', customerId, '7 Jun 2026', 312, 'Tomorrow, 6:00 AM', 5]
  );

  [
    ['p1', 2, 28],
    ['p3', 1, 45],
    ['p5', 1, 72],
    ['p6', 1, 48],
    ['p8', 2, 32],
  ].forEach(([productId, quantity, price]) => {
    run(
      'INSERT INTO order_items (id, order_id, product_id, quantity, price) VALUES (?, ?, ?, ?, ?)',
      [uuid(), 'MB-10482', productId, quantity, price]
    );
  });

  run(
    `INSERT INTO app_settings (id, delivery_cutoff, delivery_slot, min_order_value, delivery_fee, wallet_enabled)
     VALUES (1, ?, ?, ?, ?, 0)`,
    ['11:00 PM', 'Tomorrow, 6:00 AM – 8:00 AM', 299, 30]
  );

  run(
    `INSERT INTO service_areas (id, name, latitude, longitude, radius_km, active)
     VALUES (?, ?, ?, ?, ?, 1)`,
    [uuid(), 'Addanki', 15.8097, 79.9813, 15]
  );
});

console.log('Database seeded successfully.');
console.log('Admin: admin@milkbasket.com / admin123');
console.log('User:  amar@example.com / user123');
