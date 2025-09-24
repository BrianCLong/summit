import express from 'express';
import { randomUUID } from 'crypto';
import statusRoutes from './routes/status';
import { metricsHandler, timed } from './metrics';

const app = express();
app.use(express.json({ limit: '2mb' }));
app.use((req, res, next) => {
  const headerId = req.header('x-request-id');
  const correlationId = headerId && headerId.trim() ? headerId : randomUUID();
  res.setHeader('x-request-id', correlationId);
  (req as any).correlationId = correlationId;
  next();
});
app.use(timed('all'));
app.use(statusRoutes);
app.get('/metrics', metricsHandler);

app.listen(8787, () => console.log('Proxy listening on :8787'));
