import express from 'express';
import { register } from 'prom-client';

export function startServer() {
  const app = express();
  const port = process.env.PORT || 3000;

  app.get('/health', (req, res) => res.json({ status: 'ok' }));

  app.get('/metrics', async (req, res) => {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  });

  app.listen(port, () => {
    console.log(`Reporting service listening on port ${port}`);
  });

  return app;
}
