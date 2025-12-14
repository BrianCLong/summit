import { Router } from 'express';
import type { Request, Response } from 'express';
import { logger } from '../config/logger.js';
import { resilience } from '../utils/resilience.js';

const router = Router();

// Error details interface for better type safety
interface ServiceHealthError {
  service: string;
  error: string;
  timestamp: string;
}

/**
 * Liveness Probe (/healthz)
 * Returns 200 OK if the service process is running.
 * Used by K8s to restart the pod if it hangs.
 */
router.get(['/healthz', '/health/live'], (_req: Request, res: Response) => {
  res.status(200).json({
      status: 'alive',
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
  });
});

/**
 * Readiness Probe (/readyz)
 * Returns 200 when the service is ready to accept traffic.
 * Checks critical dependencies (DB, Redis).
 */
router.get(['/readyz', '/health/ready'], async (_req: Request, res: Response) => {
  const failures: string[] = [];

  // Check Neo4j
  try {
     // Use a timeout to prevent hanging health checks
     await resilience.execute('health-neo4j', async () => {
         const neo4j = (await import('../db/neo4jConnection.js')).default;
         await neo4j.getDriver().verifyConnectivity();
     }, { timeout: 2000, enableRetry: false, enableCircuitBreaker: false });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    failures.push(`Neo4j: ${msg}`);
  }

  // Check Postgres
  try {
     await resilience.execute('health-pg', async () => {
        const { getPostgresPool } = await import('../db/postgres.js');
        const pool = getPostgresPool();
        await pool.query('SELECT 1');
     }, { timeout: 2000, enableRetry: false, enableCircuitBreaker: false });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    failures.push(`PostgreSQL: ${msg}`);
  }

  if (failures.length > 0) {
    logger.warn({ failures }, 'Readiness check failed');
    res.status(503).json({
      status: 'not ready',
      failures,
      message: 'Critical services are unavailable.',
    });
  } else {
    res.status(200).json({ status: 'ready' });
  }
});

/**
 * Detailed Health Check
 * For internal admin dashboards.
 */
router.get(['/health', '/health/detailed'], async (_req: Request, res: Response) => {
  const errors: ServiceHealthError[] = [];
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    services: {
      neo4j: 'unknown',
      postgres: 'unknown',
      redis: 'unknown',
    },
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
      unit: 'MB',
    },
    errors: [] as ServiceHealthError[],
  };

  // Check Neo4j connection
  try {
    const neo4j = (await import('../db/neo4jConnection.js')).default;
    await neo4j.getDriver().verifyConnectivity();
    health.services.neo4j = 'healthy';
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Connection failed';
    health.services.neo4j = 'unhealthy';
    health.status = 'degraded';
    errors.push({
      service: 'neo4j',
      error: errorMsg,
      timestamp: new Date().toISOString(),
    });
  }

  // Check PostgreSQL connection
  try {
    const { getPostgresPool } = await import('../db/postgres.js');
    const pool = getPostgresPool();
    await pool.query('SELECT 1');
    health.services.postgres = 'healthy';
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Connection failed';
    health.services.postgres = 'unhealthy';
    health.status = 'degraded';
    errors.push({
      service: 'postgres',
      error: errorMsg,
      timestamp: new Date().toISOString(),
    });
  }

  // Check Redis connection
  try {
    const { getRedisClient } = await import('../db/redis.js');
    const redis = getRedisClient();
    await redis.ping();
    health.services.redis = 'healthy';
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Connection failed';
    health.services.redis = 'unhealthy';
    health.status = 'degraded';
    errors.push({
      service: 'redis',
      error: errorMsg,
      timestamp: new Date().toISOString(),
    });
  }

  health.errors = errors;
  const statusCode = health.status === 'ok' ? 200 : 503;
  res.status(statusCode).json(health);
});

export default router;
