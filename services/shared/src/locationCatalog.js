import { queryAll, run } from './db.js';

function normalizePincode(pincode) {
  const digits = String(pincode ?? '').replace(/\D/g, '');
  return digits.length === 6 ? digits : null;
}

export function getProductPincodes(productId) {
  return queryAll(
    'SELECT pincode FROM product_pincodes WHERE product_id = ? AND active = 1 ORDER BY pincode',
    [productId]
  ).map((row) => row.pincode);
}

export function getCategoryPincodes(categoryId) {
  return queryAll(
    'SELECT pincode FROM category_pincodes WHERE category_id = ? AND active = 1 ORDER BY pincode',
    [categoryId]
  ).map((row) => row.pincode);
}

export function saveProductPincodes(productId, pincodes = []) {
  run('DELETE FROM product_pincodes WHERE product_id = ?', [productId]);
  const cleaned = [...new Set(pincodes.map((item) => normalizePincode(item)).filter(Boolean))];
  cleaned.forEach((pincode) => {
    run(
      'INSERT INTO product_pincodes (product_id, pincode, active) VALUES (?, ?, 1)',
      [productId, pincode]
    );
  });
}

export function saveCategoryPincodes(categoryId, pincodes = []) {
  run('DELETE FROM category_pincodes WHERE category_id = ?', [categoryId]);
  const cleaned = [...new Set(pincodes.map((item) => normalizePincode(item)).filter(Boolean))];
  cleaned.forEach((pincode) => {
    run(
      'INSERT INTO category_pincodes (category_id, pincode, active) VALUES (?, ?, 1)',
      [categoryId, pincode]
    );
  });
}

export function withLocationMeta(entity, pincodes) {
  return {
    ...entity,
    pincodes,
    allLocations: pincodes.length === 0,
  };
}

export function productPincodeClause(alias = 'p', pincode) {
  const normalized = normalizePincode(pincode);
  if (!normalized) {
    return { sql: '', params: [] };
  }

  return {
    sql: ` AND (
      NOT EXISTS (SELECT 1 FROM product_pincodes pp WHERE pp.product_id = ${alias}.id)
      OR EXISTS (
        SELECT 1 FROM product_pincodes pp
        WHERE pp.product_id = ${alias}.id AND pp.pincode = ? AND pp.active = 1
      )
    )`,
    params: [normalized],
  };
}

export function categoryPincodeClause(alias = 'c', pincode) {
  const normalized = normalizePincode(pincode);
  if (!normalized) {
    return { sql: '', params: [] };
  }

  return {
    sql: ` AND (
      NOT EXISTS (SELECT 1 FROM category_pincodes cp WHERE cp.category_id = ${alias}.id)
      OR EXISTS (
        SELECT 1 FROM category_pincodes cp
        WHERE cp.category_id = ${alias}.id AND cp.pincode = ? AND cp.active = 1
      )
    )`,
    params: [normalized],
  };
}
