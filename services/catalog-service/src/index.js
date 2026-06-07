import 'dotenv/config';
import catalogRoutes from './routes/catalog.js';
import { createServiceApp } from '../../shared/src/createApp.js';
import { initDatabase } from '../../shared/src/db.js';

await initDatabase();

const app = createServiceApp('catalog-service');
const PORT = process.env.CATALOG_PORT || 3012;

app.use('/api/catalog', catalogRoutes);

app.listen(PORT, () => {
  console.log(`Catalog service running at http://localhost:${PORT}`);
});
