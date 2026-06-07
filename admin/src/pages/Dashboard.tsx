import PageHeader from '../components/PageHeader';
import '../components/shared.css';
import { useAdminStore } from '../store/AdminStore';

const statusBadge: Record<string, string> = {
  delivered: 'green',
  scheduled: 'yellow',
  processing: 'blue',
  cancelled: 'red',
};

export default function Dashboard() {
  const { products, orders, customers, settings } = useAdminStore();

  const revenue = orders
    .filter((order) => order.status === 'delivered')
    .reduce((sum, order) => sum + order.total, 0);

  const scheduledOrders = orders.filter((order) => order.status === 'scheduled').length;
  const lowStock = products.filter((product) => product.stock < 50).length;

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle={`Delivery cutoff: ${settings.deliveryCutoff} · ${settings.deliverySlot}`}
      />

      <div className="stats-grid">
        <div className="stat-card">
          <span>Total Revenue</span>
          <strong>₹{revenue}</strong>
          <small>From delivered orders</small>
        </div>
        <div className="stat-card">
          <span>Scheduled Orders</span>
          <strong>{scheduledOrders}</strong>
          <small>For next morning delivery</small>
        </div>
        <div className="stat-card">
          <span>Active Products</span>
          <strong>{products.filter((p) => p.active).length}</strong>
          <small>{products.length} total in catalog</small>
        </div>
        <div className="stat-card">
          <span>Customers</span>
          <strong>{customers.filter((c) => c.active).length}</strong>
          <small>{lowStock} products low on stock</small>
        </div>
      </div>

      <div className="card">
        <div className="card-header">Recent Orders</div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Customer</th>
                <th>Date</th>
                <th>Items</th>
                <th>Total</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {orders.slice(0, 5).map((order) => (
                <tr key={order.id}>
                  <td>{order.id}</td>
                  <td>{order.customerName}</td>
                  <td>{order.date}</td>
                  <td>{order.items}</td>
                  <td>₹{order.total}</td>
                  <td>
                    <span className={`badge ${statusBadge[order.status]}`}>
                      {order.status}
                    </span>
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
