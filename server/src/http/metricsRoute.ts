// @ts-nocheck
import { Request, Response } from 'express';
import { logger } from '../config/logger.js';
import { getMetricsSnapshot } from '../metrics/registry.js';

const isEndpointEnabled = () => process.env.METRICS_ENDPOINT_ENABLED === 'true';

export const metricsRoute = async (_req: Request, res: Response) => {
  if (!isEndpointEnabled()) {
    return res.status(404).json({ error: 'Metrics endpoint disabled' });
  }

  try {
    const metrics = await getMetricsSnapshot();
    return res.json({ metrics });
  } catch (err) {
    logger.error({ err }, 'Error generating metrics');
    return res.status(500).json({ error: 'Error generating metrics' });
  }
};
