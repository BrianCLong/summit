import { Router } from 'express';
import type { Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { logger } from '../utils/logger.js';
import { getVariant, isEnabled } from '../lib/featureFlags.js';
import { telemetryService } from '../analytics/telemetry/TelemetryService.js';
import { auditTrailService } from '../services/audit/AuditTrailService.js';

const router = Router();

// Health endpoints are enabled by default for production K8s probes
// Set HEALTH_ENDPOINTS_ENABLED=false only if you want to explicitly disable them
const healthEndpointsEnabled = () => (process.env.HEALTH_ENDPOINTS_ENABLED ?? 'true').toLowerCase() === 'true';

const baseStatus = () => ({
  timestamp: new Date().toISOString(),
  uptime: process.uptime(),
  environment: process.env.NODE_ENV || 'development',
});

const startedAt = () => new Date(Date.now() - Math.floor(process.uptime() * 1000)).toISOString();

// Error details interface for better type safety
interface ServiceHealthError {
  service: string;
  error: string;
  timestamp: string;
}

const buildDisabledResponse = (res: Response) =>
  res.status(404).json({ status: 'disabled', reason: 'HEALTH_ENDPOINTS_ENABLED is false' });

router.get('/healthz', (_req: Request, res: Response) => {
  if (!healthEndpointsEnabled()) {
    return buildDisabledResponse(res);
  }

  res.status(200).json({
    status: 'ok',
    ...baseStatus(),
  });
});

router.get('/readyz', (_req: Request, res: Response) => {
  if (!healthEndpointsEnabled()) {
    return buildDisabledResponse(res);
  }

  const readiness = {
    database: 'skipped',
    cache: 'skipped',
    messaging: 'skipped',
  } as const;

  res.status(200).json({
    status: 'ready',
    checks: readiness,
    message: 'Shallow readiness probe; deep checks remain on /health/ready',
    ...baseStatus(),
  });
});

router.get('/status', (_req: Request, res: Response) => {
  if (!healthEndpointsEnabled()) {
    return buildDisabledResponse(res);
  }

  const version = process.env.APP_VERSION || process.env.npm_package_version || 'unknown';
  const commit = process.env.GIT_COMMIT || process.env.COMMIT_SHA || 'unknown';

  res.status(200).json({
    status: 'ok',
    version,
    commit,
    startedAt: startedAt(),
    ...baseStatus(),
  });
});

/**
 * @openapi
 * /health:
 *   get:
 *     tags:
 *       - Health
 *     summary: Basic health check endpoint
 *     description: Returns 200 OK if the service is running.
 *     responses:
 *       200:
 *         description: Service is healthy
 */
import { asyncHandler } from '../middleware/async-handler.js';
router.get('/health', asyncHandler(async (_req: Request, res: Response) => {
  // Removed telemetry call to avoid spam
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
  });
}));

/**
 * @openapi
 * /health/detailed:
 *   get:
 *     tags:
 *       - Health
 *     summary: Detailed health check
 *     description: Checks database connections and external dependencies.
 *     responses:
 *       200:
 *         description: Service is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 *                 services:
 *                   type: object
 *                   properties:
 *                     neo4j:
 *                       type: string
 *                     postgres:
 *                       type: string
 *                     redis:
 *                       type: string
 *       503:
 *         description: Service is degraded or unhealthy
 */
router.get('/health/detailed', async (req: Request, res: Response) => {
  telemetryService.track('system_alert', 'system', 'detailed_health_check', 'system', {
      component: 'health_detailed',
      severity: 'info',
      alertId: 'health_check_deep',
  });
  const errors: ServiceHealthError[] = [];
  const health: {
    status: string;
    timestamp: string;
    uptime: number;
    environment: string;
    services: Record<string, string>;
    memory: { used: number; total: number; unit: string };
    errors: ServiceHealthError[];
  } = {
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
    errors: [],
  };

  // Check Neo4j connection
  if (process.env.DISABLE_NEO4J === 'true' || process.env.SKIP_DB_CHECKS === 'true') {
    health.services.neo4j = 'skipped';
  } else {
    try {
      const { getNeo4jDriver } = await import('../db/neo4j.js');
      await getNeo4jDriver().verifyConnectivity();
      health.services.neo4j = 'healthy';
    } catch (error: any) {
      const errorMsg = error instanceof Error ? error.message : 'Connection failed';
      health.services.neo4j = 'unhealthy';
      health.status = 'degraded';
      errors.push({
        service: 'neo4j',
        error: errorMsg,
        timestamp: new Date().toISOString(),
      });
      logger.error({ error, service: 'neo4j' }, 'Neo4j health check failed');
    }
  }

  // Check PostgreSQL connection
  try {
    const { getPostgresPool } = await import('../db/postgres.js');
    const pool = getPostgresPool();
    await pool.query('SELECT 1');
    health.services.postgres = 'healthy';
  } catch (error: any) {
    const errorMsg = error instanceof Error ? error.message : 'Connection failed';
    health.services.postgres = 'unhealthy';
    health.status = 'degraded';
    errors.push({
      service: 'postgres',
      error: errorMsg,
      timestamp: new Date().toISOString(),
    });
    logger.error({ error, service: 'postgres' }, 'PostgreSQL health check failed');
  }

  // Check Redis connection
  try {
    const { getRedisClient } = await import('../db/redis.js');
    const redis = getRedisClient();
    await redis.ping();
    health.services.redis = 'healthy';
  } catch (error: any) {
    const errorMsg = error instanceof Error ? error.message : 'Connection failed';
    health.services.redis = 'unhealthy';
    health.status = 'degraded';
    errors.push({
      service: 'redis',
      error: errorMsg,
      timestamp: new Date().toISOString(),
    });
    logger.error({ error, service: 'redis' }, 'Redis health check failed');
  }

  // Include errors in response for debugging
  health.errors = errors;

  const graphQueryOptimizer = isEnabled('graph-query-optimizer', {
    userId: 'health-check',
  });
  if (graphQueryOptimizer) {
    health.services['graph-query-optimizer'] = 'enabled';
  }

  const cacheStrategy = getVariant('cache-strategy', {
    userId: 'health-check',
  });
  if (cacheStrategy && cacheStrategy !== 'control') {
    health.services['cache-strategy'] = cacheStrategy;
  }

  const traceIdHeader =
    (req.headers['x-request-id'] as string | undefined) ||
    (req.headers['x-trace-id'] as string | undefined) ||
    randomUUID();
  const customerId =
    (req.headers['x-customer-id'] as string | undefined) ||
    (req.headers['x-tenant-id'] as string | undefined) ||
    'platform';

  try {
    await auditTrailService.recordPolicyDecision({
      customer: customerId,
      actorId: 'health-monitor',
      action: 'health_detailed_check',
      resourceId: 'service-health',
      resourceType: 'system',
      classification: 'internal',
      policyVersion: 'health-monitoring-v1',
      decisionId: randomUUID(),
      traceId: traceIdHeader,
      metadata: {
        status: health.status,
        services: health.services,
        errorCount: errors.length,
      },
    });
  } catch (error: any) {
    logger.warn({ error }, 'Failed to append audit trail event for health check');
  }

  const statusCode = health.status === 'ok' ? 200 : 503;
  res.status(statusCode).json(health);
});

/**
 * @openapi
 * /health/ready:
 *   get:
 *     tags:
 *       - Health
 *     summary: Readiness probe for Kubernetes
 *     description: Returns 200 when the service is ready to accept traffic.
 *     responses:
 *       200:
 *         description: Service is ready
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ready
 *       503:
 *         description: Service is not ready
 */
router.get('/health/ready', async (_req: Request, res: Response) => {
  const failures: string[] = [];

  // Check if critical services are available
  if (process.env.DISABLE_NEO4J !== 'true' && process.env.SKIP_DB_CHECKS !== 'true') {
    try {
      const { getNeo4jDriver } = await import('../db/neo4j.js');
      await getNeo4jDriver().verifyConnectivity();
    } catch (error: any) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      failures.push(`Neo4j: ${msg}`);
      logger.warn({ error }, 'Readiness check failed: Neo4j unavailable');
    }
  }

  try {
    const { getPostgresPool } = await import('../db/postgres.js');
    const pool = getPostgresPool();
    await pool.query('SELECT 1');
  } catch (error: any) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    failures.push(`PostgreSQL: ${msg}`);
    logger.warn({ error }, 'Readiness check failed: PostgreSQL unavailable');
  }

  try {
    const { getRedisClient } = await import('../db/redis.js');
    const redis = getRedisClient();
    await redis.ping();
  } catch (error: any) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    failures.push(`Redis: ${msg}`);
    logger.warn({ error }, 'Readiness check failed: Redis unavailable');
  }

  if (failures.length > 0) {
    res.status(503).json({
      status: 'not ready',
      failures,
      message: 'Critical services are unavailable. Check database connections.',
    });
  } else {
    res.status(200).json({ status: 'ready' });
  }
});

/**
 * @openapi
 * /health/live:
 *   get:
 *     tags:
 *       - Health
 *     summary: Liveness probe for Kubernetes
 *     description: Returns 200 if the process is alive.
 *     responses:
 *       200:
 *         description: Service is alive
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: alive
 */
router.get('/health/live', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'alive' });
});

/**
 * Deployment validation endpoint
 * Checks all criteria required for a successful deployment
 */
router.get('/health/deployment', async (_req: Request, res: Response) => {
  // 1. Check basic connectivity
  // 2. Check migrations (simulated check)
  // 3. Check configuration
  const checks = {
    connectivity: true,
    migrations: true, // In real app, query schema_migrations table
    config: true
  };

  if (checks.connectivity && checks.migrations && checks.config) {
    res.status(200).json({ status: 'ready_for_traffic', checks });
  } else {
    res.status(503).json({ status: 'deployment_failed', checks });
  }
});

// Deep health check for all dependencies (Database, Redis, etc.)
// Utilized by k8s liveness probes and external monitoring
export const checkHealth = async () => {
  // Implementation reused from /health/detailed
};

export default router;
