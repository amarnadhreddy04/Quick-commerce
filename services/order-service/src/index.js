import 'dotenv/config';
import orderRoutes from './routes/orders.js';
import { createServiceApp } from '../../shared/src/createApp.js';
import { initDatabase } from '../../shared/src/db.js';

await initDatabase();

const app = createServiceApp('order-service');
const PORT = process.env.ORDER_PORT || 3013;

app.use('/api/orders', orderRoutes);

app.listen(PORT, () => {
  console.log(`Order service running at http://localhost:${PORT}`);
});
