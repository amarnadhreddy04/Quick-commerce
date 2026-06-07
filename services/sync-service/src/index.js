import 'dotenv/config';
import { createServiceApp } from '../../shared/src/createApp.js';

const app = createServiceApp('sync-service');
const PORT = process.env.SYNC_PORT || 3018;

const clients = new Set();
const state = {
  catalog: Date.now(),
  orders: Date.now(),
  settings: Date.now(),
  users: Date.now(),
  areas: Date.now(),
};

app.get('/api/sync/state', (_req, res) => {
  res.json({ state });
});

app.get('/api/sync/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  clients.add(res);
  res.write(`data: ${JSON.stringify({ type: 'connected', state })}\n\n`);

  req.on('close', () => {
    clients.delete(res);
  });
});

app.post('/internal/events', (req, res) => {
  const { domain, action, entity, id } = req.body ?? {};

  if (domain && Object.prototype.hasOwnProperty.call(state, domain)) {
    state[domain] = Date.now();
  }

  const event = {
    type: 'sync',
    domain,
    action,
    entity,
    id,
    state: { ...state },
    timestamp: Date.now(),
  };

  const payload = `data: ${JSON.stringify(event)}\n\n`;
  clients.forEach((client) => {
    client.write(payload);
  });

  res.json({ ok: true, state });
});

app.listen(PORT, () => {
  console.log(`Sync service running at http://localhost:${PORT}`);
});
