# Milkbasket App

A Milkbasket-style daily essentials delivery app built with **React Native** and **Expo**.

## Why React Native?

Milkbasket is a mobile-first product. React Native (with Expo) gives you:

- One codebase for **Android** and **iOS**
- Fast development if you already know React
- Easy testing in browser, emulator, or Expo Go on your phone

Flutter is also a strong choice for mobile apps. React Native was picked here because it aligns with your React preference and is quicker to extend with web dashboards later.

## Features

### Mobile App (React Native + Expo)

- Home screen with delivery cutoff banner and wallet balance
- Category browsing (Milk, Bread, Eggs, Fruits, and more)
- Product cards with add/remove quantity
- Basket with delivery slot and order summary
- Order history and active subscriptions
- Profile screen with account settings

### Admin Panel (React + Vite)

- Dashboard with revenue, orders, and stock overview
- Product management (add, edit, delete, stock)
- Order status updates (scheduled, processing, delivered, cancelled)
- Category management
- Customer list with wallet balances
- Delivery settings (cutoff time, fees, min order)

## Getting Started

### 1. Start the API & database

```bash
cd Projects/milkbasket-app
npm run server:seed   # first time only
npm run server        # http://localhost:3001
```

### 2. Mobile App

```bash
npm install
npm start
```

**Test account:** `amar@example.com` / `user123`

Then choose how to run:

- `npm run android` — Android emulator or device
- `npm run ios` — iOS simulator (macOS only)
- `npm run web` — browser preview

Scan the QR code with **Expo Go** on your phone for the fastest mobile preview.

### 3. Admin Panel

```bash
npm run admin
```

Open http://localhost:5173 and sign in with:

- **Email:** `admin@milkbasket.com`
- **Password:** `admin123`

The admin panel reads and writes data through the API server.

### 4. Payments (Razorpay)

The basket supports **Razorpay** (UPI/Card/Netbanking) and **Wallet** payments.

Add Razorpay test keys to `server/.env` (see `server/.env.example`). Without keys, demo payment mode is used.

## Project Structure

```
app/               # Mobile app screens
  (auth)/          # Login & registration
admin/             # Web admin panel
server/            # API + SQLite database
  data/            # milkbasket.db
components/        # Mobile UI components
context/           # Auth & cart state
lib/               # API client
constants/         # Theme colors
```

## Next Steps

To make this production-ready, connect:

1. Backend API for products, orders, and users
2. Payment gateway (Razorpay, PayU, etc.)
3. Push notifications for delivery updates
4. Location and address management
5. Real subscription scheduling
