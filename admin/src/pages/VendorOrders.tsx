import { Link } from 'react-router-dom';

import PageHeader from '../components/PageHeader';
import '../components/shared.css';
import { api } from '../lib/api';
import { useAdminStore } from '../store/AdminStore';
import type { Order } from '../types';

const statusLabels: Record<string, string> = {
  assigned: 'Awaiting pack',
  packed: 'Packed',
  ready: 'Ready for pickup',
};

export default function VendorOrders() {
  const { orders, refreshAll } = useAdminStore();

  const updateStatus = async (orderId: string, status: string, vendorTaskId?: string) => {
    await api.updateWholesalerOrderStatus(orderId, status, vendorTaskId);
    await refreshAll();
  };

  return (
    <div>
      <PageHeader
        title="My Orders"
        subtitle="Orders sent to your shop for packing"
      />

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Order</th>
                <th>Store</th>
                <th>Customer</th>
                <th>Items</th>
                <th>Your payout</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={7}>No orders assigned to you yet.</td>
                </tr>
              ) : (
                orders.map((order: Order) => (
                  <tr key={order.vendorTaskId ?? order.id}>
                    <td>
                      <Link to={`/vendor/orders/${order.id}`}>{order.id}</Link>
                      <br />
                      <small>{order.deliverySlot}</small>
                    </td>
                    <td>{order.storeLabel ?? 'Your store'}</td>
                    <td>{order.customerName}</td>
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
