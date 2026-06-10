import { useState, type FormEvent } from 'react';

import ImageUrlField from '../components/ImageUrlField';
import PageHeader from '../components/PageHeader';
import PincodeAvailabilityField from '../components/PincodeAvailabilityField';
import '../components/shared.css';
import { useAdminStore } from '../store/AdminStore';
import type { Category } from '../types';

const emptyCategory = {
  name: '',
  icon: 'grid',
  color: '#E8F5EE',
  thumbnail: '',
  description: '',
  pincodes: [] as string[],
};

export default function Categories() {
  const { categories, addCategory, updateCategory, deleteCategory } = useAdminStore();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [form, setForm] = useState(emptyCategory);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyCategory);
    setShowModal(true);
  };

  const openEdit = (category: Category) => {
    setEditing(category);
    setForm({
      name: category.name,
      icon: category.icon,
      color: category.color,
      thumbnail: category.thumbnail ?? '',
      description: category.description ?? '',
      pincodes: category.pincodes ?? [],
    });
    setShowModal(true);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const payload = {
      ...form,
      thumbnail: form.thumbnail.trim(),
      description: form.description.trim() || undefined,
      pincodes: form.pincodes,
    };

    if (editing) {
      await updateCategory(editing.id, payload);
    } else {
      await addCategory(payload);
    }
    setForm(emptyCategory);
    setShowModal(false);
  };

  return (
    <div>
      <PageHeader
        title="Categories"
        subtitle="Organize products with images and descriptions"
        action={
          <button type="button" className="btn btn-primary" onClick={openCreate}>
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
                  overflow: 'hidden',
                }}>
                {category.thumbnail?.startsWith('http') ? (
                  <img
                    src={category.thumbnail}
                    alt={category.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <span style={{ fontSize: 22 }}>📁</span>
                )}
              </span>
              <div className="actions">
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => openEdit(category)}>
                  Edit
                </button>
                <button
                  type="button"
                  className="btn btn-danger btn-sm"
                  onClick={() => deleteCategory(category.id)}>
                  Delete
                </button>
              </div>
            </div>
            <strong style={{ display: 'block', marginTop: 12 }}>{category.name}</strong>
            <small>ID: {category.id}</small>
            {category.description ? (
              <span className="description-snippet">{category.description}</span>
            ) : null}
            <div style={{ marginTop: 8 }}>
              {category.allLocations !== false && !category.pincodes?.length ? (
                <span className="location-chip">All locations</span>
              ) : (
                category.pincodes?.map((pincode) => (
                  <span key={`${category.id}-${pincode}`} className="location-chip">
                    {pincode}
                  </span>
                ))
              )}
            </div>
          </div>
        ))}
      </div>

      {showModal ? (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
            <h3>{editing ? 'Edit Category' : 'Add Category'}</h3>
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
              <ImageUrlField
                label="Category Image URL"
                value={form.thumbnail}
                onChange={(thumbnail) => setForm({ ...form, thumbnail })}
              />
              <label className="full">
                Description
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Describe this category for customers..."
                  rows={3}
                />
              </label>
              <PincodeAvailabilityField
                selected={form.pincodes}
                onChange={(pincodes) => setForm({ ...form, pincodes })}
              />
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                {editing ? 'Save Changes' : 'Add Category'}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
