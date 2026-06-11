import { queryOne } from './db.js';

export const PANEL_ROLES = ['admin', 'location_admin', 'wholesaler'];

export function isPanelRole(role) {
  return PANEL_ROLES.includes(role);
}

export function isSuperAdmin(role) {
  return role === 'admin';
}

export function isLocationAdmin(role) {
  return role === 'location_admin';
}

export function isWholesaler(role) {
  return role === 'wholesaler';
}

export function isRider(role) {
  return role === 'rider';
}

export function getPanelPincode(user) {
  if (!user?.adminPincode) return null;
  const digits = String(user.adminPincode).replace(/\D/g, '');
  return digits.length === 6 ? digits : null;
}

export function customerPincodeSql(alias = 'u') {
  return `COALESCE(
    NULLIF(TRIM(${alias}.pincode), ''),
    (SELECT ua.pincode FROM user_addresses ua
     WHERE ua.user_id = ${alias}.id
     ORDER BY ua.is_default DESC, ua.created_at ASC
     LIMIT 1)
  )`;
}

export function getCustomerPincodeForUser(userId) {
  const row = queryOne(
    `SELECT ${customerPincodeSql('u')} as pincode FROM users u WHERE u.id = ?`,
    [userId]
  );
  const digits = String(row?.pincode ?? '').replace(/\D/g, '');
  return digits.length === 6 ? digits : null;
}

/** SQL filter for listing orders based on panel role. */
export function buildOrderListFilter(user) {
  if (user.role === 'wholesaler' && user.wholesalerId) {
    return {
      sql: `WHERE o.id IN (SELECT order_id FROM order_vendor_tasks WHERE wholesaler_id = ?)`,
      params: [user.wholesalerId],
      from: 'orders o',
    };
  }

  if (user.role === 'location_admin') {
    const pincode = getPanelPincode(user);
    if (!pincode) {
      return { sql: 'WHERE 1 = 0', params: [], from: 'orders o' };
    }
    return {
      sql: `WHERE o.user_id IN (
        SELECT u.id FROM users u
        WHERE ${customerPincodeSql('u')} = ?
      )`,
      params: [pincode],
      from: 'orders o',
    };
  }

  if (user.role === 'admin') {
    return { sql: '', params: [], from: 'orders o' };
  }

  if (user.role === 'customer') {
    return { sql: 'WHERE o.user_id = ?', params: [user.id], from: 'orders o' };
  }

  return { sql: 'WHERE 1 = 0', params: [], from: 'orders o' };
}

export function canAccessOrder(user, order, customerPincode = null) {
  if (!order) return false;
  if (user.role === 'admin') return true;
  if (user.role === 'customer') return order.user_id === user.id;
  if (user.role === 'wholesaler') {
    const task = queryOne(
      'SELECT id FROM order_vendor_tasks WHERE order_id = ? AND wholesaler_id = ? LIMIT 1',
      [order.id, user.wholesalerId]
    );
    return !!task;
  }
  if (user.role === 'location_admin') {
    const pincode = getPanelPincode(user);
    return pincode != null && customerPincode === pincode;
  }
  if (user.role === 'rider' && user.riderId) {
    return order.rider_id === user.riderId;
  }
  return false;
}

export function buildCustomerListFilter(user) {
  if (user.role === 'location_admin') {
    const pincode = getPanelPincode(user);
    if (!pincode) return { sql: 'WHERE 1 = 0', params: [] };
    return {
      sql: `WHERE u.role = 'customer' AND ${customerPincodeSql('u')} = ?`,
      params: [pincode],
    };
  }
  if (user.role === 'admin') {
    return { sql: "WHERE u.role = 'customer'", params: [] };
  }
  return { sql: 'WHERE 1 = 0', params: [] };
}

export function buildRiderScope(user) {
  if (user.role === 'rider' && user.riderId) {
    return { riderId: user.riderId, pincode: null };
  }
  if (user.role === 'location_admin') {
    return { riderId: null, pincode: getPanelPincode(user) };
  }
  return { riderId: null, pincode: null };
}

export function buildWholesalerScope(user) {
  if (user.role === 'wholesaler' && user.wholesalerId) {
    return { wholesalerId: user.wholesalerId, pincode: null };
  }
  if (user.role === 'location_admin') {
    return { wholesalerId: null, pincode: getPanelPincode(user) };
  }
  return { wholesalerId: null, pincode: null };
}
