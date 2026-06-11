import { Link } from 'react-router-dom';

import PageHeader from '../components/PageHeader';
import '../components/shared.css';
import { useAdminStore } from '../store/AdminStore';

export default function VendorHome() {
  const { user, orders } = useAdminStore();
  const pending = orders.filter((order) => order.wholesalerStatus === 'assigned').length;
  const packed = orders.filter((order) => order.wholesalerStatus === 'packed').length;

  return (
    <div>
      <PageHeader
        title={`Welcome, ${user?.name ?? 'Vendor'}`}
        subtitle="Pack customer orders and track your weekly or monthly payouts"
      />

      <div className="summary-strip">
        <div className="summary-pill">
          <span>Awaiting pack</span>
          <strong>{pending}</strong>
        </div>
        <div className="summary-pill">
          <span>Packed</span>
          <strong>{packed}</strong>
        </div>
        <div className="summary-pill">
          <span>Total orders</span>
          <strong>{orders.length}</strong>
        </div>
      </div>

      <div className="detail-grid">
        <Link to="/vendor/orders" className="card detail-card" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className="card-header">My Orders</div>
          <div className="detail-body">
            <p>See packing lists for orders assigned to your shop.</p>
          </div>
        </Link>
        <Link to="/vendor/settlements" className="card detail-card" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className="card-header">My Payments</div>
          <div className="detail-body">
            <p>Check how much you will receive this week or month.</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
