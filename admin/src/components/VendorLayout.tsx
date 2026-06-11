import { NavLink, Outlet } from 'react-router-dom';

import { roleLabel } from '../lib/roles';
import { useAdminStore } from '../store/AdminStore';
import './Layout.css';

const navItems = [
  { to: '/vendor', label: 'Home', icon: '🏠', end: true },
  { to: '/vendor/orders', label: 'My Orders', icon: '📦' },
  { to: '/vendor/settlements', label: 'My Payments', icon: '💰' },
];

export default function VendorLayout() {
  const { user, logout } = useAdminStore();

  return (
    <div className="admin-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-icon">🏪</span>
          <div>
            <h1>Vendor Portal</h1>
            <p>{user ? roleLabel(user.role) : 'Wholesaler'}</p>
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
