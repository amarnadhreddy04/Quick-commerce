import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import PageHeader from '../components/PageHeader';
import '../components/shared.css';
import { api } from '../lib/api';
import type { OrderDetail as OrderDetailType } from '../types';

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
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orderId) return;

    api
      .getOrder(orderId)
      .then((response) => setOrder(response.order as OrderDetailType))
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [orderId]);

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
              <span className={`badge ${statusBadge[order.paymentStatus ?? 'pending']}`}>
                {order.paymentMethod ?? '—'} · {order.paymentStatus ?? 'pending'}
              </span>
            </p>
            <p>
              <strong>Items:</strong> {order.items}
            </p>
            <p>
              <strong>Total:</strong> ₹{order.total}
            </p>
            <p>
              <strong>Delivery slot:</strong> {order.deliverySlot}
            </p>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">Ordered Items</div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>Qty</th>
                <th>Price</th>
                <th>Line Total</th>
              </tr>
            </thead>
            <tbody>
              {order.lineItems.length === 0 ? (
                <tr>
                  <td colSpan={4}>No line items recorded for this order.</td>
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
                    <td>{item.quantity}</td>
                    <td>₹{item.price}</td>
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
