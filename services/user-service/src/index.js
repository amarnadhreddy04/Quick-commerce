import 'dotenv/config';
import userRoutes from './routes/users.js';
import { createServiceApp } from '../../shared/src/createApp.js';
import { initDatabase } from '../../shared/src/db.js';

await initDatabase();

const app = createServiceApp('user-service');
const PORT = process.env.USER_PORT || 3015;

app.use('/api/users', userRoutes);

app.listen(PORT, () => {
  console.log(`User service running at http://localhost:${PORT}`);
});
