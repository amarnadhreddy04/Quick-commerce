import 'dotenv/config';
import cors from 'cors';
import express from 'express';

import { initDatabase as initSharedDatabase } from '../../services/shared/src/db.js';
import { initDatabase } from './db.js';
import addressRoutes from './routes/addresses.js';
import authRoutes from './routes/auth.js';
import catalogRoutes from './routes/catalog.js';
import orderRoutes from './routes/orders.js';
import paymentRoutes from './routes/payments.js';
import settingsRoutes from './routes/settings.js';
import userRoutes from './routes/users.js';

await initDatabase();
await initSharedDatabase();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'milkbasket-api' });
});

app.use('/api/auth', authRoutes);
app.use('/api/auth/addresses', addressRoutes);
app.use('/api/catalog', catalogRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/users', userRoutes);
app.use('/api/settings', settingsRoutes);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Pachari API running at http://localhost:${PORT}`);
});
