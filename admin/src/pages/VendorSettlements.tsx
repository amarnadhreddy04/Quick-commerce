import { useEffect, useState } from 'react';

import PageHeader from '../components/PageHeader';
import '../components/shared.css';
import { api } from '../lib/api';
import { useAdminStore } from '../store/AdminStore';

type ProductRow = {
  productId: string;
  productName: string;
  unit: string;
  totalQuantity: number;
  wholesalePrice: number;
  lineTotal: number;
};

export default function VendorSettlements() {
  const { user } = useAdminStore();
  const [period, setPeriod] = useState<'week' | 'month'>('week');
  const [totalPayable, setTotalPayable] = useState(0);
  const [orderCount, setOrderCount] = useState(0);
  const [breakdown, setBreakdown] = useState<ProductRow[]>([]);

  useEffect(() => {
    if (!user?.wholesalerId) return;
    api
      .getWholesalerSettlement(user.wholesalerId, period)
      .then((data) => {
        setBreakdown(data.productBreakdown as ProductRow[]);
        setTotalPayable((data.totals as { totalPayable: number }).totalPayable ?? 0);
        setOrderCount((data.totals as { orderCount: number }).orderCount ?? 0);
      })
      .catch(() => undefined);
  }, [user?.wholesalerId, period]);

  return (
    <div>
      <PageHeader
        title="My Payments"
        subtitle="Weekly and monthly payout summary for your packed orders"
      />

      <div className="card filter-card">
        <label>
          Period
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as 'week' | 'month')}>
            <option value="week">Weekly (last 7 days)</option>
            <option value="month">Monthly (this month)</option>
          </select>
        </label>
      </div>

      <div className="summary-strip">
        <div className="summary-pill">
          <span>Packed orders</span>
          <strong>{orderCount}</strong>
        </div>
        <div className="summary-pill">
          <span>Amount to receive</span>
          <strong>₹{totalPayable}</strong>
        </div>
      </div>

      <div className="card">
        <div className="card-header">Product breakdown</div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>Qty packed</th>
                <th>Rate</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {breakdown.length === 0 ? (
                <tr>
                  <td colSpan={4}>No packed orders in this period yet.</td>
                </tr>
              ) : (
                breakdown.map((row) => (
                  <tr key={`${row.productId}-${row.wholesalePrice}`}>
                    <td>
                      {row.productName}
                      <br />
                      <small>{row.unit}</small>
                    </td>
                    <td>{row.totalQuantity}</td>
                    <td>₹{row.wholesalePrice}</td>
                    <td>₹{row.lineTotal}</td>
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
