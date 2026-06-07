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

### Mobile App

```bash
cd Projects/milkbasket-app
npm install
npm start
```

Then choose how to run:

- `npm run android` — Android emulator or device
- `npm run ios` — iOS simulator (macOS only)
- `npm run web` — browser preview

Scan the QR code with **Expo Go** on your phone for the fastest mobile preview.

### Admin Panel

```bash
cd Projects/milkbasket-app
npm run admin
```

Open http://localhost:5173 and sign in with:

- **Email:** `admin@milkbasket.com`
- **Password:** `admin123`

Admin data is stored in browser `localStorage` for now (demo mode).

## Project Structure

```
app/               # Mobile app screens
admin/             # Web admin panel
  src/pages/       # Dashboard, Products, Orders, etc.
  src/store/       # Admin state (localStorage)
components/        # Mobile UI components
context/           # Cart state
data/              # Mock products and orders
constants/         # Theme colors
```

## Next Steps

To make this production-ready, connect:

1. Backend API for products, orders, and users
2. Payment gateway (Razorpay, PayU, etc.)
3. Push notifications for delivery updates
4. Location and address management
5. Real subscription scheduling
