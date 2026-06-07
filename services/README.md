# Milkbasket Microservices

API gateway and domain services that keep the mobile app and admin panel in sync through a shared SQLite database and a sync service.

## Architecture

```
Mobile App / Admin Panel
         │
         ▼
   API Gateway (:3001)
         │
    ┌────┴────┬─────────┬──────────┬───────────┐
    ▼         ▼         ▼          ▼           ▼
 Auth      Catalog    Orders    Payments    Settings
 :3011     :3012      :3013     :3014       :3016
    │         │         │          │           │
    └─────────┴─────────┴──────────┴───────────┘
                        │
              Shared SQLite (server/data/)
                        │
                   Sync Service (:3018)
              SSE + version polling for live updates
```

| Service | Port | Routes |
|---------|------|--------|
| Gateway | 3001 | Proxies all `/api/*` |
| Auth | 3011 | `/api/auth` |
| Catalog | 3012 | `/api/catalog` |
| Orders | 3013 | `/api/orders` |
| Payments | 3014 | `/api/payments` |
| Users | 3015 | `/api/users` |
| Settings | 3016 | `/api/settings` |
| Notifications | 3017 | Internal only |
| Sync | 3018 | `/api/sync/state`, `/api/sync/events` |

## Quick start

```bash
cd services
npm install
cp .env.example .env
npm run seed
npm run dev
```

Gateway URL: `http://localhost:3001/api`

Health check: `GET http://localhost:3001/api/health`

## Sync

When admin updates products, categories, orders, or settings, the relevant service publishes an event to the sync service. Clients can:

- **Poll** `GET /api/sync/state` — returns version timestamps per domain
- **Subscribe** `GET /api/sync/events` — Server-Sent Events stream (admin panel)

Mobile app polls every 8 seconds and refetches changed data automatically.

## Legacy monolith

The original single-server API in `server/` still works. Use `npm run server:legacy` from the project root. New development should use `npm run server` (microservices).
