/**
 * Prometheus metrics endpoint
 * Exposes application and system metrics in Prometheus format
 */
import type { Request, Response } from 'express';
import { registry } from '../observability/metrics';

export async function metricsRoute(_req: Request, res: Response): Promise<void> {
  try {
    res.setHeader('Content-Type', registry.contentType);
    const metrics = await registry.metrics();
    res.end(metrics);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to collect metrics',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
