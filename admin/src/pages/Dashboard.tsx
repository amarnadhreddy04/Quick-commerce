import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import OrderFilters from '../components/OrderFilters';
import PageHeader from '../components/PageHeader';
import '../components/shared.css';
import {
  calculateRevenue,
  defaultOrderFilters,
  filterOrders,
  filtersToSearchParams,
  getPeriodLabel,
  type OrderFilterState,
  type RevenueMode,
} from '../lib/orderFilters';
import { useAdminStore } from '../store/AdminStore';

const statusBadge: Record<string, string> = {
  delivered: 'green',
  scheduled: 'yellow',
  processing: 'blue',
  cancelled: 'red',
  pending_payment: 'yellow',
};

const revenueModes: { id: RevenueMode; label: string }[] = [
  { id: 'delivered', label: 'Delivered only' },
  { id: 'paid', label: 'Paid orders' },
  { id: 'all_except_cancelled', label: 'All except cancelled' },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const { products, orders, customers, settings } = useAdminStore();
  const [filters, setFilters] = useState<OrderFilterState>({
    ...defaultOrderFilters,
    period: 'month',
  });
  const [revenueMode, setRevenueMode] = useState<RevenueMode>('delivered');

  const filteredOrders = useMemo(() => filterOrders(orders, filters), [orders, filters]);
  const revenue = useMemo(
    () => calculateRevenue(filteredOrders, revenueMode),
    [filteredOrders, revenueMode]
  );

  const scheduledOrders = orders.filter((order) => order.status === 'scheduled').length;
  const lowStock = products.filter((product) => product.stock < 50).length;
  const ordersLink = `/orders?${filtersToSearchParams(filters).toString()}`;

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle={`Delivery cutoff: ${settings.deliveryCutoff} · ${settings.deliverySlot}`}
      />

      <div className="card filter-card">
        <div className="card-header">Revenue & Order Filters</div>
        <OrderFilters filters={filters} onChange={setFilters} showAdvanced={false} showSearch={false} />
        <div className="revenue-mode-row">
          <span className="filter-label">Revenue includes</span>
          <div className="filter-chips">
            {revenueModes.map((mode) => (
              <button
                key={mode.id}
                type="button"
                className={`filter-chip ${revenueMode === mode.id ? 'active' : ''}`}
                onClick={() => setRevenueMode(mode.id)}>
                {mode.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="stats-grid">
        <Link to={ordersLink} className="stat-card stat-card-link">
          <span>Revenue ({getPeriodLabel(filters.period)})</span>
          <strong>₹{revenue}</strong>
          <small>
            {filteredOrders.length} orders in range · {revenueModes.find((m) => m.id === revenueMode)?.label}
          </small>
        </Link>
        <Link to="/orders?status=scheduled" className="stat-card stat-card-link">
          <span>Scheduled Orders</span>
          <strong>{scheduledOrders}</strong>
          <small>For next morning delivery</small>
        </Link>
        <Link to="/products" className="stat-card stat-card-link">
          <span>Active Products</span>
          <strong>{products.filter((p) => p.active).length}</strong>
          <small>{products.length} total in catalog</small>
        </Link>
        <Link to="/customers" className="stat-card stat-card-link">
          <span>Customers</span>
          <strong>{customers.filter((c) => c.active).length}</strong>
          <small>{lowStock} products low on stock</small>
        </Link>
      </div>

      <div className="card">
        <div className="card-header">
          Recent Orders
          <span className="card-header-meta">{filteredOrders.length} matching</span>
        </div>
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
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={6}>No orders match the selected filters.</td>
                </tr>
              ) : (
                filteredOrders.slice(0, 5).map((order) => (
                  <tr
                    key={order.id}
                    className="clickable-row"
                    onClick={() => navigate(`/orders/${order.id}`)}>
                    <td>{order.id}</td>
                    <td>{order.customerName}</td>
                    <td>{order.date}</td>
                    <td>{order.items}</td>
                    <td>₹{order.total}</td>
                    <td>
                      <span className={`badge ${statusBadge[order.status] ?? 'yellow'}`}>
                        {order.status}
                      </span>
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
