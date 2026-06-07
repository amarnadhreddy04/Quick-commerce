import { useEffect, useState, type FormEvent } from 'react';

import PageHeader from '../components/PageHeader';
import '../components/shared.css';
import { api } from '../lib/api';
import { useAdminStore } from '../store/AdminStore';
import type { ServiceArea } from '../types';

type AreaForm = {
  name: string;
  latitude: string;
  longitude: string;
  radiusKm: string;
};

const emptyAreaForm: AreaForm = {
  name: '',
  latitude: '',
  longitude: '',
  radiusKm: '15',
};

async function geocodeLocation(query: string) {
  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`,
    { headers: { 'Accept-Language': 'en' } }
  );
  const data = await response.json();
  if (!data[0]) {
    throw new Error('Location not found. Try a more specific name like "Addanki, Andhra Pradesh".');
  }
  return {
    latitude: Number(data[0].lat),
    longitude: Number(data[0].lon),
    displayName: data[0].display_name as string,
  };
}

export default function Settings() {
  const { settings, updateSettings } = useAdminStore();
  const [form, setForm] = useState(settings);
  const [saved, setSaved] = useState(false);
  const [areas, setAreas] = useState<ServiceArea[]>([]);
  const [areaForm, setAreaForm] = useState<AreaForm>(emptyAreaForm);
  const [areaError, setAreaError] = useState('');
  const [areaLoading, setAreaLoading] = useState(false);
  const [geocoding, setGeocoding] = useState(false);

  const loadAreas = async () => {
    const { areas: nextAreas } = await api.getServiceAreas();
    setAreas(nextAreas as ServiceArea[]);
  };

  useEffect(() => {
    loadAreas().catch(() => undefined);
  }, []);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    await updateSettings(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleLookup = async () => {
    if (!areaForm.name.trim()) {
      setAreaError('Enter a location name first');
      return;
    }

    setGeocoding(true);
    setAreaError('');
    try {
      const result = await geocodeLocation(areaForm.name);
      setAreaForm((current) => ({
        ...current,
        name: result.displayName.split(',')[0] ?? current.name,
        latitude: result.latitude.toFixed(6),
        longitude: result.longitude.toFixed(6),
      }));
    } catch (error) {
      setAreaError(error instanceof Error ? error.message : 'Could not find location');
    } finally {
      setGeocoding(false);
    }
  };

  const handleAddArea = async (event: FormEvent) => {
    event.preventDefault();
    setAreaLoading(true);
    setAreaError('');

    try {
      await api.createServiceArea({
        name: areaForm.name.trim(),
        latitude: Number(areaForm.latitude),
        longitude: Number(areaForm.longitude),
        radiusKm: Number(areaForm.radiusKm),
        active: true,
      });
      setAreaForm(emptyAreaForm);
      await loadAreas();
    } catch (error) {
      setAreaError(error instanceof Error ? error.message : 'Failed to add service area');
    } finally {
      setAreaLoading(false);
    }
  };

  const handleToggleArea = async (area: ServiceArea) => {
    await api.updateServiceArea(area.id, { active: !area.active });
    await loadAreas();
  };

  const handleDeleteArea = async (id: string) => {
    if (!confirm('Remove this delivery area?')) return;
    await api.deleteServiceArea(id);
    await loadAreas();
  };

  return (
    <div>
      <PageHeader
        title="Settings"
        subtitle="Configure delivery rules, fees, and service locations"
      />

      <form className="card" style={{ padding: 24, maxWidth: 560, marginBottom: 24 }} onSubmit={handleSubmit}>
        <h3 style={{ marginTop: 0 }}>Delivery Rules</h3>
        <div className="form-grid">
          <label className="full">
            Order Cutoff Time
            <input
              value={form.deliveryCutoff}
              onChange={(e) => setForm({ ...form, deliveryCutoff: e.target.value })}
              required
            />
          </label>
          <label className="full">
            Delivery Slot Label
            <input
              value={form.deliverySlot}
              onChange={(e) => setForm({ ...form, deliverySlot: e.target.value })}
              required
            />
          </label>
          <label>
            Minimum Order Value (₹)
            <input
              type="number"
              value={form.minOrderValue}
              onChange={(e) => setForm({ ...form, minOrderValue: Number(e.target.value) })}
              required
            />
          </label>
          <label>
            Delivery Fee (₹)
            <input
              type="number"
              value={form.deliveryFee}
              onChange={(e) => setForm({ ...form, deliveryFee: Number(e.target.value) })}
              required
            />
          </label>
        </div>

        <div className="modal-actions">
          {saved ? <span className="badge green">Saved!</span> : null}
          <button type="submit" className="btn btn-primary">
            Save Settings
          </button>
        </div>
      </form>

      <div className="card" style={{ padding: 24, maxWidth: 720 }}>
        <h3 style={{ marginTop: 0 }}>Service Areas (Radius)</h3>
        <p style={{ color: '#64748b', marginTop: 0 }}>
          Users inside any active area radius can use the app. Others will see an unavailable message.
        </p>

        <form className="form-grid" onSubmit={handleAddArea}>
          <label className="full">
            Location Name
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                value={areaForm.name}
                onChange={(e) => setAreaForm({ ...areaForm, name: e.target.value })}
                placeholder="e.g. Addanki, Andhra Pradesh"
                required
              />
              <button
                type="button"
                className="btn"
                onClick={handleLookup}
                disabled={geocoding}>
                {geocoding ? 'Searching...' : 'Find on Map'}
              </button>
            </div>
          </label>
          <label>
            Latitude
            <input
              value={areaForm.latitude}
              onChange={(e) => setAreaForm({ ...areaForm, latitude: e.target.value })}
              required
            />
          </label>
          <label>
            Longitude
            <input
              value={areaForm.longitude}
              onChange={(e) => setAreaForm({ ...areaForm, longitude: e.target.value })}
              required
            />
          </label>
          <label>
            Radius (KM)
            <input
              type="number"
              min={1}
              value={areaForm.radiusKm}
              onChange={(e) => setAreaForm({ ...areaForm, radiusKm: e.target.value })}
              required
            />
          </label>
          {areaError ? <p className="full" style={{ color: '#dc2626' }}>{areaError}</p> : null}
          <div className="full modal-actions">
            <button type="submit" className="btn btn-primary" disabled={areaLoading}>
              {areaLoading ? 'Adding...' : 'Add Service Area'}
            </button>
          </div>
        </form>

        <table className="data-table" style={{ marginTop: 24 }}>
          <thead>
            <tr>
              <th>Location</th>
              <th>Radius</th>
              <th>Coordinates</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {areas.length === 0 ? (
              <tr>
                <td colSpan={5}>No service areas configured yet.</td>
              </tr>
            ) : (
              areas.map((area) => (
                <tr key={area.id}>
                  <td>{area.name}</td>
                  <td>{area.radiusKm} km</td>
                  <td>
                    {area.latitude.toFixed(4)}, {area.longitude.toFixed(4)}
                  </td>
                  <td>
                    <span className={`badge ${area.active ? 'green' : 'yellow'}`}>
                      {area.active ? 'Active' : 'Disabled'}
                    </span>
                  </td>
                  <td style={{ display: 'flex', gap: 8 }}>
                    <button type="button" className="btn" onClick={() => handleToggleArea(area)}>
                      {area.active ? 'Disable' : 'Enable'}
                    </button>
                    <button type="button" className="btn btn-danger" onClick={() => handleDeleteArea(area.id)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
