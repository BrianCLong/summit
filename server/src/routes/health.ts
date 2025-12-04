import { Router } from 'express';
import type { Request, Response } from 'express';
import { getDependencyHealth } from '../db/health.js';
import { logger } from '../utils/logger.js';

const router = Router();

function snapshotMemory() {
  return {
    used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
    total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
    unit: 'MB',
  };
}

function dependencyFailures(
  services: Awaited<ReturnType<typeof getDependencyHealth>>['services'],
): string[] {
  return Object.entries(services)
    .filter(([, service]) => service.status !== 'healthy')
    .map(([name, service]) => {
      const details = 'lastError' in service && service.lastError ? ` (${service.lastError})` : '';
      return `${name}: ${service.status}${details}`;
    });
}

router.get('/health', async (_req: Request, res: Response) => {
  const dependencies = await getDependencyHealth();

  res.status(dependencies.status === 'healthy' ? 200 : 503).json({
    status: dependencies.status,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    dependencies: {
      neo4j: dependencies.services.neo4j.status,
      postgres: dependencies.services.postgres.status,
      redis: dependencies.services.redis.status,
    },
  });
});

router.get('/health/detailed', async (_req: Request, res: Response) => {
  const dependencies = await getDependencyHealth();
  const statusCode = dependencies.status === 'healthy' ? 200 : 503;

  res.status(statusCode).json({
    ...dependencies,
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    memory: snapshotMemory(),
  });
});

router.get('/health/ready', async (_req: Request, res: Response) => {
  const dependencies = await getDependencyHealth();
  const failures = dependencyFailures(dependencies.services);

  if (failures.length === 0) {
    return res.status(200).json({ status: 'ready' });
  }

  logger.warn({ failures }, 'Readiness check failed');

  return res.status(503).json({
    status: 'not ready',
    failures,
    message: 'Critical services are unavailable or degraded',
  });
});

router.get('/health/live', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'alive' });
});

export default router;
