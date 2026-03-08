"use strict";
/**
 * Updated Rate Limit Middleware for IntelGraph API
 *
 * MIT License
 * Copyright (c) 2025 IntelGraph
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.metricsCollector = exports.graphqlRateLimitPlugin = exports.rateLimitMiddleware = exports.rateLimiter = void 0;
const ioredis_1 = __importDefault(require("ioredis"));
const rate_limiter_1 = require("@intelgraph/rate-limiter");
Object.defineProperty(exports, "metricsCollector", { enumerable: true, get: function () { return rate_limiter_1.metricsCollector; } });
const logger_js_1 = require("../utils/logger.js");
// Initialize Redis client for rate limiting
const redisClient = new ioredis_1.default({
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
redisClient.on('connect', () => logger_js_1.logger.info('Rate Limit Redis connected'));
redisClient.on('error', (err) => logger_js_1.logger.error({ err }, 'Rate Limit Redis Client Error'));
// Connect Redis
redisClient.connect().catch((err) => {
    logger_js_1.logger.error({ err }, 'Failed to connect to Rate Limit Redis');
});
// Load configuration from environment
const envConfig = (0, rate_limiter_1.loadConfigFromEnv)();
// Create rate limiter instance
exports.rateLimiter = (0, rate_limiter_1.createRateLimiter)(redisClient, envConfig);
// Set up alerting
rate_limiter_1.alerter.onAlert(async (violation) => {
    logger_js_1.logger.warn({
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
exports.rateLimitMiddleware = (0, rate_limiter_1.createRateLimitMiddleware)(exports.rateLimiter, {
    headers: true,
    skip: async (req) => {
        // Skip rate limiting for health checks
        if (req.path === '/health' || req.path === '/metrics') {
            return true;
        }
        // Skip for internal service-to-service calls (if using SPIFFE/mTLS)
        if (req.isInternalCall) {
            return true;
        }
        return false;
    },
});
/**
 * GraphQL rate limit plugin
 */
exports.graphqlRateLimitPlugin = (0, rate_limiter_1.createGraphQLRateLimitPlugin)(exports.rateLimiter, {
    maxComplexity: Number(process.env.GRAPHQL_MAX_COMPLEXITY || 1000),
});
/**
 * Graceful shutdown
 */
process.on('SIGTERM', async () => {
    logger_js_1.logger.info('Shutting down rate limiter...');
    await redisClient.quit();
});
