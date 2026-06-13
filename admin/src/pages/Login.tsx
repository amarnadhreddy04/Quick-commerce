import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';

import { useAdminStore } from '../store/AdminStore';
import './Login.css';

export default function Login() {
  const navigate = useNavigate();
  const { login, isAuthenticated, user } = useAdminStore();
  const [email, setEmail] = useState('admin@milkbasket.com');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');

  if (isAuthenticated && user) {
    return <Navigate to={user.role === 'wholesaler' ? '/vendor' : '/'} replace />;
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    try {
      const path = await login(email, password);
      navigate(path);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid email or password');
    }
  };

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={handleSubmit}>
        <div className="login-brand">
          <span>🥛</span>
          <h1>Pachari Panel</h1>
          <p>Super Admin · Location Admin · Wholesaler</p>
        </div>

        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </label>

        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </label>

        {error ? <p className="login-error">{error}</p> : null}

        <button type="submit" className="login-btn">
          Sign In
        </button>

        <div className="login-hint">
          <p>Super Admin: admin@milkbasket.com / admin123</p>
          <p>Location Admin: addanki-admin@milkbasket.com / location123</p>
          <p>General Store: ravi.wholesale@example.com / vendor123</p>
          <p>Vegetable Store: addanki-veg@example.com / vendor123</p>
          <p>Milk &amp; Bread: addanki-milk@example.com / vendor123</p>
          <p>Riders use the mobile app: suresh.rider@example.com / rider123</p>
        </div>
      </form>
    </div>
  );
}
