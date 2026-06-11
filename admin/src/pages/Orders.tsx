import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import OrderFilters from '../components/OrderFilters';
import PageHeader from '../components/PageHeader';
import '../components/shared.css';
import {
  calculateRevenue,
  filterOrders,
  filtersFromSearchParams,
  filtersToSearchParams,
  getPeriodLabel,
  type OrderFilterState,
} from '../lib/orderFilters';
import {
  formatPaymentSummary,
  paymentStatusBadgeKey,
} from '../lib/paymentLabels';
import { useAdminStore } from '../store/AdminStore';
import type { OrderStatus } from '../types';

const statuses: OrderStatus[] = ['scheduled', 'processing', 'delivered', 'cancelled', 'pending_payment'];

const statusBadge: Record<string, string> = {
  delivered: 'green',
  scheduled: 'yellow',
  processing: 'blue',
  cancelled: 'red',
  pending_payment: 'yellow',
  paid: 'green',
  pending: 'yellow',
  failed: 'red',
};

export default function Orders() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { orders, updateOrderStatus } = useAdminStore();
  const [filters, setFilters] = useState<OrderFilterState>(() =>
    filtersFromSearchParams(searchParams)
  );
  useEffect(() => {
    setFilters(filtersFromSearchParams(searchParams));
  }, [searchParams]);

  const filteredOrders = useMemo(() => filterOrders(orders, filters), [orders, filters]);
  const deliveredRevenue = useMemo(
    () => calculateRevenue(filteredOrders, 'delivered'),
    [filteredOrders]
  );
  const paidRevenue = useMemo(() => calculateRevenue(filteredOrders, 'paid'), [filteredOrders]);
  const totalSales = useMemo(
    () => calculateRevenue(filteredOrders, 'all_except_cancelled'),
    [filteredOrders]
  );

  const updateFilters = (next: OrderFilterState) => {
    setFilters(next);
    setSearchParams(filtersToSearchParams(next), { replace: true });
  };

  return (
    <div>
      <PageHeader title="Orders" subtitle="Filter, track, and update delivery status" />

      <div className="card filter-card">
        <div className="card-header">Filters</div>
        <OrderFilters filters={filters} onChange={updateFilters} />
      </div>

      <div className="summary-strip">
        <div className="summary-pill">
          <span>Period</span>
          <strong>{getPeriodLabel(filters.period)}</strong>
        </div>
        <div className="summary-pill">
          <span>Orders</span>
          <strong>{filteredOrders.length}</strong>
        </div>
        <div className="summary-pill">
          <span>Delivered Revenue</span>
          <strong>₹{deliveredRevenue}</strong>
        </div>
        <div className="summary-pill">
          <span>Paid Revenue</span>
          <strong>₹{paidRevenue}</strong>
        </div>
        <div className="summary-pill">
          <span>Total Sales</span>
          <strong>₹{totalSales}</strong>
        </div>
      </div>

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
                <th>Payment</th>
                <th>Status</th>
                <th>Update</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={9}>
                    {orders.length === 0
                      ? 'No orders yet. Place a test order from the app, or restart the server to restore the demo order.'
                      : 'No orders match the selected filters. Try changing the period to All Time.'}
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => (
                  <tr
                    key={order.id}
                    className="clickable-row"
                    onClick={() => navigate(`/orders/${order.id}`)}>
                    <td>{order.id}</td>
                    <td>{order.customerName}</td>
                    <td>{order.date}</td>
                    <td>{order.deliverySlot}</td>
                    <td>{order.items}</td>
                    <td>₹{order.total}</td>
                    <td>
                      <span
                        className={`badge ${statusBadge[paymentStatusBadgeKey(order.paymentStatus, order.paymentMethod)]}`}>
                        {formatPaymentSummary(order.paymentMethod, order.paymentStatus)}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${statusBadge[order.status] ?? 'yellow'}`}>
                        {order.status}
                      </span>
                    </td>
                    <td onClick={(event) => event.stopPropagation()}>
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
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
