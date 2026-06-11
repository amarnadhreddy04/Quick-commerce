import { useEffect, useState, type FormEvent } from 'react';

import PageHeader from '../components/PageHeader';
import '../components/shared.css';
import { api } from '../lib/api';
import type { Rider } from '../types';

const emptyForm = {
  name: '',
  phone: '',
  email: '',
  vehicleType: 'bike',
  pincode: '523201',
  password: 'rider123',
};

export default function RidersPage() {
  const [riders, setRiders] = useState<Rider[]>([]);
  const [stats, setStats] = useState<Rider[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const [ridersRes, statsRes] = await Promise.all([api.getRiders(), api.getRiderStats()]);
    setRiders(ridersRes.riders as Rider[]);
    setStats(statsRes.summary as Rider[]);
  };

  useEffect(() => {
    load()
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    const payload = {
      name: form.name,
      phone: form.phone,
      email: form.email || null,
      vehicleType: form.vehicleType,
      pincode: form.pincode,
      password: editingId ? undefined : form.password,
      active: true,
    };

    try {
      if (editingId) {
        await api.updateRider(editingId, payload);
      } else {
        await api.createRider(payload);
      }
      await load();
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save rider');
    }
  };

  const startEdit = (row: Rider) => {
    setEditingId(row.id);
    setForm({
      name: row.name,
      phone: row.phone,
      email: row.email ?? '',
      vehicleType: row.vehicleType,
      pincode: row.pincode,
      password: '',
    });
  };

  if (loading) {
    return <div style={{ padding: 24 }}>Loading riders...</div>;
  }

  return (
    <div>
      <PageHeader
        title="Delivery Riders"
        subtitle="Track deliveries per rider. Riders log in on the mobile app to see assigned orders."
      />

      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header">Delivery performance</div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Rider</th>
                <th>Pincode</th>
                <th>Delivered</th>
                <th>Active now</th>
                <th>Total assigned</th>
              </tr>
            </thead>
            <tbody>
              {stats.length === 0 ? (
                <tr>
                  <td colSpan={5}>No riders yet.</td>
                </tr>
              ) : (
                stats.map((row) => (
                  <tr key={row.id}>
                    <td>{row.name}</td>
                    <td>{row.pincode}</td>
                    <td>{row.delivered ?? row.deliveriesCount ?? 0}</td>
                    <td>{row.activeDeliveries ?? 0}</td>
                    <td>{row.totalAssigned ?? 0}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <form className="card" style={{ padding: 24, marginBottom: 24 }} onSubmit={handleSubmit}>
        <h3 style={{ marginTop: 0 }}>{editingId ? 'Edit rider' : 'Add rider'}</h3>
        <div className="form-grid">
          <label>
            Name
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </label>
          <label>
            Phone
            <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
          </label>
          <label>
            Email (app login)
            <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </label>
          {!editingId ? (
            <label>
              App password
              <input
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
              />
            </label>
          ) : null}
          <label>
            Vehicle
            <select
              value={form.vehicleType}
              onChange={(e) => setForm({ ...form, vehicleType: e.target.value })}>
              <option value="bike">Bike</option>
              <option value="scooter">Scooter</option>
              <option value="van">Van</option>
            </select>
          </label>
          <label>
            Service pincode
            <input
              value={form.pincode}
              onChange={(e) => setForm({ ...form, pincode: e.target.value })}
              required
            />
          </label>
        </div>
        {error ? <p style={{ color: '#dc2626' }}>{error}</p> : null}
        <div className="modal-actions">
          {editingId ? (
            <button type="button" className="btn btn-secondary" onClick={resetForm}>
              Cancel
            </button>
          ) : null}
          <button type="submit" className="btn btn-primary">
            {editingId ? 'Update rider' : 'Add rider'}
          </button>
        </div>
      </form>

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Phone</th>
                <th>Vehicle</th>
                <th>Pincode</th>
                <th>Delivered</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {riders.map((row) => (
                <tr key={row.id}>
                  <td>{row.name}</td>
                  <td>{row.phone}</td>
                  <td>{row.vehicleType}</td>
                  <td>{row.pincode}</td>
                  <td>{row.deliveredOrders ?? row.deliveriesCount ?? 0}</td>
                  <td>
                    <span className={`badge ${row.active ? 'green' : 'red'}`}>
                      {row.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => startEdit(row)}>
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
