import PageHeader from '../components/PageHeader';
import '../components/shared.css';
import { useAdminStore } from '../store/AdminStore';
import type { OrderStatus } from '../types';

const statuses: OrderStatus[] = ['scheduled', 'processing', 'delivered', 'cancelled'];

const statusBadge: Record<OrderStatus, string> = {
  delivered: 'green',
  scheduled: 'yellow',
  processing: 'blue',
  cancelled: 'red',
};

export default function Orders() {
  const { orders, updateOrderStatus } = useAdminStore();

  return (
    <div>
      <PageHeader
        title="Orders"
        subtitle="Track and update delivery status"
      />

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Customer</th>
                <th>Date</th>
                <th>Slot</th>
                <th>Items</th>
                <th>Total</th>
                <th>Status</th>
                <th>Update</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id}>
                  <td>{order.id}</td>
                  <td>{order.customerName}</td>
                  <td>{order.date}</td>
                  <td>{order.deliverySlot}</td>
                  <td>{order.items}</td>
                  <td>₹{order.total}</td>
                  <td>
                    <span className={`badge ${statusBadge[order.status]}`}>
                      {order.status}
                    </span>
                  </td>
                  <td>
                    <select
                      value={order.status}
                      onChange={(event) =>
                        updateOrderStatus(order.id, event.target.value as OrderStatus)
                      }>
                      {statuses.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
