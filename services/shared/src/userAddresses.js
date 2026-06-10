import { randomUUID } from 'crypto';

import { queryAll, queryOne, run } from './db.js';

const DEFAULT_PINCODES = ['523201', '523157', '522601', '513255'];

function normalizePincode(pincode) {
  return String(pincode ?? '').replace(/\D/g, '');
}

export function isPincodeServiceable(pincodeDigits) {
  if (pincodeDigits.length !== 6) return false;

  try {
    const row = queryOne(
      'SELECT pincode FROM service_pincodes WHERE pincode = ? AND active = 1',
      [pincodeDigits]
    );
    if (row) return true;
  } catch {
    // Fall back to default list if table is missing
  }

  return DEFAULT_PINCODES.includes(pincodeDigits);
}

function resolveAreaLabel(pincodeDigits) {
  const row = queryOne('SELECT label FROM service_pincodes WHERE pincode = ?', [pincodeDigits]);
  if (row?.label) return row.label;

  const fallback = {
    523201: 'Addanki, Andhra Pradesh',
    523157: 'Chirala, Andhra Pradesh',
    522601: 'Vinukonda, Andhra Pradesh',
    513255: 'Rayadurg, Andhra Pradesh',
  };
  return fallback[pincodeDigits] ?? pincodeDigits;
}

export function formatAddress(row) {
  if (!row) return null;

  const pincode = normalizePincode(row.pincode);
  const areaLabel = resolveAreaLabel(pincode);
  const line2 = row.line2?.trim() || null;

  return {
    id: row.id,
    label: row.label,
    line1: row.line1,
    line2,
    pincode,
    city: row.city || areaLabel,
    areaLabel,
    isDefault: !!row.is_default,
    fullAddress: [row.line1, line2, areaLabel, pincode].filter(Boolean).join(', '),
    createdAt: row.created_at,
  };
}

export function listAddresses(userId) {
  ensureDefaultAddress(userId);
  const rows = queryAll(
    'SELECT * FROM user_addresses WHERE user_id = ? ORDER BY is_default DESC, created_at ASC',
    [userId]
  );
  return rows.map(formatAddress);
}

export function getAddress(userId, addressId) {
  const row = queryOne('SELECT * FROM user_addresses WHERE id = ? AND user_id = ?', [
    addressId,
    userId,
  ]);
  return formatAddress(row);
}

export function ensureDefaultAddress(userId) {
  const existing = queryOne('SELECT id FROM user_addresses WHERE user_id = ? LIMIT 1', [userId]);
  if (existing) return;

  const user = queryOne('SELECT location, pincode FROM users WHERE id = ?', [userId]);
  if (!user) return;

  const pincode = normalizePincode(user.pincode);
  if (pincode.length !== 6) return;

  const areaLabel = resolveAreaLabel(pincode);
  const line1 = user.location?.replace(/\s*\d{6}\s*$/, '').trim() || 'Home';

  run(
    `INSERT INTO user_addresses (id, user_id, label, line1, line2, pincode, city, is_default)
     VALUES (?, ?, 'Home', ?, NULL, ?, ?, 1)`,
    [randomUUID(), userId, line1, pincode, areaLabel]
  );
}

export function createAddress(userId, payload) {
  const pincode = normalizePincode(payload.pincode);
  if (pincode.length !== 6) {
    return { ok: false, error: 'Enter a valid 6-digit pincode' };
  }
  if (!isPincodeServiceable(pincode)) {
    return {
      ok: false,
      error: 'Delivery is not available for this pincode. We serve: 523201, 523157, 522601, 513255',
    };
  }

  const line1 = String(payload.line1 ?? '').trim();
  if (!line1) {
    return { ok: false, error: 'Street / house address is required' };
  }

  const label = String(payload.label ?? 'Home').trim() || 'Home';
  const line2 = String(payload.line2 ?? '').trim() || null;
  const city = resolveAreaLabel(pincode);
  const id = randomUUID();
  const makeDefault = !!payload.isDefault;

  if (makeDefault) {
    run('UPDATE user_addresses SET is_default = 0 WHERE user_id = ?', [userId]);
  }

  const hasAny = queryOne('SELECT id FROM user_addresses WHERE user_id = ? LIMIT 1', [userId]);
  const isDefault = makeDefault || !hasAny ? 1 : 0;

  run(
    `INSERT INTO user_addresses (id, user_id, label, line1, line2, pincode, city, is_default)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, userId, label, line1, line2, pincode, city, isDefault]
  );

  if (isDefault) {
    syncUserDeliveryFromAddress(userId, id);
  }

  return { ok: true, address: getAddress(userId, id) };
}

export function updateAddress(userId, addressId, payload) {
  const existing = queryOne('SELECT * FROM user_addresses WHERE id = ? AND user_id = ?', [
    addressId,
    userId,
  ]);
  if (!existing) {
    return { ok: false, error: 'Address not found' };
  }

  const pincode = normalizePincode(payload.pincode ?? existing.pincode);
  if (pincode.length !== 6) {
    return { ok: false, error: 'Enter a valid 6-digit pincode' };
  }
  if (!isPincodeServiceable(pincode)) {
    return {
      ok: false,
      error: 'Delivery is not available for this pincode. We serve: 523201, 523157, 522601, 513255',
    };
  }

  const line1 = String(payload.line1 ?? existing.line1).trim();
  if (!line1) {
    return { ok: false, error: 'Street / house address is required' };
  }

  const label = String(payload.label ?? existing.label).trim() || 'Home';
  const line2 =
    payload.line2 === undefined
      ? existing.line2
      : String(payload.line2 ?? '').trim() || null;
  const city = resolveAreaLabel(pincode);

  run(
    `UPDATE user_addresses
     SET label = ?, line1 = ?, line2 = ?, pincode = ?, city = ?
     WHERE id = ? AND user_id = ?`,
    [label, line1, line2, pincode, city, addressId, userId]
  );

  if (existing.is_default) {
    syncUserDeliveryFromAddress(userId, addressId);
  }

  return { ok: true, address: getAddress(userId, addressId) };
}

export function deleteAddress(userId, addressId) {
  const existing = queryOne('SELECT * FROM user_addresses WHERE id = ? AND user_id = ?', [
    addressId,
    userId,
  ]);
  if (!existing) {
    return { ok: false, error: 'Address not found' };
  }

  const count = queryOne('SELECT COUNT(*) as total FROM user_addresses WHERE user_id = ?', [userId]);
  if ((count?.total ?? 0) <= 1) {
    return { ok: false, error: 'Keep at least one delivery address' };
  }

  run('DELETE FROM user_addresses WHERE id = ? AND user_id = ?', [addressId, userId]);

  if (existing.is_default) {
    const next = queryOne(
      'SELECT id FROM user_addresses WHERE user_id = ? ORDER BY created_at ASC LIMIT 1',
      [userId]
    );
    if (next) {
      activateAddress(userId, next.id);
    }
  }

  return { ok: true };
}

function syncUserDeliveryFromAddress(userId, addressId) {
  const address = queryOne('SELECT * FROM user_addresses WHERE id = ? AND user_id = ?', [
    addressId,
    userId,
  ]);
  if (!address) return;

  const location = [address.line1, address.line2, address.city].filter(Boolean).join(', ');
  run('UPDATE users SET pincode = ?, location = ? WHERE id = ?', [
    normalizePincode(address.pincode),
    location,
    userId,
  ]);
}

export function activateAddress(userId, addressId) {
  const existing = queryOne('SELECT * FROM user_addresses WHERE id = ? AND user_id = ?', [
    addressId,
    userId,
  ]);
  if (!existing) {
    return { ok: false, error: 'Address not found' };
  }

  run('UPDATE user_addresses SET is_default = 0 WHERE user_id = ?', [userId]);
  run('UPDATE user_addresses SET is_default = 1 WHERE id = ? AND user_id = ?', [addressId, userId]);
  syncUserDeliveryFromAddress(userId, addressId);

  return { ok: true, address: getAddress(userId, addressId) };
}
