import { NavLink, Outlet } from 'react-router-dom';

import { roleLabel } from '../lib/roles';
import { useAdminStore } from '../store/AdminStore';
import './Layout.css';

export default function LocationLayout() {
  const { user, logout } = useAdminStore();
  const pincode = user?.adminPincode ?? '';

  const navItems = [
    { to: '/', label: 'Dashboard', icon: '📊', end: true },
    { to: '/orders', label: 'Orders', icon: '🧾' },
    { to: '/wholesaler-orders', label: 'Packing Queue', icon: '🏪' },
    { to: '/products', label: 'Products', icon: '📦' },
    { to: '/customers', label: 'Customers', icon: '👥' },
    { to: '/settlements', label: 'Settlements', icon: '💰' },
    { to: '/riders', label: 'Riders', icon: '🛵' },
  ];

  return (
    <div className="admin-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-icon">📍</span>
          <div>
            <h1>Location Admin</h1>
            <p>{pincode ? `Pincode ${pincode}` : roleLabel('location_admin')}</p>
          </div>
        </div>

        <nav className="nav">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <span>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <button type="button" className="logout-btn" onClick={logout}>
          Logout
        </button>
      </aside>

      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}
