import { useState, type FormEvent } from 'react';

import ImageUrlField from '../components/ImageUrlField';
import PageHeader from '../components/PageHeader';
import '../components/shared.css';
import { useAdminStore } from '../store/AdminStore';
import type { Product } from '../types';

const emptyProduct = {
  name: '',
  brand: '',
  categoryId: 'milk',
  price: 0,
  mrp: 0,
  unit: '',
  image: '',
  description: '',
  stock: 0,
  active: true,
  subscription: false,
};

export default function Products() {
  const { products, categories, addProduct, updateProduct, deleteProduct } = useAdminStore();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState(emptyProduct);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyProduct);
    setShowModal(true);
  };

  const openEdit = (product: Product) => {
    setEditing(product);
    setForm({
      name: product.name,
      brand: product.brand,
      categoryId: product.categoryId,
      price: product.price,
      mrp: product.mrp ?? 0,
      unit: product.unit,
      image: product.image,
      description: product.description ?? '',
      stock: product.stock,
      active: product.active,
      subscription: product.subscription ?? false,
    });
    setShowModal(true);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const payload = {
      ...form,
      mrp: form.mrp || undefined,
      subscription: form.subscription || undefined,
      description: form.description.trim() || undefined,
      image: form.image.trim(),
    };

    if (editing) {
      await updateProduct(editing.id, payload);
    } else {
      await addProduct(payload);
    }
    setShowModal(false);
  };

  const getCategoryName = (id: string) =>
    categories.find((category) => category.id === id)?.name ?? id;

  return (
    <div>
      <PageHeader
        title="Products"
        subtitle="Manage catalog, images, descriptions, pricing, and stock"
        action={
          <button type="button" className="btn btn-primary" onClick={openCreate}>
            + Add Product
          </button>
        }
      />

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>Category</th>
                <th>Price</th>
                <th>Stock</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id}>
                  <td>
                    {product.image?.startsWith('http') ? (
                      <img
                        src={product.image}
                        alt={product.name}
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 8,
                          objectFit: 'cover',
                          marginRight: 8,
                          verticalAlign: 'middle',
                        }}
                      />
                    ) : null}
                    {product.name}
                    <br />
                    <small>
                      {product.brand} · {product.unit}
                    </small>
                    {product.description ? (
                      <span className="description-snippet">{product.description}</span>
                    ) : null}
                  </td>
                  <td>{getCategoryName(product.categoryId)}</td>
                  <td>₹{product.price}</td>
                  <td>{product.stock}</td>
                  <td>
                    <span className={`badge ${product.active ? 'green' : 'red'}`}>
                      {product.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="actions">
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => openEdit(product)}>
                      Edit
                    </button>
                    <button
                      type="button"
                      className="btn btn-danger btn-sm"
                      onClick={() => deleteProduct(product.id)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal ? (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
            <h3>{editing ? 'Edit Product' : 'Add Product'}</h3>
            <div className="form-grid">
              <label>
                Name
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </label>
              <label>
                Brand
                <input
                  value={form.brand}
                  onChange={(e) => setForm({ ...form, brand: e.target.value })}
                  required
                />
              </label>
              <label>
                Category
                <select
                  value={form.categoryId}
                  onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Unit
                <input
                  value={form.unit}
                  onChange={(e) => setForm({ ...form, unit: e.target.value })}
                  required
                />
              </label>
              <label>
                Price (₹)
                <input
                  type="number"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
                  required
                />
              </label>
              <label>
                MRP (₹)
                <input
                  type="number"
                  value={form.mrp}
                  onChange={(e) => setForm({ ...form, mrp: Number(e.target.value) })}
                />
              </label>
              <label>
                Stock
                <input
                  type="number"
                  value={form.stock}
                  onChange={(e) => setForm({ ...form, stock: Number(e.target.value) })}
                  required
                />
              </label>
              <ImageUrlField
                label="Product Image URL"
                value={form.image}
                onChange={(image) => setForm({ ...form, image })}
              />
              <label className="full">
                Description
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Short product description for customers..."
                  rows={3}
                />
              </label>
              <label className="full">
                <input
                  type="checkbox"
                  checked={form.subscription}
                  onChange={(e) => setForm({ ...form, subscription: e.target.checked })}
                />{' '}
                Available for subscription
              </label>
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                {editing ? 'Save Changes' : 'Add Product'}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
