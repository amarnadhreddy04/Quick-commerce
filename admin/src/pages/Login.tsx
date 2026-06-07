import { useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';

import { useAdminStore } from '../store/AdminStore';
import './Login.css';

export default function Login() {
  const { login, isAuthenticated } = useAdminStore();
  const [email, setEmail] = useState('admin@milkbasket.com');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const valid = login(email, password);
    if (!valid) {
      setError('Invalid email or password');
    }
  };

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={handleSubmit}>
        <div className="login-brand">
          <span>🥛</span>
          <h1>Milkbasket Admin</h1>
          <p>Manage products, orders, and customers</p>
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

        <p className="login-hint">Demo: admin@milkbasket.com / admin123</p>
      </form>
    </div>
  );
}
