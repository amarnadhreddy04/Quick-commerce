# Milkbasket API Server

SQLite-backed REST API for the mobile app and admin panel.

## Database Tables

- `users` — customers and admins (auth)
- `categories` / `sub_categories` — product catalog structure
- `products` — inventory and pricing
- `promo_banners` — category promotional banners
- `orders` / `order_items` — customer orders
- `app_settings` — delivery cutoff, fees, min order

Database file: `server/data/milkbasket.db`

## Setup

```bash
cd server
npm install
npm run seed
npm run dev
```

API runs at **http://localhost:3001**

## Default Accounts

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@milkbasket.com | admin123 |
| User | amar@example.com | user123 |

## API Endpoints

- `POST /api/auth/register` — user registration
- `POST /api/auth/login` — login (returns JWT)
- `GET /api/auth/me` — current user
- `GET /api/catalog/categories` — list categories
- `GET /api/catalog/products` — list products
- `GET /api/orders` — list orders
- `GET /api/users` — list customers (admin)
- `GET /api/settings` — app settings
