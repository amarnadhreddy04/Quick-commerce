import { useEffect, useState, type FormEvent } from 'react';

import PageHeader from '../components/PageHeader';
import '../components/shared.css';
import { api } from '../lib/api';
import type { PromoCode } from '../types';

const emptyForm = {
  code: '',
  description: '',
  discountType: 'flat' as 'flat' | 'percent',
  discountValue: 50,
  minOrderValue: 199,
  maxDiscount: '',
  usageLimit: '',
  expiresAt: '',
};

function formatDiscount(promo: PromoCode) {
  if (promo.discountType === 'percent') {
    const cap = promo.maxDiscount ? ` (max ₹${promo.maxDiscount})` : '';
    return `${promo.discountValue}%${cap}`;
  }
  return `₹${promo.discountValue}`;
}

export default function PromoCodesPage() {
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const response = await api.getPromoCodes();
    setPromoCodes(response.promoCodes as PromoCode[]);
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
      code: form.code,
      description: form.description,
      discountType: form.discountType,
      discountValue: Number(form.discountValue),
      minOrderValue: Number(form.minOrderValue) || 0,
      maxDiscount: form.maxDiscount ? Number(form.maxDiscount) : null,
      usageLimit: form.usageLimit ? Number(form.usageLimit) : null,
      expiresAt: form.expiresAt || null,
      active: true,
    };

    try {
      if (editingId) {
        await api.updatePromoCode(editingId, payload);
      } else {
        await api.createPromoCode(payload);
      }
      await load();
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save promo code');
    }
  };

  const startEdit = (row: PromoCode) => {
    setEditingId(row.id);
    setForm({
      code: row.code,
      description: row.description,
      discountType: row.discountType,
      discountValue: row.discountValue,
      minOrderValue: row.minOrderValue,
      maxDiscount: row.maxDiscount != null ? String(row.maxDiscount) : '',
      usageLimit: row.usageLimit != null ? String(row.usageLimit) : '',
      expiresAt: row.expiresAt ? row.expiresAt.slice(0, 10) : '',
    });
  };

  const toggleActive = async (row: PromoCode) => {
    setError('');
    try {
      await api.updatePromoCode(row.id, { active: !row.active });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update promo code');
    }
  };

  if (loading) {
    return <div style={{ padding: 24 }}>Loading promo codes...</div>;
  }

  return (
    <div>
      <PageHeader
        title="Promo Codes"
        subtitle="Create discount codes customers can apply at checkout"
      />

      {error ? <div className="alert alert-error">{error}</div> : null}

      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header">{editingId ? 'Edit Promo Code' : 'New Promo Code'}</div>
        <form className="form-grid" onSubmit={handleSubmit}>
          <label>
            Code
            <input
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
              placeholder="WELCOME50"
              required
              disabled={!!editingId}
            />
          </label>
          <label>
            Description
            <input
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="₹50 off first order"
            />
          </label>
          <label>
            Discount type
            <select
              value={form.discountType}
              onChange={(e) =>
                setForm({ ...form, discountType: e.target.value as 'flat' | 'percent' })
              }>
              <option value="flat">Flat (₹)</option>
              <option value="percent">Percent (%)</option>
            </select>
          </label>
          <label>
            Discount value
            <input
              type="number"
              min={1}
              max={form.discountType === 'percent' ? 100 : undefined}
              value={form.discountValue}
              onChange={(e) => setForm({ ...form, discountValue: Number(e.target.value) })}
              required
            />
          </label>
          <label>
            Min order value (₹)
            <input
              type="number"
              min={0}
              value={form.minOrderValue}
              onChange={(e) => setForm({ ...form, minOrderValue: Number(e.target.value) })}
            />
          </label>
          <label>
            Max discount (₹, for % only)
            <input
              type="number"
              min={0}
              value={form.maxDiscount}
              onChange={(e) => setForm({ ...form, maxDiscount: e.target.value })}
              disabled={form.discountType !== 'percent'}
            />
          </label>
          <label>
            Usage limit
            <input
              type="number"
              min={1}
              value={form.usageLimit}
              onChange={(e) => setForm({ ...form, usageLimit: e.target.value })}
              placeholder="Unlimited"
            />
          </label>
          <label>
            Expires on
            <input
              type="date"
              value={form.expiresAt}
              onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
            />
          </label>
          <div className="form-actions">
            <button type="submit" className="btn btn-primary">
              {editingId ? 'Update' : 'Create'}
            </button>
            {editingId ? (
              <button type="button" className="btn btn-secondary" onClick={resetForm}>
                Cancel
              </button>
            ) : null}
          </div>
        </form>
      </div>

      <div className="card">
        <div className="card-header">All Promo Codes</div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Discount</th>
              <th>Min order</th>
              <th>Usage</th>
              <th>Expires</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {promoCodes.length === 0 ? (
              <tr>
                <td colSpan={7}>No promo codes yet.</td>
              </tr>
            ) : (
              promoCodes.map((promo) => (
                <tr key={promo.id}>
                  <td>
                    <strong>{promo.code}</strong>
                    {promo.description ? (
                      <div style={{ fontSize: 12, color: '#6B7280' }}>{promo.description}</div>
                    ) : null}
                  </td>
                  <td>{formatDiscount(promo)}</td>
                  <td>₹{promo.minOrderValue}</td>
                  <td>
                    {promo.usedCount}
                    {promo.usageLimit != null ? ` / ${promo.usageLimit}` : ''}
                  </td>
                  <td>{promo.expiresAt ? promo.expiresAt.slice(0, 10) : '—'}</td>
                  <td>
                    <span className={`badge ${promo.active ? 'green' : 'red'}`}>
                      {promo.active ? 'Active' : 'Disabled'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button type="button" className="btn btn-secondary btn-sm" onClick={() => startEdit(promo)}>
                        Edit
                      </button>
                      <button
                        type="button"
                        className={`btn btn-sm ${promo.active ? 'btn-secondary' : 'btn-primary'}`}
                        onClick={() => toggleActive(promo)}>
                        {promo.active ? 'Disable' : 'Enable'}
                      </button>
                    </div>
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
