import { useEffect, useState, type FormEvent } from 'react';

import PageHeader from '../components/PageHeader';
import '../components/shared.css';
import { api } from '../lib/api';
import { useAdminStore } from '../store/AdminStore';
import type { ServiceArea, ServicePincode } from '../types';

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
  const [pincodes, setPincodes] = useState<ServicePincode[]>([]);
  const [pincodeForm, setPincodeForm] = useState({ pincode: '', label: '' });
  const [pincodeError, setPincodeError] = useState('');

  const loadAreas = async () => {
    const { areas: nextAreas } = await api.getServiceAreas();
    setAreas(nextAreas as ServiceArea[]);
  };

  const loadPincodes = async () => {
    const { pincodes: nextPincodes } = await api.getPincodes();
    setPincodes(nextPincodes as ServicePincode[]);
  };

  useEffect(() => {
    setForm(settings);
  }, [settings]);

  useEffect(() => {
    loadAreas().catch(() => undefined);
    loadPincodes().catch(() => undefined);
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

  const handleAddPincode = async (event: FormEvent) => {
    event.preventDefault();
    setPincodeError('');
    try {
      await api.createPincode({
        pincode: pincodeForm.pincode.trim(),
        label: pincodeForm.label.trim(),
      });
      setPincodeForm({ pincode: '', label: '' });
      await loadPincodes();
    } catch (error) {
      setPincodeError(error instanceof Error ? error.message : 'Failed to add pincode');
    }
  };

  const handleTogglePincode = async (item: ServicePincode) => {
    await api.updatePincode(item.pincode, { label: item.label, active: !item.active });
    await loadPincodes();
  };

  const handleDeletePincode = async (pincode: string) => {
    if (!confirm('Remove this delivery location? Product/category availability for it will also be removed.')) {
      return;
    }
    await api.deletePincode(pincode);
    await loadPincodes();
  };

  return (
    <div>
      <PageHeader
        title="Settings"
        subtitle="Configure delivery rules, fees, and service locations"
      />

      <form className="card" style={{ padding: 24, maxWidth: 560, marginBottom: 24 }} onSubmit={handleSubmit}>
        <h3 style={{ marginTop: 0 }}>Delivery Rules</h3>
        <p style={{ color: '#64748b', marginTop: 0 }}>
          Orders below the minimum order value are charged the delivery fee. Orders at or above the minimum get free delivery.
        </p>
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

        <h3 style={{ marginTop: 24 }}>Platform Fee</h3>
        <p style={{ color: '#64748b', marginTop: 0 }}>
          A flat fee added to every order. Disable it or change the amount anytime.
        </p>
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '8px 0 16px',
            cursor: 'pointer',
          }}>
          <input
            type="checkbox"
            checked={form.platformFeeEnabled}
            onChange={(e) => setForm({ ...form, platformFeeEnabled: e.target.checked })}
            style={{ width: 18, height: 18 }}
          />
          <span>
            <strong>Enable platform fee</strong>
            <br />
            <span style={{ color: '#64748b', fontSize: 14 }}>
              When enabled, the fee below is added to each order at checkout
            </span>
          </span>
        </label>
        <label>
          Platform Fee (₹)
          <input
            type="number"
            min={0}
            step={1}
            value={form.platformFee}
            onChange={(e) => setForm({ ...form, platformFee: Number(e.target.value) })}
            disabled={!form.platformFeeEnabled}
            required
          />
        </label>

        <div className="modal-actions">
          {saved ? <span className="badge green">Saved!</span> : null}
          <button type="submit" className="btn btn-primary">
            Save Settings
          </button>
        </div>
      </form>

      <form className="card" style={{ padding: 24, maxWidth: 560, marginBottom: 24 }} onSubmit={handleSubmit}>
        <h3 style={{ marginTop: 0 }}>App Features</h3>
        <p style={{ color: '#64748b', marginTop: 0 }}>
          Turn features on or off in the mobile app. Changes apply within a few seconds for logged-in users.
        </p>
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '12px 0',
            cursor: 'pointer',
          }}>
          <input
            type="checkbox"
            checked={form.walletEnabled}
            onChange={(e) => setForm({ ...form, walletEnabled: e.target.checked })}
            style={{ width: 18, height: 18 }}
          />
          <span>
            <strong>Wallet</strong>
            <br />
            <span style={{ color: '#64748b', fontSize: 14 }}>
              Show wallet balance, profile menu, and pay-with-wallet at checkout
            </span>
          </span>
        </label>
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '12px 0',
            cursor: 'pointer',
          }}>
          <input
            type="checkbox"
            checked={form.subscriptionEnabled}
            onChange={(e) => setForm({ ...form, subscriptionEnabled: e.target.checked })}
            style={{ width: 18, height: 18 }}
          />
          <span>
            <strong>Subscriptions</strong>
            <br />
            <span style={{ color: '#64748b', fontSize: 14 }}>
              Show subscribe badges, daily essentials, and active subscriptions on the Orders tab
            </span>
          </span>
        </label>
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '12px 0',
            cursor: 'pointer',
          }}>
          <input
            type="checkbox"
            checked={form.referralEnabled ?? true}
            onChange={(e) => setForm({ ...form, referralEnabled: e.target.checked })}
            style={{ width: 18, height: 18 }}
          />
          <span>
            <strong>Refer & Earn</strong>
            <br />
            <span style={{ color: '#64748b', fontSize: 14 }}>
              Show referral menu in the app and credit wallet rewards when friends sign up
            </span>
          </span>
        </label>
        <label>
          Referral reward (₹ per sign-up)
          <input
            type="number"
            min={0}
            step={1}
            value={form.referralRewardAmount ?? 50}
            onChange={(e) => setForm({ ...form, referralRewardAmount: Number(e.target.value) })}
            disabled={form.referralEnabled === false}
          />
        </label>
        <div className="modal-actions">
          {saved ? <span className="badge green">Saved!</span> : null}
          <button type="submit" className="btn btn-primary">
            Save Features
          </button>
        </div>
      </form>

      <div className="card" style={{ padding: 24, maxWidth: 720, marginBottom: 24 }}>
        <h3 style={{ marginTop: 0 }}>Delivery Locations (Pincodes)</h3>
        <p style={{ color: '#64748b', marginTop: 0 }}>
          Add towns like Addanki or Chirala. Products and categories can then be limited to specific pincodes.
        </p>

        <form className="form-grid" onSubmit={handleAddPincode}>
          <label>
            Pincode
            <input
              value={pincodeForm.pincode}
              onChange={(e) => setPincodeForm({ ...pincodeForm, pincode: e.target.value })}
              placeholder="523201"
              required
            />
          </label>
          <label>
            Location label
            <input
              value={pincodeForm.label}
              onChange={(e) => setPincodeForm({ ...pincodeForm, label: e.target.value })}
              placeholder="Addanki, Andhra Pradesh"
              required
            />
          </label>
          {pincodeError ? <p className="full" style={{ color: '#dc2626' }}>{pincodeError}</p> : null}
          <div className="full modal-actions">
            <button type="submit" className="btn btn-primary">
              Add Location
            </button>
          </div>
        </form>

        <table className="data-table" style={{ marginTop: 24 }}>
          <thead>
            <tr>
              <th>Location</th>
              <th>Pincode</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {pincodes.length === 0 ? (
              <tr>
                <td colSpan={4}>No delivery locations configured yet.</td>
              </tr>
            ) : (
              pincodes.map((item) => (
                <tr key={item.pincode}>
                  <td>{item.label}</td>
                  <td>{item.pincode}</td>
                  <td>
                    <span className={`badge ${item.active ? 'green' : 'yellow'}`}>
                      {item.active ? 'Active' : 'Disabled'}
                    </span>
                  </td>
                  <td style={{ display: 'flex', gap: 8 }}>
                    <button type="button" className="btn" onClick={() => handleTogglePincode(item)}>
                      {item.active ? 'Disable' : 'Enable'}
                    </button>
                    <button
                      type="button"
                      className="btn btn-danger"
                      onClick={() => handleDeletePincode(item.pincode)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

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
