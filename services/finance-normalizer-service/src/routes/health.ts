import { Router, type Request, type Response } from 'express';
import { db } from '../utils/db.js';

export const healthRoutes = Router();

/**
 * Basic health check
 */
healthRoutes.get('/', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'finance-normalizer-service',
    timestamp: new Date().toISOString(),
  });
});

/**
 * Liveness probe - is the service running?
 */
healthRoutes.get('/live', (_req: Request, res: Response) => {
  res.json({ status: 'live' });
});

/**
 * Readiness probe - is the service ready to accept traffic?
 */
healthRoutes.get('/ready', async (_req: Request, res: Response) => {
  try {
    const dbHealthy = await db.healthCheck();

    if (!dbHealthy) {
      res.status(503).json({
        status: 'not ready',
        reason: 'Database connection failed',
      });
      return;
    }

    res.json({ status: 'ready' });
  } catch (error) {
    res.status(503).json({
      status: 'not ready',
      reason: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Detailed health check with component status
 */
healthRoutes.get('/detailed', async (_req: Request, res: Response) => {
  const startTime = Date.now();

  const checks: Record<string, { status: string; latencyMs?: number; error?: string }> = {};

  // Database check
  try {
    const dbStart = Date.now();
    await db.query('SELECT 1');
    checks.database = {
      status: 'healthy',
      latencyMs: Date.now() - dbStart,
    };
  } catch (error) {
    checks.database = {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }

  // Memory check
  const memUsage = process.memoryUsage();
  checks.memory = {
    status: memUsage.heapUsed < memUsage.heapTotal * 0.9 ? 'healthy' : 'warning',
  };

  // Calculate overall status
  const allHealthy = Object.values(checks).every((c) => c.status === 'healthy');
  const hasWarning = Object.values(checks).some((c) => c.status === 'warning');

  res.status(allHealthy ? 200 : hasWarning ? 200 : 503).json({
    status: allHealthy ? 'healthy' : hasWarning ? 'degraded' : 'unhealthy',
    service: 'finance-normalizer-service',
    version: process.env.npm_package_version || '1.0.0',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    checks,
    totalCheckTimeMs: Date.now() - startTime,
  });
});
