/**
 * Summit API Gateway Service
 *
 * Main orchestration service that combines all gateway components
 */

import express from 'express';
import { config } from 'dotenv';
import { APIGateway } from '@summit/api-gateway';
import { JWTManager, AuthMiddleware, RBACManager } from '@summit/authentication';
import { RedisRateLimiter, createRateLimitMiddleware } from '@summit/rate-limiting';
import { MetricsCollector } from '@summit/api-analytics';
import pino from 'pino';
import Redis from 'ioredis';

config();

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
});

async function startGatewayService() {
  logger.info('Starting Summit API Gateway Service...');

  // Initialize Redis
  const redis = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
  });

  // Initialize JWT Manager
  const jwtManager = new JWTManager({
    secret: process.env.JWT_SECRET || 'development-secret-change-in-production',
    issuer: 'summit-api-gateway',
    audience: 'summit-users',
    expiresIn: '15m',
    refreshExpiresIn: '7d',
  });

  // Initialize RBAC
  const rbacManager = new RBACManager();
  rbacManager.initializeDefaultRoles();

  // Initialize Auth Middleware
  const authMiddleware = new AuthMiddleware({
    jwtManager,
    rbacManager,
  });

  // Initialize Rate Limiter
  const rateLimiter = new RedisRateLimiter({
    redis,
    windowMs: 60 * 1000, // 1 minute
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX || '100'),
  });

  // Initialize Metrics Collector
  const metrics = new MetricsCollector();

  // Initialize Express App
  const app = express();
  app.use(express.json());

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({
      status: 'healthy',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });

  // Metrics endpoint
  app.get('/metrics', (req, res) => {
    const aggregated = metrics.getAggregatedMetrics();
    res.json(aggregated);
  });

  // Apply rate limiting middleware
  app.use(createRateLimitMiddleware({
    limiter: rateLimiter,
    keyGenerator: (req) => {
      // Use API key, JWT subject, or IP address
      const apiKey = req.headers['x-api-key'] as string;
      if (apiKey) return `apikey:${apiKey}`;

      const authHeader = req.headers.authorization;
      if (authHeader?.startsWith('Bearer ')) {
        try {
          const token = authHeader.substring(7);
          const payload = jwtManager.decodeToken(token);
          if (payload?.sub) return `user:${payload.sub}`;
        } catch {}
      }

      return `ip:${req.ip}`;
    },
  }));

  // Request logging and metrics
  app.use((req, res, next) => {
    const start = Date.now();
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    res.on('finish', () => {
      const duration = Date.now() - start;
      metrics.recordRequest(duration, res.statusCode, {
        method: req.method,
        path: req.path,
      });

      logger.info('Request completed', {
        requestId,
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        duration,
        userAgent: req.headers['user-agent'],
      });
    });

    next();
  });

  // API Gateway routes
  const gateway = new APIGateway({
    routes: [
      {
        path: '/api/v1/investigations*',
        backends: [
          { url: process.env.INVESTIGATIONS_SERVICE_URL || 'http://localhost:3001' },
        ],
      },
      {
        path: '/api/v1/entities*',
        backends: [
          { url: process.env.ENTITIES_SERVICE_URL || 'http://localhost:3002' },
        ],
      },
      {
        path: '/api/v1/relationships*',
        backends: [
          { url: process.env.RELATIONSHIPS_SERVICE_URL || 'http://localhost:3003' },
        ],
      },
    ],
    loadBalancing: {
      strategy: 'round-robin',
      healthCheckInterval: 30000,
    },
    circuitBreaker: {
      threshold: 5,
      timeout: 60000,
      resetTimeout: 30000,
    },
  });

  // Protected API routes
  app.use('/api/*', authMiddleware.authenticate());

  // Error handling
  app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    logger.error('Request error', {
      error: err.message,
      stack: err.stack,
      path: req.path,
    });

    metrics.recordError(500, err.message, {
      path: req.path,
      method: req.method,
    });

    res.status(500).json({
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  });

  // Start server
  const PORT = parseInt(process.env.PORT || '8080');
  const HOST = process.env.HOST || '0.0.0.0';

  app.listen(PORT, HOST, () => {
    logger.info(`🚀 Summit API Gateway running on http://${HOST}:${PORT}`);
    logger.info(`📊 Health check: http://${HOST}:${PORT}/health`);
    logger.info(`📈 Metrics: http://${HOST}:${PORT}/metrics`);
  });

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    logger.info('SIGTERM received, shutting down gracefully...');
    await redis.quit();
    process.exit(0);
  });
}

startGatewayService().catch((error) => {
  logger.error('Failed to start gateway service', { error });
  process.exit(1);
});
