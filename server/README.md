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

## Registration Notifications

On user signup, the API sends:
- **Welcome email** to the user's email address
- **Welcome SMS** to the user's phone number

### Free email setup

**Without configuration:** uses [Ethereal Email](https://ethereal.email) (test inbox). Check the server console for a preview URL.

**Production (free tier):** use [Brevo](https://www.brevo.com) (300 emails/day) or Gmail SMTP. Copy `server/.env.example` to `server/.env` and fill in SMTP values.

### Free SMS setup (India)

1. Sign up at [Fast2SMS](https://www.fast2sms.com) (free dev credits)
2. Get your API key from the dashboard
3. Add to `server/.env`:
   ```
   FAST2SMS_API_KEY=your-api-key-here
   ```

Without `FAST2SMS_API_KEY`, SMS content is logged to the server console (dev mode).

## Payment Gateway (Razorpay)

Integrated payment flow:
1. `POST /api/payments/create-order` — creates Razorpay order (or wallet payment)
2. `POST /api/payments/verify` — verifies Razorpay signature after checkout
3. `GET /api/payments/config` — returns Razorpay key ID for client

### Setup Razorpay (Test Mode)

1. Create account at [https://razorpay.com](https://razorpay.com)
2. Dashboard → Settings → API Keys → Generate Test Keys
3. Add to `server/.env`:
   ```
   RAZORPAY_KEY_ID=rzp_test_xxxxx
   RAZORPAY_KEY_SECRET=your_secret
   ```

**Without keys:** app runs in demo mode — payments are simulated.

**Payment methods in app:**
- Razorpay (UPI, Cards, Netbanking)
- Wallet balance

## API Endpoints

- `POST /api/auth/register` — user registration
- `POST /api/auth/login` — login (returns JWT)
- `GET /api/auth/me` — current user
- `GET /api/catalog/categories` — list categories
- `GET /api/catalog/products` — list products
- `GET /api/orders` — list orders
- `GET /api/users` — list customers (admin)
- `GET /api/settings` — app settings
