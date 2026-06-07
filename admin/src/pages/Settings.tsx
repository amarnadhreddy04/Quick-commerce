import { useState, type FormEvent } from 'react';

import PageHeader from '../components/PageHeader';
import '../components/shared.css';
import { useAdminStore } from '../store/AdminStore';

export default function Settings() {
  const { settings, updateSettings } = useAdminStore();
  const [form, setForm] = useState(settings);
  const [saved, setSaved] = useState(false);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    updateSettings(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div>
      <PageHeader
        title="Settings"
        subtitle="Configure delivery rules and fees"
      />

      <form className="card" style={{ padding: 24, maxWidth: 560 }} onSubmit={handleSubmit}>
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
    </div>
  );
}
