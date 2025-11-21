/**
 * Updated Rate Limit Middleware for IntelGraph API
 *
 * MIT License
 * Copyright (c) 2025 IntelGraph
 */

import Redis from 'ioredis';
import {
  createRateLimiter,
  createRateLimitMiddleware,
  createGraphQLRateLimitPlugin,
  metricsCollector,
  alerter,
  loadConfigFromEnv,
} from '@intelgraph/rate-limiter';
import { logger } from '../utils/logger.js';

// Initialize Redis client for rate limiting
const redisClient = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT || 6379),
  password: process.env.REDIS_PASSWORD || undefined,
  db: Number(process.env.REDIS_RATE_LIMIT_DB || 1), // Separate DB for rate limiting
  keyPrefix: 'intelgraph:ratelimit:',
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  lazyConnect: true,
});

redisClient.on('connect', () => logger.info('Rate Limit Redis connected'));
redisClient.on('error', (err) =>
  logger.error({ err }, 'Rate Limit Redis Client Error'),
);

// Connect Redis
redisClient.connect().catch((err) => {
  logger.error({ err }, 'Failed to connect to Rate Limit Redis');
});

// Load configuration from environment
const envConfig = loadConfigFromEnv();

// Create rate limiter instance
export const rateLimiter = createRateLimiter(redisClient, envConfig);

// Set up alerting
alerter.onAlert(async (violation) => {
  logger.warn({
    message: 'Rate limit violation alert',
    identifier: violation.identifier,
    endpoint: violation.endpoint,
    tier: violation.tier,
    attempted: violation.attempted,
    limit: violation.limit,
  });

  // TODO: Send alerts to monitoring system (e.g., PagerDuty, Slack)
  // Example:
  // await sendSlackAlert({
  //   channel: '#security-alerts',
  //   message: `Rate limit violation: ${violation.identifier} on ${violation.endpoint}`,
  // });
});

/**
 * Express middleware for rate limiting
 */
export const rateLimitMiddleware = createRateLimitMiddleware(rateLimiter, {
  headers: true,
  skip: async (req) => {
    // Skip rate limiting for health checks
    if (req.path === '/health' || req.path === '/metrics') {
      return true;
    }

    // Skip for internal service-to-service calls (if using SPIFFE/mTLS)
    if ((req as any).isInternalCall) {
      return true;
    }

    return false;
  },
});

/**
 * GraphQL rate limit plugin
 */
export const graphqlRateLimitPlugin = createGraphQLRateLimitPlugin(rateLimiter, {
  maxComplexity: Number(process.env.GRAPHQL_MAX_COMPLEXITY || 1000),
});

/**
 * Export metrics collector for monitoring endpoints
 */
export { metricsCollector };

/**
 * Graceful shutdown
 */
process.on('SIGTERM', async () => {
  logger.info('Shutting down rate limiter...');
  await redisClient.quit();
});
