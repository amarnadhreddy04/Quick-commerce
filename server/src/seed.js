import bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';

import { initDatabase, queryOne, run, transaction } from './db.js';

await initDatabase();

const categoryCount = queryOne('SELECT COUNT(*) as count FROM categories').count;
if (categoryCount > 0) {
  console.log('Database already seeded.');
  process.exit(0);
}

const hash = (password) => bcrypt.hashSync(password, 10);

const categories = [
  ['milk', 'Milk', 'water', '#DBEAFE', '🥛'],
  ['bread', 'Bread', 'restaurant', '#FEF3C7', '🍞'],
  ['eggs', 'Eggs', 'egg', '#FFEDD5', '🥚'],
  ['fruits', 'Fruits', 'leaf', '#DCFCE7', '🍎'],
  ['vegetables', 'Vegetables', 'nutrition', '#D1FAE5', '🥬'],
  ['beverages', 'Beverages', 'cafe', '#E0E7FF', '🧃'],
  ['snacks', 'Snacks', 'fast-food', '#FCE7F3', '🍿'],
  ['breakfast', 'Breakfast', 'sunny', '#FEF9C3', '🥣'],
];

transaction(() => {
  categories.forEach(([id, name, icon, color, thumb]) => {
    run(
      'INSERT INTO categories (id, name, icon, color, thumbnail) VALUES (?, ?, ?, ?, ?)',
      [id, name, icon, color, thumb]
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
    ['p1', 'Toned Milk', 'Amul', 'milk', 'toned', 28, 30, '500 ml', '🥛', 1, 'Daily Essential', 120],
    ['p2', 'Full Cream Milk', 'Mother Dairy', 'milk', 'full-cream', 34, 36, '500 ml', '🥛', 1, null, 85],
    ['p3', 'Brown Bread', 'Britannia', 'bread', 'brown', 45, 50, '400 g', '🍞', 0, 'Fresh Today', 60],
    ['p5', 'Farm Fresh Eggs', 'Eggoz', 'eggs', 'farm', 72, 80, '6 pcs', '🥚', 1, null, 95],
    ['p6', 'Banana', 'Fresh', 'fruits', 'seasonal', 48, null, '6 pcs', '🍌', 0, null, 70],
    ['p8', 'Tomato', 'Fresh', 'vegetables', 'root', 32, null, '500 g', '🍅', 0, null, 55],
    ['p12', 'Potato Chips', 'Lays', 'snacks', 'chips', 20, null, '52 g', '🥔', 0, null, 100],
  ];
  products.forEach(([id, name, brand, cat, sub, price, mrp, unit, image, sub_flag, tag, stock]) => {
    run(
      `INSERT INTO products (id, name, brand, category_id, sub_category_id, price, mrp, unit, image, subscription, tag, stock, active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [id, name, brand, cat, sub, price, mrp, unit, image, sub_flag, tag, stock]
    );
  });

  run(
    `INSERT INTO promo_banners (id, category_id, title, subtitle, cta, emojis, slide, total)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ['b-milk', 'milk', 'Up To 40% Off', 'On Amul & Mother Dairy Milk', 'Buy Now', '["🥛","🥛"]', 3, 12]
  );

  const adminId = uuid();
  const customerId = uuid();

  run(
    `INSERT INTO users (id, name, email, phone, password_hash, role, location, wallet_balance, active)
     VALUES (?, ?, ?, ?, ?, 'admin', ?, 0, 1)`,
    [adminId, 'Pachari Admin', 'admin@milkbasket.com', '+91 90000 00001', hash('admin123'), 'Noida HQ']
  );

  run(
    `INSERT INTO users (id, name, email, phone, password_hash, role, location, wallet_balance, active)
     VALUES (?, ?, ?, ?, ?, 'customer', ?, 248.5, 1)`,
    [customerId, 'Amar Kumar', 'amar@example.com', '+91 98765 43210', hash('user123'), 'Sector 62, Noida']
  );

  run(
    `INSERT INTO orders (id, user_id, date, status, total, delivery_slot, items_count)
     VALUES (?, ?, ?, 'scheduled', ?, ?, ?)`,
    ['MB-10482', customerId, '7 Jun 2026', 312, 'Tomorrow, 6:00 AM', 5]
  );

  run(
    `INSERT INTO app_settings (id, delivery_cutoff, delivery_slot, min_order_value, delivery_fee)
     VALUES (1, ?, ?, ?, ?)`,
    ['11:00 PM', 'Tomorrow, 6:00 AM – 8:00 AM', 299, 30]
  );
});

console.log('Database seeded successfully.');
console.log('Admin: admin@milkbasket.com / admin123');
console.log('User:  amar@example.com / user123');
