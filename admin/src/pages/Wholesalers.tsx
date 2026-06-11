import { useEffect, useState, type FormEvent } from 'react';

import PageHeader from '../components/PageHeader';
import '../components/shared.css';
import { api } from '../lib/api';
import { STORE_TYPES } from '../lib/storeTypes';
import type { StoreType, Wholesaler } from '../types';

const emptyForm = {
  name: '',
  shopName: '',
  phone: '',
  email: '',
  address: '',
  storeType: 'general' as StoreType,
  settlementCycle: 'weekly' as 'weekly' | 'monthly',
  pincodes: '',
};

export default function WholesalersPage() {
  const [wholesalers, setWholesalers] = useState<Wholesaler[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { wholesalers: rows } = await api.getWholesalers();
    setWholesalers(rows as Wholesaler[]);
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
      shopName: form.shopName,
      phone: form.phone,
      email: form.email || null,
      address: form.address || null,
      settlementCycle: form.settlementCycle,
      storeType: form.storeType,
      pincodes: form.pincodes
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean),
    };

    try {
      if (editingId) {
        await api.updateWholesaler(editingId, payload);
      } else {
        await api.createWholesaler(payload);
      }
      await load();
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save wholesaler');
    }
  };

  const startEdit = (row: Wholesaler) => {
    setEditingId(row.id);
    setForm({
      name: row.name,
      shopName: row.shopName,
      phone: row.phone,
      email: row.email ?? '',
      address: row.address ?? '',
      settlementCycle: row.settlementCycle,
      storeType: row.storeType ?? 'general',
      pincodes: row.pincodes.map((item) => item.pincode).join(', '),
    });
  };

  if (loading) {
    return <div style={{ padding: 24 }}>Loading wholesalers...</div>;
  }

  return (
    <div>
      <PageHeader
        title="Wholesalers"
        subtitle="One vendor per store type per pincode (General, Vegetable, Milk & Bread). Mixed orders split automatically."
      />

      <form className="card" style={{ padding: 24, marginBottom: 24 }} onSubmit={handleSubmit}>
        <h3 style={{ marginTop: 0 }}>{editingId ? 'Edit wholesaler' : 'Add wholesaler'}</h3>
        <div className="form-grid">
          <label>
            Owner name
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </label>
          <label>
            Shop name
            <input
              value={form.shopName}
              onChange={(e) => setForm({ ...form, shopName: e.target.value })}
              required
            />
          </label>
          <label>
            Phone
            <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
          </label>
          <label>
            Email
            <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </label>
          <label>
            Store type
            <select
              value={form.storeType}
              onChange={(e) => setForm({ ...form, storeType: e.target.value as StoreType })}>
              {STORE_TYPES.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Settlement cycle
            <select
              value={form.settlementCycle}
              onChange={(e) =>
                setForm({ ...form, settlementCycle: e.target.value as 'weekly' | 'monthly' })
              }>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </label>
          <label style={{ gridColumn: '1 / -1' }}>
            Service pincodes (comma separated)
            <input
              value={form.pincodes}
              onChange={(e) => setForm({ ...form, pincodes: e.target.value })}
              placeholder="523201, 523157"
              required
            />
          </label>
          <label style={{ gridColumn: '1 / -1' }}>
            Address
            <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
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
            {editingId ? 'Update wholesaler' : 'Add wholesaler'}
          </button>
        </div>
      </form>

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Shop</th>
                <th>Store type</th>
                <th>Owner</th>
                <th>Phone</th>
                <th>Pincodes</th>
                <th>Settlement</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {wholesalers.length === 0 ? (
                <tr>
                  <td colSpan={8}>No wholesalers yet. Add one vendor per store type for each pincode.</td>
                </tr>
              ) : (
                wholesalers.map((row) => (
                  <tr key={row.id}>
                    <td>{row.shopName}</td>
                    <td>
                      {STORE_TYPES.find((entry) => entry.id === row.storeType)?.label ??
                        row.storeType ??
                        'General Store'}
                    </td>
                    <td>{row.name}</td>
                    <td>{row.phone}</td>
                    <td>{row.pincodes.map((item) => item.pincode).join(', ') || '—'}</td>
                    <td>{row.settlementCycle}</td>
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
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
