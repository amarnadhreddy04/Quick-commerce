import { Router } from 'express';
import { v4 as uuid } from 'uuid';

import { queryAll, queryOne, run } from '../../../shared/src/db.js';
import { distanceKm } from '../../../shared/src/geo.js';
import { adminRequired, authRequired } from '../../../shared/src/middleware/auth.js';
import { publishSyncEvent } from '../../../shared/src/sync/publish.js';

const router = Router();

function formatArea(row) {
  return {
    id: row.id,
    name: row.name,
    latitude: row.latitude,
    longitude: row.longitude,
    radiusKm: row.radius_km,
    active: !!row.active,
    createdAt: row.created_at,
  };
}

function getActiveAreas() {
  return queryAll('SELECT * FROM service_areas WHERE active = 1 ORDER BY name');
}

function checkAvailability(lat, lng) {
  const areas = getActiveAreas();

  if (!areas.length) {
    return {
      available: false,
      message: 'Delivery is not available in your area yet. Please check back soon.',
      areasConfigured: false,
    };
  }

  let nearest = null;

  for (const area of areas) {
    const dist = distanceKm(lat, lng, area.latitude, area.longitude);
    if (dist <= area.radius_km) {
      return {
        available: true,
        area: {
          id: area.id,
          name: area.name,
          radiusKm: area.radius_km,
          distanceKm: Math.round(dist * 10) / 10,
        },
        areasConfigured: true,
      };
    }

    if (!nearest || dist < nearest.distanceKm) {
      nearest = {
        name: area.name,
        radiusKm: area.radius_km,
        distanceKm: Math.round(dist * 10) / 10,
      };
    }
  }

  const areaNames = areas.map((area) => area.name).join(', ');
  return {
    available: false,
    message: `We're currently unable to deliver to your location. We serve ${areaNames} and surrounding areas.`,
    nearestArea: nearest,
    areasConfigured: true,
  };
}

const DEFAULT_PINCODES = [
  { pincode: '523201', label: 'Addanki, Andhra Pradesh' },
  { pincode: '522601', label: 'Vinukonda, Andhra Pradesh' },
  { pincode: '513255', label: 'Rayadurg, Andhra Pradesh' },
];

function getAllowedPincodes() {
  try {
    const rows = queryAll('SELECT pincode, label FROM service_pincodes WHERE active = 1 ORDER BY pincode');
    if (rows.length) return rows;
  } catch {
    // Table may not exist until migration runs
  }
  return DEFAULT_PINCODES;
}

function checkPincodeAvailability(pincode) {
  const digits = (pincode ?? '').replace(/\D/g, '');
  if (digits.length !== 6) {
    return {
      available: false,
      message: 'Enter a valid 6-digit pincode',
    };
  }

  const allowed = getAllowedPincodes();
  const row = allowed.find((item) => item.pincode === digits);

  if (row) {
    return {
      available: true,
      pincode: digits,
      label: row.label,
    };
  }

  const pincodeList = allowed.map((item) => item.pincode).join(', ');

  return {
    available: false,
    message: `We're currently unable to deliver to pincode ${digits}. We serve: ${pincodeList}`,
    allowedPincodes: allowed.map((item) => ({
      pincode: item.pincode,
      label: item.label,
    })),
  };
}

router.get('/check-pincode', (req, res) => {
  const { pincode } = req.query;
  if (!pincode) {
    return res.status(400).json({ error: 'Pincode is required' });
  }
  res.json(checkPincodeAvailability(String(pincode)));
});

router.get('/pincodes', (_req, res) => {
  const pincodes = queryAll('SELECT pincode, label, active FROM service_pincodes ORDER BY pincode');
  res.json({
    pincodes: pincodes.map((row) => ({
      pincode: row.pincode,
      label: row.label,
      active: !!row.active,
    })),
  });
});

router.get('/check', (req, res) => {
  const { pincode } = req.query;
  if (pincode) {
    return res.json(checkPincodeAvailability(String(pincode)));
  }

  const lat = Number(req.query.lat);
  const lng = Number(req.query.lng);

  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    return res.status(400).json({ error: 'Pincode or latitude and longitude are required' });
  }

  res.json(checkAvailability(lat, lng));
});

router.get('/', (_req, res) => {
  const areas = queryAll('SELECT * FROM service_areas ORDER BY name');
  res.json({ areas: areas.map(formatArea) });
});

router.post('/', authRequired, adminRequired, async (req, res) => {
  const { name, latitude, longitude, radiusKm, active } = req.body;

  if (!name || latitude == null || longitude == null) {
    return res.status(400).json({ error: 'Name, latitude, and longitude are required' });
  }

  const id = uuid();
  run(
    `INSERT INTO service_areas (id, name, latitude, longitude, radius_km, active)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, name, latitude, longitude, radiusKm ?? 15, active === false ? 0 : 1]
  );

  const area = queryOne('SELECT * FROM service_areas WHERE id = ?', [id]);
  await publishSyncEvent({ domain: 'areas', action: 'created', entity: 'service_area', id });
  res.status(201).json({ area: formatArea(area) });
});

router.put('/:id', authRequired, adminRequired, async (req, res) => {
  const existing = queryOne('SELECT * FROM service_areas WHERE id = ?', [req.params.id]);
  if (!existing) return res.status(404).json({ error: 'Service area not found' });

  const next = { ...formatArea(existing), ...req.body };
  run(
    `UPDATE service_areas SET name=?, latitude=?, longitude=?, radius_km=?, active=? WHERE id=?`,
    [
      next.name,
      next.latitude,
      next.longitude,
      next.radiusKm ?? 15,
      next.active === false ? 0 : 1,
      req.params.id,
    ]
  );

  const area = queryOne('SELECT * FROM service_areas WHERE id = ?', [req.params.id]);
  await publishSyncEvent({ domain: 'areas', action: 'updated', entity: 'service_area', id: req.params.id });
  res.json({ area: formatArea(area) });
});

router.delete('/:id', authRequired, adminRequired, async (req, res) => {
  const existing = queryOne('SELECT * FROM service_areas WHERE id = ?', [req.params.id]);
  if (!existing) return res.status(404).json({ error: 'Service area not found' });

  run('DELETE FROM service_areas WHERE id = ?', [req.params.id]);
  await publishSyncEvent({ domain: 'areas', action: 'deleted', entity: 'service_area', id: req.params.id });
  res.json({ success: true });
});

export default router;
