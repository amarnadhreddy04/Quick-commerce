import { Router } from 'express';

import { queryAll, queryOne, run } from '../../../shared/src/db.js';
import {
  categoryPincodeClause,
  getCategoryPincodes,
  getProductPincodes,
  productPincodeClause,
  saveCategoryPincodes,
  saveProductPincodes,
  withLocationMeta,
} from '../../../shared/src/locationCatalog.js';
import {
  adminRequired,
  authRequired,
  formatCategory,
  formatProduct,
  optionalAuth,
} from '../../../shared/src/middleware/auth.js';
import { getPanelPincode } from '../../../shared/src/panelAccess.js';
import { prepareProductImagesPayload } from '../../../shared/src/productImages.js';
import { resolveStoreType } from '../../../shared/src/storeTypes.js';
import {
  getStockNotifyStatus,
  maybeNotifyRestocked,
  subscribeStockNotify,
  unsubscribeStockNotify,
} from '../../../shared/src/stockNotify.js';
import { publishSyncEvent } from '../../../shared/src/sync/publish.js';

const router = Router();

function formatCategoryWithLocations(row) {
  return withLocationMeta(formatCategory(row), getCategoryPincodes(row.id));
}

function formatProductWithLocations(row) {
  return withLocationMeta(formatProduct(row), getProductPincodes(row.id));
}

function resolveCatalogPincode(req) {
  if (req.user?.role === 'location_admin') {
    return getPanelPincode(req.user);
  }
  return typeof req.query.pincode === 'string' ? req.query.pincode : undefined;
}

router.get('/categories', optionalAuth, (req, res) => {
  const pincode = resolveCatalogPincode(req);
  let sql = 'SELECT c.* FROM categories c WHERE COALESCE(c.sort_order, 0) < 999';
  const params = [];

  const categoryClause = categoryPincodeClause('c', pincode);
  sql += categoryClause.sql;
  params.push(...categoryClause.params);

  if (pincode) {
    const productClause = productPincodeClause('p', pincode);
    sql += ` AND EXISTS (
      SELECT 1 FROM products p
      WHERE p.category_id = c.id AND p.active = 1
      ${productClause.sql.replace(/^ AND /, ' AND ')}
    )`;
    params.push(...productClause.params);
  }

  sql += ' ORDER BY COALESCE(c.sort_order, 999), c.name';
  const categories = queryAll(sql, params);
  res.json({
    categories: categories.map(formatCategoryWithLocations),
  });
});

router.post('/categories', authRequired, adminRequired, async (req, res) => {
  const { name, icon, color, thumbnail, description } = req.body;
  const id = req.body.id || name.toLowerCase().replace(/\s+/g, '-');
  run(
    'INSERT INTO categories (id, name, icon, color, thumbnail, description) VALUES (?, ?, ?, ?, ?, ?)',
    [id, name, icon ?? 'grid', color ?? '#E8F5EE', thumbnail ?? '', description ?? '']
  );
  if (Array.isArray(req.body.pincodes)) {
    saveCategoryPincodes(id, req.body.pincodes);
  }

  const category = queryOne('SELECT * FROM categories WHERE id = ?', [id]);
  await publishSyncEvent({ domain: 'catalog', action: 'created', entity: 'category', id });
  res.status(201).json({ category: formatCategoryWithLocations(category) });
});

router.put('/categories/:id', authRequired, adminRequired, async (req, res) => {
  const existing = queryOne('SELECT * FROM categories WHERE id = ?', [req.params.id]);
  if (!existing) return res.status(404).json({ error: 'Category not found' });

  const category = { ...formatCategory(existing), ...req.body };
  run(
    'UPDATE categories SET name=?, icon=?, color=?, thumbnail=?, description=? WHERE id=?',
    [
      category.name,
      category.icon ?? 'grid',
      category.color ?? '#E8F5EE',
      category.thumbnail ?? '',
      category.description ?? '',
      req.params.id,
    ]
  );
  if (Array.isArray(req.body.pincodes)) {
    saveCategoryPincodes(req.params.id, req.body.pincodes);
  }

  const updated = queryOne('SELECT * FROM categories WHERE id = ?', [req.params.id]);
  await publishSyncEvent({ domain: 'catalog', action: 'updated', entity: 'category', id: req.params.id });
  res.json({ category: formatCategoryWithLocations(updated) });
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

router.get('/products', optionalAuth, (req, res) => {
  const { categoryId, subCategoryId, activeOnly } = req.query;
  const pincode = resolveCatalogPincode(req);
  let sql = 'SELECT p.* FROM products p WHERE 1=1';
  const params = [];

  if (categoryId) {
    sql += ' AND p.category_id = ?';
    params.push(categoryId);
  }
  if (subCategoryId) {
    sql += ' AND p.sub_category_id = ?';
    params.push(subCategoryId);
  }
  if (activeOnly === 'true') {
    sql += ' AND p.active = 1';
  }

  const productClause = productPincodeClause('p', pincode);
  sql += productClause.sql;
  params.push(...productClause.params);

  if (pincode) {
    const categoryClause = categoryPincodeClause('c', pincode);
    sql += ` AND EXISTS (
      SELECT 1 FROM categories c
      WHERE c.id = p.category_id
      ${categoryClause.sql.replace(/^ AND /, ' AND ')}
    )`;
    params.push(...categoryClause.params);
  }

  const products = queryAll(sql, params);
  res.json({ products: products.map(formatProductWithLocations) });
});

router.get('/products/:productId/stock-notify', authRequired, (req, res) => {
  const status = getStockNotifyStatus(req.user.id, req.params.productId);
  res.json(status);
});

router.post('/products/:productId/stock-notify', authRequired, (req, res) => {
  const result = subscribeStockNotify(req.user.id, req.params.productId);
  if (!result.ok) {
    return res.status(400).json({ error: result.error });
  }
  res.status(201).json({ subscribed: true, alreadySubscribed: !!result.alreadySubscribed });
});

router.delete('/products/:productId/stock-notify', authRequired, (req, res) => {
  unsubscribeStockNotify(req.user.id, req.params.productId);
  res.json({ subscribed: false });
});

router.post('/products', authRequired, adminRequired, async (req, res) => {
  const p = req.body;
  const prepared = prepareProductImagesPayload(p);
  if (prepared.error) {
    return res.status(400).json({ error: prepared.error });
  }

  const id = p.id || `p${Date.now()}`;
  const storeType = resolveStoreType({ storeType: p.storeType, categoryId: p.categoryId });
  run(
    `INSERT INTO products (id, name, brand, category_id, sub_category_id, price, mrp, unit, image, images, description, subscription, tag, stock, active, store_type)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      p.name,
      p.brand,
      p.categoryId,
      p.subCategoryId ?? null,
      p.price,
      p.mrp ?? null,
      p.unit,
      prepared.image,
      JSON.stringify(prepared.images),
      p.description ?? '',
      p.subscription ? 1 : 0,
      p.tag ?? null,
      p.stock ?? 0,
      p.active === false ? 0 : 1,
      storeType,
    ]
  );
  if (Array.isArray(p.pincodes)) {
    saveProductPincodes(id, p.pincodes);
  }

  const product = queryOne('SELECT * FROM products WHERE id = ?', [id]);
  await publishSyncEvent({ domain: 'catalog', action: 'created', entity: 'product', id });
  res.status(201).json({ product: formatProductWithLocations(product) });
});

router.put('/products/:id', authRequired, adminRequired, async (req, res) => {
  const existing = queryOne('SELECT * FROM products WHERE id = ?', [req.params.id]);
  if (!existing) return res.status(404).json({ error: 'Product not found' });

  const merged = { ...formatProduct(existing), ...req.body };
  const prepared = prepareProductImagesPayload(merged);
  if (prepared.error) {
    return res.status(400).json({ error: prepared.error });
  }

  const storeType = resolveStoreType({
    storeType: merged.storeType,
    categoryId: merged.categoryId,
  });
  run(
    `UPDATE products SET name=?, brand=?, category_id=?, sub_category_id=?, price=?, mrp=?, unit=?, image=?, images=?, description=?, subscription=?, tag=?, stock=?, active=?, store_type=?
     WHERE id=?`,
    [
      merged.name,
      merged.brand,
      merged.categoryId,
      merged.subCategoryId ?? null,
      merged.price,
      merged.mrp ?? null,
      merged.unit,
      prepared.image,
      JSON.stringify(prepared.images),
      merged.description ?? '',
      merged.subscription ? 1 : 0,
      merged.tag ?? null,
      merged.stock ?? 0,
      merged.active === false ? 0 : 1,
      storeType,
      req.params.id,
    ]
  );
  if (Array.isArray(req.body.pincodes)) {
    saveProductPincodes(req.params.id, req.body.pincodes);
  }

  const product = queryOne('SELECT * FROM products WHERE id = ?', [req.params.id]);
  await publishSyncEvent({ domain: 'catalog', action: 'updated', entity: 'product', id: req.params.id });
  maybeNotifyRestocked(existing.stock, merged.stock ?? 0, req.params.id, merged.name).catch((error) => {
    console.warn('[catalog] Stock notify failed:', error.message);
  });
  res.json({ product: formatProductWithLocations(product) });
});

router.delete('/products/:id', authRequired, adminRequired, async (req, res) => {
  run('DELETE FROM products WHERE id = ?', [req.params.id]);
  await publishSyncEvent({ domain: 'catalog', action: 'deleted', entity: 'product', id: req.params.id });
  res.json({ success: true });
});

export default router;
