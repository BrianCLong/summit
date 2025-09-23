/**
 * Monitoring and observability endpoints
 */
const express = require('express');
const { register } = require('../monitoring/metrics');
const {
  performHealthCheck,
  getCachedHealthStatus,
  livenessProbe,
  readinessProbe,
} = require('../monitoring/health');

const router = express.Router();

/**
 * Prometheus metrics endpoint
 * GET /metrics
 */
router.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', register.contentType);
    const metrics = await register.metrics();
    res.end(metrics);
  } catch (error) {
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
router.get('/health', async (req, res) => {
  try {
    const health = await performHealthCheck();
    const statusCode = health.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(health);
  } catch (error) {
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
router.get('/health/quick', (req, res) => {
  try {
    const health = getCachedHealthStatus();
    const statusCode = health.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(health);
  } catch (error) {
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
router.get('/health/live', async (req, res) => {
  try {
    const liveness = await livenessProbe();
    res.status(200).json(liveness);
  } catch (error) {
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
router.get('/health/ready', async (req, res) => {
  try {
    const readiness = await readinessProbe();
    const statusCode = readiness.status === 'ready' ? 200 : 503;
    res.status(statusCode).json(readiness);
  } catch (error) {
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
router.get('/health/info', (req, res) => {
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
router.get('/health/database', async (req, res) => {
  const { checkDatabase } = require('../monitoring/health');
  try {
    const dbHealth = await checkDatabase();
    const statusCode = dbHealth.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(dbHealth);
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
    });
  }
});

// Neo4j health
router.get('/health/neo4j', async (req, res) => {
  const { checkNeo4j } = require('../monitoring/health');
  try {
    const neo4jHealth = await checkNeo4j();
    const statusCode = neo4jHealth.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(neo4jHealth);
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
    });
  }
});

// Redis health
router.get('/health/redis', async (req, res) => {
  const { checkRedis } = require('../monitoring/health');
  try {
    const redisHealth = await checkRedis();
    const statusCode = redisHealth.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(redisHealth);
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
    });
  }
});

// ML service health
router.get('/health/ml', async (req, res) => {
  const { checkMlService } = require('../monitoring/health');
  try {
    const mlHealth = await checkMlService();
    const statusCode = mlHealth.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(mlHealth);
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
    });
  }
});

// System resources health
router.get('/health/system', (req, res) => {
  const { checkSystemResources } = require('../monitoring/health');
  try {
    const systemHealth = checkSystemResources();
    const statusCode = systemHealth.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(systemHealth);
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
    });
  }
});

module.exports = router;