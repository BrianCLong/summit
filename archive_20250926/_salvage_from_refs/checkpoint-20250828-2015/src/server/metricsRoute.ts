import { Router } from 'express';
import { reg } from '../metrics/identity';

export function metricsRoute() {
  const r = Router();
  r.get('/metrics', async (_req, res) => {
    res.set('Content-Type', reg.contentType);
    res.send(await reg.metrics());
  });
  return r;
}
