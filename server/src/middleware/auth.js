import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'milkbasket-dev-secret-change-in-production';

export function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, name: user.name },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

export function authRequired(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const token = header.slice(7);
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function adminRequired(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

export function formatUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    role: row.role,
    location: row.location,
    walletBalance: row.wallet_balance,
    active: !!row.active,
    ordersCount: row.orders_count ?? 0,
    createdAt: row.created_at,
  };
}

export function formatProduct(row) {
  return {
    id: row.id,
    name: row.name,
    brand: row.brand,
    categoryId: row.category_id,
    subCategoryId: row.sub_category_id,
    price: row.price,
    mrp: row.mrp,
    unit: row.unit,
    image: row.image,
    subscription: !!row.subscription,
    tag: row.tag,
    stock: row.stock,
    active: !!row.active,
  };
}
