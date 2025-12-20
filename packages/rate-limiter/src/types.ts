/**
 * Rate Limiter Types and Interfaces
 *
 * MIT License
 * Copyright (c) 2025 IntelGraph
 */

import type { Request, Response, NextFunction } from 'express';

/**
 * Rate limiting algorithms
 */
export type RateLimitAlgorithm = 'sliding-window' | 'token-bucket' | 'fixed-window';

/**
 * User tier levels
 */
export type UserTier = 'free' | 'basic' | 'premium' | 'enterprise' | 'internal';

/**
 * Rate limit result status
 */
export type RateLimitResult = 'allowed' | 'denied' | 'error';

/**
 * Rate limit policy configuration
 */
export interface RateLimitPolicy {
  /** Unique identifier for the policy */
  id: string;
  /** Human-readable name */
  name: string;
  /** Description of the policy */
  description?: string;
  /** Algorithm to use */
  algorithm: RateLimitAlgorithm;
  /** Time window in milliseconds */
  windowMs: number;
  /** Maximum requests per window */
  max: number;
  /** Token bucket capacity (for token bucket algorithm) */
  capacity?: number;
  /** Token refill rate per second (for token bucket algorithm) */
  refillRate?: number;
  /** User tiers this policy applies to */
  tiers?: UserTier[];
  /** Endpoint patterns this policy applies to */
  endpoints?: string[];
  /** Whether this policy is enabled */
  enabled: boolean;
  /** Custom key generator */
  keyGenerator?: KeyGenerator;
}

/**
 * Rate limit tier configuration
 */
export interface TierLimits {
  tier: UserTier;
  requestsPerMinute: number;
  requestsPerHour: number;
  burstSize: number;
  graphqlComplexity: number;
}

/**
 * Rate limit state
 */
export interface RateLimitState {
  /** Unique key for this rate limit */
  key: string;
  /** Number of requests consumed */
  consumed: number;
  /** Maximum allowed requests */
  limit: number;
  /** Remaining requests */
  remaining: number;
  /** Timestamp when the limit resets (Unix timestamp in seconds) */
  resetAt: number;
  /** Time to wait before retrying (seconds) */
  retryAfter: number;
  /** Whether the limit was exceeded */
  isExceeded: boolean;
}

/**
 * Token bucket state
 */
export interface TokenBucketState {
  /** Number of tokens available */
  tokens: number;
  /** Maximum bucket capacity */
  capacity: number;
  /** Last refill timestamp */
  lastRefill: number;
  /** Refill rate (tokens per second) */
  refillRate: number;
}

/**
 * Key generator function
 */
export type KeyGenerator = (req: Request) => string | Promise<string>;

/**
 * Rate limiter options
 */
export interface RateLimiterOptions {
  /** Algorithm to use */
  algorithm?: RateLimitAlgorithm;
  /** Time window in milliseconds */
  windowMs?: number;
  /** Maximum requests per window */
  max?: number;
  /** Token bucket capacity */
  capacity?: number;
  /** Token refill rate per second */
  refillRate?: number;
  /** Custom key generator */
  keyGenerator?: KeyGenerator;
  /** Custom message for rate limit exceeded */
  message?: string;
  /** HTTP status code for rate limit exceeded */
  statusCode?: number;
  /** Include X-RateLimit-* headers */
  headers?: boolean;
  /** Skip rate limiting for certain requests */
  skip?: (req: Request) => boolean | Promise<boolean>;
  /** Handler for rate limit exceeded */
  handler?: (req: Request, res: Response, next: NextFunction, state: RateLimitState) => void;
  /** Redis key prefix */
  keyPrefix?: string;
  /** Enable metrics collection */
  enableMetrics?: boolean;
}

/**
 * GraphQL rate limiter options
 */
export interface GraphQLRateLimiterOptions extends RateLimiterOptions {
  /** Maximum query complexity */
  maxComplexity?: number;
  /** Cost per field */
  fieldCost?: number;
  /** Cost per depth level */
  depthCost?: number;
}

/**
 * Rate limit violation event
 */
export interface RateLimitViolation {
  /** Timestamp of violation */
  timestamp: Date;
  /** User/client identifier */
  identifier: string;
  /** Endpoint that was rate limited */
  endpoint: string;
  /** User tier */
  tier?: UserTier;
  /** Number of requests attempted */
  attempted: number;
  /** Maximum allowed */
  limit: number;
  /** IP address */
  ip?: string;
  /** User agent */
  userAgent?: string;
}

/**
 * Rate limiter metrics
 */
export interface RateLimiterMetrics {
  /** Total requests processed */
  totalRequests: number;
  /** Requests allowed */
  allowedRequests: number;
  /** Requests denied */
  deniedRequests: number;
  /** Errors encountered */
  errors: number;
  /** Average response time (ms) */
  avgResponseTime: number;
  /** P95 response time (ms) */
  p95ResponseTime: number;
  /** Violations by tier */
  violationsByTier: Record<UserTier, number>;
  /** Violations by endpoint */
  violationsByEndpoint: Record<string, number>;
}

/**
 * Redis store interface
 */
export interface IRateLimitStore {
  /** Increment and get current count */
  increment(key: string, windowMs: number): Promise<RateLimitState>;
  /** Get current state */
  get(key: string): Promise<RateLimitState | null>;
  /** Reset limit for a key */
  reset(key: string): Promise<void>;
  /** Get token bucket state */
  getTokenBucket(key: string): Promise<TokenBucketState | null>;
  /** Consume tokens from bucket */
  consumeTokens(key: string, tokens: number, capacity: number, refillRate: number): Promise<TokenBucketState>;
  /** Health check */
  healthCheck(): Promise<boolean>;
}

/**
 * Configuration for rate limit policies
 */
export interface RateLimitConfig {
  /** Default policy */
  defaultPolicy: RateLimitPolicy;
  /** Tier-specific policies */
  tierPolicies: Record<UserTier, Partial<RateLimitPolicy>>;
  /** Endpoint-specific policies */
  endpointPolicies: Record<string, Partial<RateLimitPolicy>>;
  /** Global settings */
  global: {
    enabled: boolean;
    keyPrefix: string;
    enableMetrics: boolean;
    alertThreshold: number;
  };
}
