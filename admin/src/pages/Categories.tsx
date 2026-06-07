import { useState, type FormEvent } from 'react';

import PageHeader from '../components/PageHeader';
import '../components/shared.css';
import { useAdminStore } from '../store/AdminStore';

export default function Categories() {
  const { categories, addCategory, deleteCategory } = useAdminStore();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', icon: 'grid', color: '#E8F5EE' });

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    await addCategory(form);
    setForm({ name: '', icon: 'grid', color: '#E8F5EE' });
    setShowModal(false);
  };

  return (
    <div>
      <PageHeader
        title="Categories"
        subtitle="Organize products by category"
        action={
          <button type="button" className="btn btn-primary" onClick={() => setShowModal(true)}>
            + Add Category
          </button>
        }
      />

      <div className="stats-grid">
        {categories.map((category) => (
          <div key={category.id} className="stat-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 12,
                  background: category.color,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 22,
                }}>
                📁
              </span>
              <button
                type="button"
                className="btn btn-danger btn-sm"
                onClick={() => deleteCategory(category.id)}>
                Delete
              </button>
            </div>
            <strong style={{ display: 'block', marginTop: 12 }}>{category.name}</strong>
            <small>ID: {category.id}</small>
          </div>
        ))}
      </div>

      {showModal ? (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
            <h3>Add Category</h3>
            <div className="form-grid">
              <label className="full">
                Name
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </label>
              <label>
                Icon key
                <input
                  value={form.icon}
                  onChange={(e) => setForm({ ...form, icon: e.target.value })}
                />
              </label>
              <label>
                Color
                <input
                  type="color"
                  value={form.color}
                  onChange={(e) => setForm({ ...form, color: e.target.value })}
                />
              </label>
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                Add Category
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
