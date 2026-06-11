import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import PageHeader from '../components/PageHeader';
import '../components/shared.css';
import { api } from '../lib/api';
import {
  formatPaymentSummary,
  paymentStatusBadgeKey,
} from '../lib/paymentLabels';
import type { OrderDetail as OrderDetailType, Rider } from '../types';

const statusBadge: Record<string, string> = {
  delivered: 'green',
  scheduled: 'yellow',
  processing: 'blue',
  cancelled: 'red',
  pending_payment: 'yellow',
  paid: 'green',
  pending: 'yellow',
  failed: 'red',
  cod: 'yellow',
};

export default function OrderDetail() {
  const { orderId } = useParams<{ orderId: string }>();
  const [order, setOrder] = useState<OrderDetailType | null>(null);
  const [riders, setRiders] = useState<Rider[]>([]);
  const [selectedRiderId, setSelectedRiderId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);

  const loadOrder = async () => {
    if (!orderId) return;
    const response = await api.getOrder(orderId);
    setOrder(response.order as OrderDetailType);
  };

  useEffect(() => {
    if (!orderId) return;

    Promise.all([loadOrder(), api.getRiders().then((res) => setRiders(res.riders as Rider[]))])
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [orderId]);

  const assignRider = async () => {
    if (!orderId || !selectedRiderId) return;
    setAssigning(true);
    setError(null);
    try {
      await api.assignRiderToOrder(orderId, selectedRiderId);
      await loadOrder();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to assign rider');
    } finally {
      setAssigning(false);
    }
  };

  if (loading) {
    return <div style={{ padding: 24 }}>Loading order...</div>;
  }

  if (error || !order) {
    return (
      <div>
        <PageHeader title="Order Details" subtitle={error ?? 'Order not found'} />
        <Link to="/orders" className="btn btn-secondary">
          Back to Orders
        </Link>
      </div>
    );
  }

  const locationLabel = [
    order.customerLocation,
    order.customerPincode ? `Pincode ${order.customerPincode}` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <div>
      <PageHeader
        title={`Order ${order.id}`}
        subtitle={`Placed on ${order.date} · ${order.deliverySlot}`}
        action={
          <Link to="/orders" className="btn btn-secondary">
            Back to Orders
          </Link>
        }
      />

      <div className="detail-grid">
        <div className="card detail-card">
          <div className="card-header">Customer</div>
          <div className="detail-body">
            <p>
              <strong>Name:</strong> {order.customerName}
            </p>
            <p>
              <strong>Email:</strong> {order.customerEmail ?? '—'}
            </p>
            <p>
              <strong>Phone:</strong> {order.customerPhone ?? '—'}
            </p>
            <p>
              <strong>Location:</strong> {locationLabel || '—'}
            </p>
          </div>
        </div>

        <div className="card detail-card">
          <div className="card-header">Order Summary</div>
          <div className="detail-body">
            <p>
              <strong>Status:</strong>{' '}
              <span className={`badge ${statusBadge[order.status] ?? 'yellow'}`}>{order.status}</span>
            </p>
            <p>
              <strong>Payment:</strong>{' '}
              <span
                className={`badge ${statusBadge[paymentStatusBadgeKey(order.paymentStatus, order.paymentMethod)]}`}>
                {formatPaymentSummary(order.paymentMethod, order.paymentStatus)}
              </span>
            </p>
            <p>
              <strong>Items:</strong> {order.items}
            </p>
            {order.promoDiscount ? (
              <p>
                <strong>Promo:</strong> {order.promoCode} (−₹{order.promoDiscount})
              </p>
            ) : null}
            <p>
              <strong>Total:</strong> ₹{order.total}
            </p>
            <p>
              <strong>Delivery slot:</strong> {order.deliverySlot}
            </p>
            {order.vendorTasks && order.vendorTasks.length > 0 ? (
              <p>
                <strong>Vendor stores:</strong> {order.vendorTasks.length} packing task
                {order.vendorTasks.length === 1 ? '' : 's'}
              </p>
            ) : order.wholesalerShopName ? (
              <p>
                <strong>Wholesaler:</strong> {order.wholesalerShopName}
                {order.wholesalerName ? ` (${order.wholesalerName})` : ''}
              </p>
            ) : null}
            {order.wholesaleCost != null && !order.vendorTasks?.length ? (
              <p>
                <strong>Pay wholesaler:</strong> ₹{order.wholesaleCost}
              </p>
            ) : null}
            {order.riderName ? (
              <p>
                <strong>Rider:</strong> {order.riderName}
                {order.riderPhone ? ` (${order.riderPhone})` : ''}
              </p>
            ) : null}
            {order.riderStatus ? (
              <p>
                <strong>Delivery status:</strong> {order.riderStatus}
              </p>
            ) : null}
            {order.status !== 'delivered' && order.status !== 'cancelled' ? (
              <div style={{ marginTop: 12 }}>
                <label style={{ display: 'block', marginBottom: 8 }}>
                  Assign rider
                  <select
                    value={selectedRiderId}
                    onChange={(e) => setSelectedRiderId(e.target.value)}
                    style={{ display: 'block', width: '100%', marginTop: 4 }}>
                    <option value="">Select rider</option>
                    {riders.map((rider) => (
                      <option key={rider.id} value={rider.id}>
                        {rider.name} · {rider.pincode}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  disabled={!selectedRiderId || assigning}
                  onClick={assignRider}>
                  {assigning ? 'Assigning...' : 'Assign to rider'}
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {order.vendorTasks && order.vendorTasks.length > 0 ? (
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card-header">Vendor packing tasks</div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Store</th>
                  <th>Shop</th>
                  <th>Items</th>
                  <th>Payout</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {order.vendorTasks.map((task) => (
                  <tr key={task.id}>
                    <td>{task.storeLabel}</td>
                    <td>{task.shopName ?? '—'}</td>
                    <td>{task.itemCount}</td>
                    <td>₹{task.wholesaleCost}</td>
                    <td>
                      <span className={`badge ${statusBadge[task.status] ?? 'yellow'}`}>
                        {task.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      <div className="card">
        <div className="card-header">Ordered Items</div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>Store / Vendor</th>
                <th>Qty</th>
                <th>Price</th>
                <th>Wholesale</th>
                <th>Line Total</th>
              </tr>
            </thead>
            <tbody>
              {order.lineItems.length === 0 ? (
                <tr>
                  <td colSpan={6}>No line items recorded for this order.</td>
                </tr>
              ) : (
                order.lineItems.map((item) => (
                  <tr key={`${order.id}-${item.productId}`}>
                    <td>
                      {item.image?.startsWith('http') ? (
                        <img
                          src={item.image}
                          alt={item.productName}
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
                      {item.productName}
                      <br />
                      <small>
                        {item.brand} · {item.unit}
                      </small>
                    </td>
                    <td>
                      {item.storeLabel ?? '—'}
                      {item.vendorShopName ? (
                        <>
                          <br />
                          <small>{item.vendorShopName}</small>
                        </>
                      ) : null}
                    </td>
                    <td>{item.quantity}</td>
                    <td>₹{item.price}</td>
                    <td>{item.wholesalePrice != null ? `₹${item.wholesalePrice}` : '—'}</td>
                    <td>₹{item.lineTotal}</td>
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
