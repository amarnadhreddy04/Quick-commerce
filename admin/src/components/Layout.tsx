import { NavLink, Outlet } from 'react-router-dom';

import { useAdminStore } from '../store/AdminStore';
import './Layout.css';

const navItems = [
  { to: '/', label: 'Dashboard', icon: '📊', end: true },
  { to: '/products', label: 'Products', icon: '📦' },
  { to: '/orders', label: 'Orders', icon: '🧾' },
  { to: '/wholesaler-orders', label: 'Packing Queue', icon: '🏪' },
  { to: '/wholesalers', label: 'Wholesalers', icon: '🤝' },
  { to: '/riders', label: 'Riders', icon: '🛵' },
  { to: '/settlements', label: 'Settlements', icon: '💰' },
  { to: '/categories', label: 'Categories', icon: '🗂️' },
  { to: '/customers', label: 'Customers', icon: '👥' },
  { to: '/referrals', label: 'Referrals', icon: '🎁' },
  { to: '/promo-codes', label: 'Promo Codes', icon: '🏷️' },
  { to: '/settings', label: 'Settings', icon: '⚙️' },
];

export default function Layout() {
  const { logout } = useAdminStore();

  return (
    <div className="admin-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-icon">🥛</span>
          <div>
            <h1>Milkbasket</h1>
            <p>Super Admin</p>
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
