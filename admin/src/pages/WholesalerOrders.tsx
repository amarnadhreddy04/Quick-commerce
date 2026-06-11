import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import PageHeader from '../components/PageHeader';
import '../components/shared.css';
import { api } from '../lib/api';
import type { Order, Wholesaler } from '../types';

const statusLabels: Record<string, string> = {
  assigned: 'Awaiting pack',
  packed: 'Packed',
  ready: 'Ready for pickup',
};

export default function WholesalerOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [wholesalers, setWholesalers] = useState<Wholesaler[]>([]);
  const [wholesalerId, setWholesalerId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    const [queueRes, wholesalerRes] = await Promise.all([
      api.getWholesalerQueue(wholesalerId ? { wholesalerId } : undefined),
      api.getWholesalers(),
    ]);
    setOrders(queueRes.orders as Order[]);
    setWholesalers(wholesalerRes.wholesalers as Wholesaler[]);
  };

  useEffect(() => {
    load()
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [wholesalerId]);

  const updateStatus = async (orderId: string, status: string, vendorTaskId?: string) => {
    await api.updateWholesalerOrderStatus(orderId, status, vendorTaskId);
    await load();
  };

  if (loading) {
    return <div style={{ padding: 24 }}>Loading wholesaler orders...</div>;
  }

  return (
    <div>
      <PageHeader
        title="Wholesaler Packing Queue"
        subtitle="Each store vendor receives only their items from mixed orders"
      />

      <div className="card filter-card">
        <label>
          Filter by wholesaler
          <select value={wholesalerId} onChange={(e) => setWholesalerId(e.target.value)}>
            <option value="">All wholesalers</option>
            {wholesalers.map((row) => (
              <option key={row.id} value={row.id}>
                {row.shopName}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error ? <p style={{ color: '#dc2626' }}>{error}</p> : null}

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Order</th>
                <th>Customer</th>
                <th>Store</th>
                <th>Wholesaler</th>
                <th>Items</th>
                <th>Pay wholesaler</th>
                <th>Pack status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={8}>No orders waiting with wholesalers right now.</td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr key={order.vendorTaskId ?? order.id}>
                    <td>
                      <Link to={`/orders/${order.id}`}>{order.id}</Link>
                      <br />
                      <small>{order.deliverySlot}</small>
                    </td>
                    <td>{order.customerName}</td>
                    <td>{order.storeLabel ?? '—'}</td>
                    <td>{order.wholesalerShopName ?? '—'}</td>
                    <td>{order.items}</td>
                    <td>₹{order.wholesaleCost ?? 0}</td>
                    <td>
                      <span className="badge yellow">
                        {statusLabels[order.wholesalerStatus ?? 'assigned'] ?? order.wholesalerStatus}
                      </span>
                    </td>
                    <td>
                      {order.wholesalerStatus === 'assigned' ? (
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          onClick={() => updateStatus(order.id, 'packed', order.vendorTaskId)}>
                          Mark packed
                        </button>
                      ) : null}
                      {order.wholesalerStatus === 'packed' ? (
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => updateStatus(order.id, 'ready', order.vendorTaskId)}>
                          Ready for pickup
                        </button>
                      ) : null}
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
