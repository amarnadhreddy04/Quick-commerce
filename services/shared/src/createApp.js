import cors from 'cors';
import express from 'express';

export function createServiceApp(serviceName) {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: serviceName });
  });

  return app;
}

export function addErrorHandler(app, serviceName) {
  app.use((err, _req, res, _next) => {
    console.error(`[${serviceName}]`, err);
    res.status(500).json({ error: 'Internal server error' });
  });
}
