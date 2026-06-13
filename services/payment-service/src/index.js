import 'dotenv/config';
import cors from 'cors';
import express from 'express';

import paymentRoutes from './routes/payments.js';
import { handleRazorpayWebhook } from './routes/webhook.js';
import { getRazorpayMode, isRazorpayConfigured } from './services/razorpay.js';
import { initDatabase } from '../../shared/src/db.js';

await initDatabase();

const app = express();
const PORT = process.env.PAYMENT_PORT || 3014;

app.use(cors());
app.post(
  '/api/payments/webhook',
  express.raw({ type: 'application/json' }),
  handleRazorpayWebhook
);
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'payment-service' });
});

app.use('/api/payments', paymentRoutes);

app.listen(PORT, () => {
  const mode = getRazorpayMode();
  const status = isRazorpayConfigured() ? `${mode} keys loaded` : `${mode} (keys missing)`;
  console.log(`Payment service running at http://localhost:${PORT} [Razorpay: ${status}]`);
});
