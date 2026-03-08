import { Request, Response } from 'express';
import { register } from '../monitoring/metrics.js';
import { logger } from '../config/logger.js';

export const metricsRoute = async (_req: Request, res: Response) => {
  try {
    res.set('Content-Type', register.contentType);
    const metrics = await register.metrics();
    res.send(metrics);
  } catch (err: any) {
    logger.error({ err }, 'Error generating metrics');
    res.status(500).send('Error generating metrics');
  }
};
