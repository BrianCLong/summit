import { Router } from 'express';
import type { Request, Response } from 'express';

const router = Router();

/**
 * Basic health check endpoint
 * Returns 200 OK if the service is running
 */
router.get('/health', async (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
  });
});

/**
 * Detailed health check with dependency status
 * Checks database connections and external dependencies
 */
router.get('/health/detailed', async (_req: Request, res: Response) => {
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
  };

  // Check Neo4j connection
  try {
    const neo4j = (await import('../db/neo4jConnection.js')).default;
    await neo4j.getDriver().verifyConnectivity();
    health.services.neo4j = 'healthy';
  } catch (error) {
    health.services.neo4j = 'unhealthy';
    health.status = 'degraded';
  }

  // Check PostgreSQL connection
  try {
    const { pool } = await import('../db/postgres.js');
    await pool.query('SELECT 1');
    health.services.postgres = 'healthy';
  } catch (error) {
    health.services.postgres = 'unhealthy';
    health.status = 'degraded';
  }

  // Check Redis connection
  try {
    const redis = (await import('../db/redis.js')).default;
    await redis.ping();
    health.services.redis = 'healthy';
  } catch (error) {
    health.services.redis = 'unhealthy';
    health.status = 'degraded';
  }

  const statusCode = health.status === 'ok' ? 200 : 503;
  res.status(statusCode).json(health);
});

/**
 * Readiness probe for Kubernetes
 * Returns 200 when the service is ready to accept traffic
 */
router.get('/health/ready', async (_req: Request, res: Response) => {
  // Check if critical services are available
  try {
    const neo4j = (await import('../db/neo4jConnection.js')).default;
    await neo4j.getDriver().verifyConnectivity();

    const { pool } = await import('../db/postgres.js');
    await pool.query('SELECT 1');

    res.status(200).json({ status: 'ready' });
  } catch (error) {
    res.status(503).json({
      status: 'not ready',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Liveness probe for Kubernetes
 * Returns 200 if the process is alive
 */
router.get('/health/live', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'alive' });
});

export default router;
