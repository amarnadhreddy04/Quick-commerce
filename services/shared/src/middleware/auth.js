import jwt from 'jsonwebtoken';

import { isPanelRole, isRider, isSuperAdmin } from '../panelAccess.js';
import { formatProductImagesRow } from '../productImages.js';

const JWT_SECRET = process.env.JWT_SECRET || 'milkbasket-dev-secret-change-in-production';

export function signToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      adminPincode: user.admin_pincode ?? null,
      wholesalerId: user.wholesaler_id ?? null,
      riderId: user.rider_id ?? null,
    },
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

export function optionalAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return next();
  }

  try {
    req.user = jwt.verify(header.slice(7), JWT_SECRET);
  } catch {
    // ignore invalid tokens for public catalog reads
  }
  next();
}

export function adminRequired(req, res, next) {
  if (!isSuperAdmin(req.user?.role)) {
    return res.status(403).json({ error: 'Super admin access required' });
  }
  next();
}

export function panelRequired(req, res, next) {
  if (!isPanelRole(req.user?.role)) {
    return res.status(403).json({ error: 'Panel access required' });
  }
  next();
}

export function riderRequired(req, res, next) {
  if (!isRider(req.user?.role) || !req.user?.riderId) {
    return res.status(403).json({ error: 'Rider access required' });
  }
  next();
}

export function locationAdminOrSuper(req, res, next) {
  const role = req.user?.role;
  if (role !== 'admin' && role !== 'location_admin') {
    return res.status(403).json({ error: 'Location admin access required' });
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
    pincode: row.pincode ?? null,
    adminPincode: row.admin_pincode ?? null,
    wholesalerId: row.wholesaler_id ?? null,
    riderId: row.rider_id ?? null,
    walletBalance: row.wallet_balance,
    active: !!row.active,
    ordersCount: row.orders_count ?? 0,
    createdAt: row.created_at,
    termsAcceptedAt: row.terms_accepted_at ?? null,
    termsVersion: row.terms_version ?? null,
    referralCode: row.referral_code ?? null,
    referredByUserId: row.referred_by_user_id ?? null,
    referredByName: row.referred_by_name ?? null,
    referralsCount: row.referrals_count ?? 0,
  };
}

export function formatCategory(row) {
  return {
    id: row.id,
    name: row.name,
    icon: row.icon,
    color: row.color,
    thumbnail: row.thumbnail,
    description: row.description ?? '',
    sortOrder: row.sort_order ?? 0,
  };
}

export function formatProduct(row) {
  const { images, image } = formatProductImagesRow(row);

  return {
    id: row.id,
    name: row.name,
    brand: row.brand,
    categoryId: row.category_id,
    subCategoryId: row.sub_category_id,
    price: row.price,
    mrp: row.mrp,
    unit: row.unit,
    image,
    images,
    description: row.description ?? '',
    subscription: !!row.subscription,
    tag: row.tag,
    stock: row.stock,
    active: !!row.active,
    storeType: row.store_type ?? null,
    wholesalePrice: row.wholesale_price ?? null,
  };
}
