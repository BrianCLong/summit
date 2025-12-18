import { Router } from 'express';
import client from 'prom-client';

const router = Router();

// Collect default metrics
client.collectDefaultMetrics();

router.get('/metrics', async (req, res) => {
  res.set('Content-Type', client.register.contentType);
  res.end(await client.register.metrics());
});

export default router;
