import client from 'prom-client';
import type { Express } from 'express';

export function attachMetrics(app: Express) {
  client.collectDefaultMetrics();
  app.get('/metrics', async (_req, res) => {
    res.set('Content-Type', client.register.contentType);
    res.end(await client.register.metrics());
  });
}
