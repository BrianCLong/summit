import express from 'express';
import { logger } from '../config/logger.js';
import { getNeo4jDriver } from '../db/neo4j.js';
import { getPostgresPool } from '../db/postgres.js';
import { getRedisClient } from '../db/redis.js';

const router = express.Router();

const healthEndpointsEnabled = () => (process.env.HEALTH_ENDPOINTS_ENABLED ?? 'true').toLowerCase() === 'true';

const buildDisabledResponse = (res: any) =>
  res.status(404).json({ status: 'disabled', reason: 'HEALTH_ENDPOINTS_ENABLED is false' });

/**
 * @openapi
 * /healthz:
 *   get:
 *     tags: [Health]
 *     summary: Liveness probe
 *     description: Returns 200 if the process is up and running.
 */
router.get('/healthz', (_req: any, res: any) => {
  if (!healthEndpointsEnabled()) return buildDisabledResponse(res);
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

/**
 * @openapi
 * /version:
 *   get:
 *     tags: [Health]
 *     summary: Build information
 *     description: Returns git sha, build time, and service version.
 */
router.get('/version', (_req: any, res: any) => {
  if (!healthEndpointsEnabled()) return buildDisabledResponse(res);
  res.status(200).json({
    service: 'intelgraph-server',
    version: process.env.npm_package_version || 'unknown',
    gitSha: process.env.GIT_COMMIT || process.env.COMMIT_SHA || 'unknown',
    buildTime: process.env.BUILD_TIME || 'unknown',
    environment: process.env.NODE_ENV || 'development'
  });
});

/**
 * @openapi
 * /readyz:
 *   get:
 *     tags: [Health]
 *     summary: Readiness probe
 *     description: Checks critical dependencies (Neo4j, Postgres, Redis) with timeouts.
 */
router.get('/readyz', async (_req: any, res: any) => {
  if (!healthEndpointsEnabled()) return buildDisabledResponse(res);

  const checks: Record<string, string> = {};
  const failures: string[] = [];

  const timeoutPromise = (ms: number, name: string) => new Promise<void>((_, reject) =>
    setTimeout(() => reject(new Error(`${name} check timed out`)), ms)
  );

  // Check Neo4j
  try {
    const driver = getNeo4jDriver();
    await Promise.race([
        driver.verifyConnectivity(),
        timeoutPromise(1000, 'Neo4j')
    ]);
    checks.neo4j = 'ok';
  } catch (err: any) {
    checks.neo4j = 'failed';
    failures.push(`Neo4j: ${err.message}`);
    logger.error({ err }, 'Readiness check failed: Neo4j');
  }

  // Check Postgres
  try {
    const pool = getPostgresPool();
    await Promise.race([
        pool.query('SELECT 1'),
        timeoutPromise(1000, 'Postgres')
    ]);
    checks.postgres = 'ok';
  } catch (err: any) {
    checks.postgres = 'failed';
    failures.push(`Postgres: ${err.message}`);
    logger.error({ err }, 'Readiness check failed: Postgres');
  }

  // Check Redis
  try {
    const redis = getRedisClient();
    await Promise.race([
        redis.ping(),
        timeoutPromise(1000, 'Redis')
    ]);
    checks.redis = 'ok';
  } catch (err: any) {
    checks.redis = 'failed';
    failures.push(`Redis: ${err.message}`);
    logger.error({ err }, 'Readiness check failed: Redis');
  }

  if (failures.length > 0) {
    res.status(503).json({
      status: 'not ready',
      failures,
      checks,
      timestamp: new Date().toISOString()
    });
  } else {
    res.status(200).json({
      status: 'ready',
      checks,
      timestamp: new Date().toISOString()
    });
  }
});

// Alias /health to /healthz for backward compatibility
router.get('/health', (_req: any, res: any) => {
    if (!healthEndpointsEnabled()) return buildDisabledResponse(res);
    res.status(200).json({ status: 'ok', note: 'Use /healthz for liveness', timestamp: new Date().toISOString() });
});

export default router;
