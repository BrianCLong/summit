/**
 * Monitoring and observability endpoints
 */
import express, { Request, Response } from 'express';
import { z } from 'zod';
import { register, webVitalValue } from '../monitoring/metrics.js';
import {
  performHealthCheck,
  getCachedHealthStatus,
  livenessProbe,
  readinessProbe,
  checkDatabase,
  checkNeo4j,
  checkRedis,
  checkMlService,
  checkSystemResources,
} from '../monitoring/health.js';
import { recordBusinessEvent, type BusinessMetricEvent } from '../monitoring/businessMetrics.js';

const router = express.Router();
router.use(express.json());

/**
 * Prometheus metrics endpoint
 * GET /metrics
 */
router.get('/metrics', async (req: Request, res: Response) => {
  try {
    res.set('Content-Type', register.contentType);
    const metrics = await register.metrics();
    res.end(metrics);
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to collect metrics',
      details: error.message,
    });
  }
});

/**
 * Comprehensive health check endpoint
 * GET /health
 */
router.get('/health', async (req: Request, res: Response) => {
  try {
    const health = await performHealthCheck();
    const statusCode = health.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(health);
  } catch (error: any) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message,
    });
  }
});

/**
 * Quick health check (cached)
 * GET /health/quick
 */
router.get('/health/quick', (req: Request, res: Response) => {
  try {
    const health = getCachedHealthStatus();
    const statusCode = health.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(health);
  } catch (error: any) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message,
    });
  }
});

/**
 * Kubernetes liveness probe
 * GET /health/live
 */
router.get('/health/live', async (req: Request, res: Response) => {
  try {
    const liveness = await livenessProbe();
    res.status(200).json(liveness);
  } catch (error: any) {
    res.status(503).json({
      status: 'not_alive',
      timestamp: new Date().toISOString(),
      error: error.message,
    });
  }
});

/**
 * Kubernetes readiness probe
 * GET /health/ready
 */
router.get('/health/ready', async (req: Request, res: Response) => {
  try {
    const readiness = await readinessProbe();
    const statusCode = readiness.status === 'ready' ? 200 : 503;
    res.status(statusCode).json(readiness);
  } catch (error: any) {
    res.status(503).json({
      status: 'not_ready',
      timestamp: new Date().toISOString(),
      error: error.message,
    });
  }
});

/**
 * System information endpoint
 * GET /health/info
 */
router.get('/health/info', (req: Request, res: Response) => {
  const info = {
    service: 'intelgraph-server',
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
    uptime: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
    pid: process.pid,
    memory: {
      heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
      external: Math.round(process.memoryUsage().external / 1024 / 1024),
      rss: Math.round(process.memoryUsage().rss / 1024 / 1024),
    },
  };
  
  res.json(info);
});

/**
 * Individual service health checks
 */

// Database health
router.get('/health/database', async (req: Request, res: Response) => {
  try {
    const dbHealth = await checkDatabase();
    const statusCode = dbHealth.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(dbHealth);
  } catch (error: any) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
    });
  }
});

// Neo4j health
router.get('/health/neo4j', async (req: Request, res: Response) => {
  try {
    const neo4jHealth = await checkNeo4j();
    const statusCode = neo4jHealth.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(neo4jHealth);
  } catch (error: any) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
    });
  }
});

// Redis health
router.get('/health/redis', async (req: Request, res: Response) => {
  try {
    const redisHealth = await checkRedis();
    const statusCode = redisHealth.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(redisHealth);
  } catch (error: any) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
    });
  }
});

// ML service health
router.get('/health/ml', async (req: Request, res: Response) => {
  try {
    const mlHealth = await checkMlService();
    const statusCode = mlHealth.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(mlHealth);
  } catch (error: any) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
    });
  }
});

// System resources health
router.get('/health/system', (req: Request, res: Response) => {
  try {
    const systemHealth = checkSystemResources();
    const statusCode = systemHealth.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(systemHealth);
  } catch (error: any) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
    });
  }
});

const businessMetricSchema = z.object({
  type: z.enum(['user_signup', 'api_call', 'revenue']),
  tenant: z.string().min(1).optional(),
  plan: z.string().min(1).optional(),
  service: z.string().min(1).optional(),
  route: z.string().min(1).optional(),
  statusCode: z.number().int().optional(),
  amount: z.number().optional(),
  currency: z.string().min(1).optional(),
  metadata: z.record(z.any()).optional(),
});

router.post('/metrics/business', (req: Request, res: Response) => {
  try {
    const payload = businessMetricSchema.parse(req.body) as BusinessMetricEvent;
    recordBusinessEvent(payload);
    res.status(202).json({
      status: 'accepted',
      recordedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(400).json({
      error: 'Invalid business metric payload',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * Collect Web Vitals metrics from clients
 * POST /web-vitals
 */
router.post('/web-vitals', (req: Request, res: Response) => {
  const { name, value, id } = req.body || {};
  if (typeof name !== 'string' || typeof value !== 'number') {
    return res.status(400).json({ error: 'Invalid web vitals payload' });
  }

  try {
    webVitalValue.set({ metric: name, id: id || 'unknown' }, value);
    res.status(204).end();
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to record web vital', details: error.message });
  }
});

export default router;
