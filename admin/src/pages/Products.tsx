import { useState, type FormEvent } from 'react';

import PageHeader from '../components/PageHeader';
import PincodeAvailabilityField from '../components/PincodeAvailabilityField';
import ProductImagesField, {
  MAX_PRODUCT_IMAGES,
  MIN_PRODUCT_IMAGES,
} from '../components/ProductImagesField';
import '../components/shared.css';
import { useAdminStore } from '../store/AdminStore';
import type { Product } from '../types';

type ProductForm = {
  name: string;
  brand: string;
  categoryId: string;
  price: number;
  mrp: number;
  unit: string;
  images: string[];
  description: string;
  stock: number;
  active: boolean;
  subscription: boolean;
  pincodes: string[];
};

const emptyProduct: ProductForm = {
  name: '',
  brand: '',
  categoryId: 'milk',
  price: 0,
  mrp: 0,
  unit: '',
  images: ['', ''],
  description: '',
  stock: 0,
  active: true,
  subscription: false,
  pincodes: [],
};

function getProductImages(product: Product): string[] {
  if (product.images?.length) {
    return product.images;
  }
  return product.image ? [product.image, product.image] : ['', ''];
}

function validateImages(images: string[]): string | null {
  const cleaned = images.map((item) => item.trim()).filter(Boolean);
  if (cleaned.length < MIN_PRODUCT_IMAGES) {
    return `Add at least ${MIN_PRODUCT_IMAGES} image URLs`;
  }
  if (cleaned.length > MAX_PRODUCT_IMAGES) {
    return `Maximum ${MAX_PRODUCT_IMAGES} images allowed`;
  }
  if (cleaned.some((url) => !(url.startsWith('http://') || url.startsWith('https://')))) {
    return 'Each image must be a valid URL';
  }
  return null;
}

export default function Products() {
  const { products, categories, addProduct, updateProduct, deleteProduct } = useAdminStore();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState<ProductForm>(emptyProduct);
  const [imageError, setImageError] = useState<string | null>(null);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyProduct);
    setImageError(null);
    setShowModal(true);
  };

  const openEdit = (product: Product) => {
    const images = getProductImages(product);
    setEditing(product);
    setForm({
      name: product.name,
      brand: product.brand,
      categoryId: product.categoryId,
      price: product.price,
      mrp: product.mrp ?? 0,
      unit: product.unit,
      images: images.length >= MIN_PRODUCT_IMAGES ? images : [...images, ''],
      description: product.description ?? '',
      stock: product.stock,
      active: product.active,
      subscription: product.subscription ?? false,
      pincodes: product.pincodes ?? [],
    });
    setImageError(null);
    setShowModal(true);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    const validationError = validateImages(form.images);
    if (validationError) {
      setImageError(validationError);
      return;
    }

    const images = form.images.map((item) => item.trim()).filter(Boolean);
    const payload = {
      name: form.name,
      brand: form.brand,
      categoryId: form.categoryId,
      price: form.price,
      mrp: form.mrp || undefined,
      unit: form.unit,
      images,
      image: images[0],
      description: form.description.trim() || undefined,
      stock: form.stock,
      active: form.active,
      subscription: form.subscription || undefined,
      pincodes: form.pincodes,
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
        subtitle="Each product needs 2 to 5 image URLs"
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
                <th>Locations</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => {
                const images = getProductImages(product);
                return (
                  <tr key={product.id}>
                    <td>
                      <div className="product-thumb-strip">
                        {images.slice(0, 3).map((image, index) =>
                          image.startsWith('http') ? (
                            <img key={`${product.id}-${index}`} src={image} alt={product.name} />
                          ) : null
                        )}
                      </div>
                      {product.name}
                      <br />
                      <small>
                        {product.brand} · {product.unit} · {images.length} images
                      </small>
                      {product.description ? (
                        <span className="description-snippet">{product.description}</span>
                      ) : null}
                    </td>
                    <td>{getCategoryName(product.categoryId)}</td>
                    <td>₹{product.price}</td>
                    <td>{product.stock}</td>
                    <td>
                      {product.allLocations !== false && !product.pincodes?.length ? (
                        <span className="location-chip">All locations</span>
                      ) : (
                        product.pincodes?.map((pincode) => (
                          <span key={`${product.id}-${pincode}`} className="location-chip">
                            {pincode}
                          </span>
                        ))
                      )}
                    </td>
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
                );
              })}
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
              <ProductImagesField
                images={form.images}
                onChange={(images) => {
                  setForm({ ...form, images });
                  setImageError(null);
                }}
                error={imageError}
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
                {editing ? 'Save Changes' : 'Add Product'}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
