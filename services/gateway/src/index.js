import 'dotenv/config';
import http from 'http';
import { createProxyMiddleware } from 'http-proxy-middleware';
import express from 'express';

const app = express();
const PORT = process.env.GATEWAY_PORT || 3001;

const SYNC_URL = process.env.SYNC_SERVICE_URL || 'http://127.0.0.1:3018';

const routes = [
  { path: '/api/auth', target: process.env.AUTH_SERVICE_URL || 'http://127.0.0.1:3011' },
  { path: '/api/catalog', target: process.env.CATALOG_SERVICE_URL || 'http://127.0.0.1:3012' },
  { path: '/api/orders', target: process.env.ORDER_SERVICE_URL || 'http://127.0.0.1:3013' },
  { path: '/api/payments', target: process.env.PAYMENT_SERVICE_URL || 'http://127.0.0.1:3014' },
  { path: '/api/users', target: process.env.USER_SERVICE_URL || 'http://127.0.0.1:3015' },
  { path: '/api/settings', target: process.env.SETTINGS_SERVICE_URL || 'http://127.0.0.1:3016' },
  { path: '/api/areas', target: process.env.SETTINGS_SERVICE_URL || 'http://127.0.0.1:3016' },
];

app.get('/api/health', async (_req, res) => {
  const checks = await Promise.all(
    [
      ...routes.map(async ({ path, target }) => {
        try {
          const response = await fetch(`${target}/health`, { signal: AbortSignal.timeout(3000) });
          const data = await response.json();
          return { path, status: response.ok ? 'ok' : 'error', service: data.service };
        } catch {
          return { path, status: 'down' };
        }
      }),
      (async () => {
        try {
          const response = await fetch(`${SYNC_URL}/health`, { signal: AbortSignal.timeout(3000) });
          const data = await response.json();
          return { path: '/api/sync', status: response.ok ? 'ok' : 'error', service: data.service };
        } catch {
          return { path: '/api/sync', status: 'down' };
        }
      })(),
    ]
  );

  const allOk = checks.every((check) => check.status === 'ok');
  res.status(allOk ? 200 : 503).json({
    status: allOk ? 'ok' : 'degraded',
    gateway: 'milkbasket-api-gateway',
    services: checks,
  });
});

app.get('/api/sync/state', async (_req, res) => {
  try {
    const response = await fetch(`${SYNC_URL}/api/sync/state`);
    const data = await response.json();
    res.status(response.status).json(data);
  } catch {
    res.status(503).json({ error: 'Sync service unavailable' });
  }
});

app.get('/api/sync/events', (req, res) => {
  const upstream = http.get(`${SYNC_URL}/api/sync/events`, (upstreamRes) => {
    res.writeHead(upstreamRes.statusCode ?? 200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });
    upstreamRes.pipe(res);
  });

  upstream.on('error', () => {
    res.status(503).end();
  });

  req.on('close', () => {
    upstream.destroy();
  });
});

routes.forEach(({ path, target }) => {
  app.use(
    path,
    createProxyMiddleware({
      target,
      changeOrigin: true,
      pathRewrite: (requestPath) => `${path}${requestPath}`,
    })
  );
});

app.listen(PORT, () => {
  console.log(`API Gateway running at http://localhost:${PORT}`);
});
