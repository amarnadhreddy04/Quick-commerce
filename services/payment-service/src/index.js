import 'dotenv/config';
import paymentRoutes from './routes/payments.js';
import { createServiceApp } from '../../shared/src/createApp.js';
import { initDatabase } from '../../shared/src/db.js';

await initDatabase();

const app = createServiceApp('payment-service');
const PORT = process.env.PAYMENT_PORT || 3014;

app.use('/api/payments', paymentRoutes);

app.listen(PORT, () => {
  console.log(`Payment service running at http://localhost:${PORT}`);
});
