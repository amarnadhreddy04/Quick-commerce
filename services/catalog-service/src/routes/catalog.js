import { Router } from 'express';

import { queryAll, queryOne, run } from '../../../shared/src/db.js';
import { adminRequired, authRequired, formatProduct } from '../../../shared/src/middleware/auth.js';
import { publishSyncEvent } from '../../../shared/src/sync/publish.js';

const router = Router();

router.get('/categories', (_req, res) => {
  const categories = queryAll('SELECT * FROM categories ORDER BY name');
  res.json({
    categories: categories.map((c) => ({
      id: c.id,
      name: c.name,
      icon: c.icon,
      color: c.color,
      thumbnail: c.thumbnail,
    })),
  });
});

router.post('/categories', authRequired, adminRequired, async (req, res) => {
  const { name, icon, color, thumbnail } = req.body;
  const id = req.body.id || name.toLowerCase().replace(/\s+/g, '-');
  run(
    'INSERT INTO categories (id, name, icon, color, thumbnail) VALUES (?, ?, ?, ?, ?)',
    [id, name, icon ?? 'grid', color ?? '#E8F5EE', thumbnail ?? '📦']
  );
  const category = queryOne('SELECT * FROM categories WHERE id = ?', [id]);
  await publishSyncEvent({ domain: 'catalog', action: 'created', entity: 'category', id });
  res.status(201).json({ category });
});

router.delete('/categories/:id', authRequired, adminRequired, async (req, res) => {
  run('DELETE FROM categories WHERE id = ?', [req.params.id]);
  await publishSyncEvent({ domain: 'catalog', action: 'deleted', entity: 'category', id: req.params.id });
  res.json({ success: true });
});

router.get('/sub-categories', (req, res) => {
  const { categoryId } = req.query;
  const rows = categoryId
    ? queryAll('SELECT * FROM sub_categories WHERE category_id = ?', [categoryId])
    : queryAll('SELECT * FROM sub_categories');
  res.json({
    subCategories: rows.map((s) => ({
      id: s.id,
      categoryId: s.category_id,
      name: s.name,
    })),
  });
});

router.get('/banners', (req, res) => {
  const { categoryId } = req.query;
  const rows = categoryId
    ? queryAll('SELECT * FROM promo_banners WHERE category_id = ?', [categoryId])
    : queryAll('SELECT * FROM promo_banners');
  res.json({
    banners: rows.map((b) => ({
      id: b.id,
      categoryId: b.category_id,
      title: b.title,
      subtitle: b.subtitle,
      cta: b.cta,
      emojis: JSON.parse(b.emojis || '[]'),
      slide: b.slide,
      total: b.total,
    })),
  });
});

router.get('/products', (req, res) => {
  const { categoryId, subCategoryId, activeOnly } = req.query;
  let sql = 'SELECT * FROM products WHERE 1=1';
  const params = [];

  if (categoryId) {
    sql += ' AND category_id = ?';
    params.push(categoryId);
  }
  if (subCategoryId) {
    sql += ' AND sub_category_id = ?';
    params.push(subCategoryId);
  }
  if (activeOnly === 'true') {
    sql += ' AND active = 1';
  }

  const products = queryAll(sql, params);
  res.json({ products: products.map(formatProduct) });
});

router.post('/products', authRequired, adminRequired, async (req, res) => {
  const p = req.body;
  const id = p.id || `p${Date.now()}`;
  run(
    `INSERT INTO products (id, name, brand, category_id, sub_category_id, price, mrp, unit, image, subscription, tag, stock, active)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      p.name,
      p.brand,
      p.categoryId,
      p.subCategoryId ?? null,
      p.price,
      p.mrp ?? null,
      p.unit,
      p.image ?? '📦',
      p.subscription ? 1 : 0,
      p.tag ?? null,
      p.stock ?? 0,
      p.active === false ? 0 : 1,
    ]
  );
  const product = queryOne('SELECT * FROM products WHERE id = ?', [id]);
  await publishSyncEvent({ domain: 'catalog', action: 'created', entity: 'product', id });
  res.status(201).json({ product: formatProduct(product) });
});

router.put('/products/:id', authRequired, adminRequired, async (req, res) => {
  const existing = queryOne('SELECT * FROM products WHERE id = ?', [req.params.id]);
  if (!existing) return res.status(404).json({ error: 'Product not found' });

  const p = { ...formatProduct(existing), ...req.body };
  run(
    `UPDATE products SET name=?, brand=?, category_id=?, sub_category_id=?, price=?, mrp=?, unit=?, image=?, subscription=?, tag=?, stock=?, active=?
     WHERE id=?`,
    [
      p.name,
      p.brand,
      p.categoryId,
      p.subCategoryId ?? null,
      p.price,
      p.mrp ?? null,
      p.unit,
      p.image,
      p.subscription ? 1 : 0,
      p.tag ?? null,
      p.stock ?? 0,
      p.active === false ? 0 : 1,
      req.params.id,
    ]
  );
  const product = queryOne('SELECT * FROM products WHERE id = ?', [req.params.id]);
  await publishSyncEvent({ domain: 'catalog', action: 'updated', entity: 'product', id: req.params.id });
  res.json({ product: formatProduct(product) });
});

router.delete('/products/:id', authRequired, adminRequired, async (req, res) => {
  run('DELETE FROM products WHERE id = ?', [req.params.id]);
  await publishSyncEvent({ domain: 'catalog', action: 'deleted', entity: 'product', id: req.params.id });
  res.json({ success: true });
});

export default router;
