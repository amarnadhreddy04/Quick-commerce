import { useEffect, useState } from 'react';

import PageHeader from '../components/PageHeader';
import '../components/shared.css';
import { api } from '../lib/api';
import type { Wholesaler } from '../types';

type SummaryRow = Wholesaler & {
  orderCount: number;
  totalItems: number;
  totalPayable: number;
};

type ProductRow = {
  productId: string;
  productName: string;
  unit: string;
  totalQuantity: number;
  wholesalePrice: number;
  lineTotal: number;
};

export default function Settlements() {
  const [period, setPeriod] = useState<'week' | 'month'>('week');
  const [summary, setSummary] = useState<SummaryRow[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [breakdown, setBreakdown] = useState<ProductRow[]>([]);
  const [detailTotal, setDetailTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const loadSummary = async () => {
    const { summary: rows } = await api.getSettlementSummary(period);
    setSummary(rows as SummaryRow[]);
    if (!selectedId && rows.length > 0) {
      setSelectedId((rows[0] as SummaryRow).id);
    }
  };

  const loadDetail = async (id: string) => {
    if (!id) return;
    const data = await api.getWholesalerSettlement(id, period);
    setBreakdown(data.productBreakdown as ProductRow[]);
    setDetailTotal((data.totals as { totalPayable: number }).totalPayable ?? 0);
  };

  useEffect(() => {
    setLoading(true);
    loadSummary()
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, [period]);

  useEffect(() => {
    if (selectedId) {
      loadDetail(selectedId).catch(() => undefined);
    }
  }, [selectedId, period]);

  if (loading) {
    return <div style={{ padding: 24 }}>Loading settlements...</div>;
  }

  return (
    <div>
      <PageHeader
        title="Wholesaler Settlements"
        subtitle="Track product quantities and how much to pay each shopkeeper"
      />

      <div className="card filter-card">
        <label>
          Settlement period
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as 'week' | 'month')}>
            <option value="week">Weekly (last 7 days)</option>
            <option value="month">Monthly (this month)</option>
          </select>
        </label>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header">Payable summary</div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Shop</th>
                <th>Owner</th>
                <th>Cycle</th>
                <th>Orders</th>
                <th>Items packed</th>
                <th>Amount to pay</th>
              </tr>
            </thead>
            <tbody>
              {summary.length === 0 ? (
                <tr>
                  <td colSpan={6}>No wholesaler payouts for this period yet.</td>
                </tr>
              ) : (
                summary.map((row) => (
                  <tr
                    key={row.id}
                    className={row.id === selectedId ? 'clickable-row' : ''}
                    onClick={() => setSelectedId(row.id)}>
                    <td>{row.shopName}</td>
                    <td>{row.name}</td>
                    <td>{row.settlementCycle}</td>
                    <td>{row.orderCount}</td>
                    <td>{row.totalItems}</td>
                    <td>
                      <strong>₹{row.totalPayable}</strong>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedId ? (
        <div className="card">
          <div className="card-header">
            Product breakdown · Total payable ₹{detailTotal}
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Qty packed</th>
                  <th>Wholesale rate</th>
                  <th>Line total</th>
                </tr>
              </thead>
              <tbody>
                {breakdown.length === 0 ? (
                  <tr>
                    <td colSpan={4}>No packed products in this period.</td>
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
      ) : null}
    </div>
  );
}
