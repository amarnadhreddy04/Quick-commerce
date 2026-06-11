import 'dotenv/config';
import areasRoutes from './routes/areas.js';
import settingsRoutes from './routes/settings.js';
import ridersRoutes from './routes/riders.js';
import promocodesRoutes from './routes/promocodes.js';
import wholesalersRoutes from './routes/wholesalers.js';
import { createServiceApp } from '../../shared/src/createApp.js';
import { initDatabase } from '../../shared/src/db.js';

await initDatabase();

const app = createServiceApp('settings-service');
const PORT = process.env.SETTINGS_PORT || 3016;

app.use('/api/settings', settingsRoutes);
app.use('/api/areas', areasRoutes);
app.use('/api/wholesalers', wholesalersRoutes);
app.use('/api/riders', ridersRoutes);
app.use('/api/promocodes', promocodesRoutes);

app.listen(PORT, () => {
  console.log(`Settings service running at http://localhost:${PORT}`);
});
