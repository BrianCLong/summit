import express from 'express';
import statusRoutes from './routes/status';
import { metricsHandler, timed } from './metrics';

const app = express();
app.use(express.json({ limit: '2mb' }));
app.use(timed('all'));
app.use(statusRoutes);
app.get('/metrics', metricsHandler);

app.listen(8787, () => console.log('Proxy listening on :8787'));
