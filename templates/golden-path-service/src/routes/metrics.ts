import { Request, Response, Router } from 'express';
import { register } from '../observability/metrics.js';

export const metricsRouter = Router();

metricsRouter.get('/metrics', async (_req: Request, res: Response) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});
