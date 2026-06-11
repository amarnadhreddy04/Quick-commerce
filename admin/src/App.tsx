import { Navigate, Route, Routes } from 'react-router-dom';

import Layout from './components/Layout';
import LocationLayout from './components/LocationLayout';
import VendorLayout from './components/VendorLayout';
import { isLocationAdmin, isSuperAdmin, isWholesaler } from './lib/roles';
import Categories from './pages/Categories';
import Customers from './pages/Customers';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import OrderDetail from './pages/OrderDetail';
import Orders from './pages/Orders';
import Products from './pages/Products';
import Settings from './pages/Settings';
import Settlements from './pages/Settlements';
import VendorHome from './pages/VendorHome';
import VendorOrderDetail from './pages/VendorOrderDetail';
import VendorOrders from './pages/VendorOrders';
import VendorSettlements from './pages/VendorSettlements';
import WholesalerOrders from './pages/WholesalerOrders';
import Riders from './pages/Riders';
import PromoCodes from './pages/PromoCodes';
import Referrals from './pages/Referrals';
import Wholesalers from './pages/Wholesalers';
import { AdminProvider, useAdminStore } from './store/AdminStore';

function ProtectedRoutes() {
  const { isAuthenticated, loading, user } = useAdminStore();

  if (loading) {
    return <div style={{ padding: 24 }}>Loading panel...</div>;
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (isWholesaler(user.role)) {
    return (
      <Routes>
        <Route element={<VendorLayout />}>
          <Route path="/vendor" element={<VendorHome />} />
          <Route path="/vendor/orders" element={<VendorOrders />} />
          <Route path="/vendor/orders/:orderId" element={<VendorOrderDetail />} />
          <Route path="/vendor/settlements" element={<VendorSettlements />} />
        </Route>
        <Route path="*" element={<Navigate to="/vendor" replace />} />
      </Routes>
    );
  }

  if (isLocationAdmin(user.role)) {
    return (
      <Routes>
        <Route element={<LocationLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="products" element={<Products />} />
          <Route path="orders" element={<Orders />} />
          <Route path="orders/:orderId" element={<OrderDetail />} />
          <Route path="wholesaler-orders" element={<WholesalerOrders />} />
          <Route path="customers" element={<Customers />} />
          <Route path="settlements" element={<Settlements />} />
          <Route path="riders" element={<Riders />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  }

  if (isSuperAdmin(user.role)) {
    return (
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="products" element={<Products />} />
          <Route path="orders" element={<Orders />} />
          <Route path="orders/:orderId" element={<OrderDetail />} />
          <Route path="wholesalers" element={<Wholesalers />} />
          <Route path="riders" element={<Riders />} />
          <Route path="wholesaler-orders" element={<WholesalerOrders />} />
          <Route path="settlements" element={<Settlements />} />
          <Route path="categories" element={<Categories />} />
          <Route path="customers" element={<Customers />} />
          <Route path="referrals" element={<Referrals />} />
          <Route path="promo-codes" element={<PromoCodes />} />
          <Route path="settings" element={<Settings />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  }

  return <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <AdminProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/*" element={<ProtectedRoutes />} />
      </Routes>
    </AdminProvider>
  );
}
