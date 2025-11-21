/**
 * @intelgraph/rate-limiter
 *
 * Comprehensive API rate limiting and throttling system
 *
 * MIT License
 * Copyright (c) 2025 IntelGraph
 */

// Core exports
export { RateLimiter, createRateLimiter } from './rate-limiter.js';

// Algorithm exports
export { SlidingWindowLimiter } from './algorithms/sliding-window.js';
export { TokenBucketLimiter } from './algorithms/token-bucket.js';

// Store exports
export { RedisRateLimitStore } from './store/redis-store.js';

// Middleware exports
export {
  createRateLimitMiddleware,
  createEndpointRateLimiter,
  createTierRateLimiter,
} from './middleware/express.js';

export {
  createGraphQLRateLimitPlugin,
  createFieldRateLimitDirective,
} from './middleware/graphql.js';

// Configuration exports
export {
  DEFAULT_CONFIG,
  DEFAULT_POLICY,
  TIER_LIMITS,
  ENDPOINT_POLICIES,
  TIER_POLICIES,
  getPolicyForEndpoint,
  validateConfig,
  loadConfigFromEnv,
} from './config.js';

// Monitoring exports
export {
  RateLimitMetricsCollector,
  RateLimitAlerter,
  metricsCollector,
  alerter,
} from './monitoring/metrics.js';

// Type exports
export type {
  RateLimitAlgorithm,
  UserTier,
  RateLimitResult,
  RateLimitPolicy,
  TierLimits,
  RateLimitState,
  TokenBucketState,
  KeyGenerator,
  RateLimiterOptions,
  GraphQLRateLimiterOptions,
  RateLimitViolation,
  RateLimiterMetrics,
  IRateLimitStore,
  RateLimitConfig,
} from './types.js';
