import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import PageHeader from '../components/PageHeader';
import '../components/shared.css';
import { api } from '../lib/api';
import { useAdminStore } from '../store/AdminStore';
import type { OrderDetail } from '../types';

export default function VendorOrderDetail() {
  const { orderId } = useParams<{ orderId: string }>();
  const { refreshAll } = useAdminStore();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orderId) return;
    api
      .getOrder(orderId)
      .then((response) => setOrder(response.order as OrderDetail))
      .catch((err: Error) => setError(err.message));
  }, [orderId]);

  if (error || !order) {
    return (
      <div>
        <PageHeader title="Order Details" subtitle={error ?? 'Loading...'} />
        <Link to="/vendor/orders" className="btn btn-secondary">
          Back
        </Link>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={`Order ${order.id}`}
        subtitle={`${order.storeLabel ?? 'Your store'} · ${order.deliverySlot} · Payout ₹${order.wholesaleCost ?? 0}`}
        action={
          <Link to="/vendor/orders" className="btn btn-secondary">
            Back
          </Link>
        }
      />

      <div className="card detail-card" style={{ marginBottom: 24 }}>
        <div className="detail-body">
          <p>
            <strong>Customer:</strong> {order.customerName}
          </p>
          <p>
            <strong>Location:</strong> {order.customerLocation ?? '—'}
            {order.customerPincode ? ` · ${order.customerPincode}` : ''}
          </p>
          <p>
            <strong>Pack status:</strong> {order.wholesalerStatus ?? 'assigned'}
          </p>
          <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
            {order.wholesalerStatus === 'assigned' ? (
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={async () => {
                  await api.updateWholesalerOrderStatus(order.id, 'packed', order.vendorTaskId);
                  const response = await api.getOrder(order.id);
                  setOrder(response.order as OrderDetail);
                  await refreshAll();
                }}>
                Mark packed
              </button>
            ) : null}
            {order.wholesalerStatus === 'packed' ? (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={async () => {
                  await api.updateWholesalerOrderStatus(order.id, 'ready', order.vendorTaskId);
                  const response = await api.getOrder(order.id);
                  setOrder(response.order as OrderDetail);
                  await refreshAll();
                }}>
                Ready for pickup
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">Items to pack</div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>Qty</th>
                <th>Your rate</th>
                <th>Line total</th>
              </tr>
            </thead>
            <tbody>
              {order.lineItems.map((item) => (
                <tr key={`${order.id}-${item.productId}`}>
                  <td>
                    {item.productName}
                    <br />
                    <small>
                      {item.brand} · {item.unit}
                    </small>
                  </td>
                  <td>{item.quantity}</td>
                  <td>₹{item.wholesalePrice ?? 0}</td>
                  <td>₹{item.lineTotal}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
