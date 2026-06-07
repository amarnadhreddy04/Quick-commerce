import 'dotenv/config';
import authRoutes from './routes/auth.js';
import { createServiceApp } from '../../shared/src/createApp.js';
import { initDatabase } from '../../shared/src/db.js';

await initDatabase();

const app = createServiceApp('auth-service');
const PORT = process.env.AUTH_PORT || 3011;

app.use('/api/auth', authRoutes);

app.listen(PORT, () => {
  console.log(`Auth service running at http://localhost:${PORT}`);
});
