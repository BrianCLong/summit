import type { Request, Response } from 'express';
import { register as registry } from '../monitoring/metrics.js';

export const metricsRoute = async (_req: Request, res: Response): Promise<void> => {
  try {
    const metricsData = await registry.metrics();
    res.set('Content-Type', registry.contentType);
    res.send(metricsData);
  } catch (err) {
    res.status(500).send('Error collecting metrics');
  }
};
