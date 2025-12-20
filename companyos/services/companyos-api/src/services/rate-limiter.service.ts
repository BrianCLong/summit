/**
 * CompanyOS Tenant-Aware Rate Limiter Service
 *
 * Implements B2: Tenant-Aware Rate Limiting & Guardrails
 *
 * Features:
 * - Per-tenant rate limits
 * - Per-endpoint rate limits
 * - Configurable thresholds based on tenant tier
 * - Metrics emission for monitoring
 * - Fail-open/fail-closed configuration
 */

import { createLogger } from '../utils/logger.js';
import { TenantTier } from '../types/tenant.js';

const logger = createLogger('rate-limiter');

// ============================================================================
// Types
// ============================================================================

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

export interface TenantRateLimitConfig {
  [TenantTier.STARTER]: RateLimitConfig;
  [TenantTier.BRONZE]: RateLimitConfig;
  [TenantTier.SILVER]: RateLimitConfig;
  [TenantTier.GOLD]: RateLimitConfig;
  [TenantTier.ENTERPRISE]: RateLimitConfig;
}

export interface EndpointRateLimitConfig {
  [endpoint: string]: {
    [tier: string]: RateLimitConfig;
  };
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  resetAt: Date;
  retryAfter?: number;
}

export interface RateLimitMetrics {
  tenantId: string;
  endpoint: string;
  blockedCount: number;
  allowedCount: number;
  lastBlocked?: Date;
}

export interface RateLimiterConfig {
  enabled: boolean;
  failOpen: boolean; // If rate limiter fails, allow or deny?
  defaultWindowMs: number;
  defaultMaxRequests: number;
  bypassRoles: string[];
  tenantLimits: TenantRateLimitConfig;
  endpointLimits: EndpointRateLimitConfig;
}

// ============================================================================
// Token Bucket Implementation
// ============================================================================

interface TokenBucket {
  tokens: number;
  lastRefill: number;
  maxTokens: number;
  refillRate: number; // tokens per ms
}

// ============================================================================
// Rate Limiter Service
// ============================================================================

export class RateLimiterService {
  private config: RateLimiterConfig;
  private buckets: Map<string, TokenBucket> = new Map();
  private metrics: Map<string, RateLimitMetrics> = new Map();

  constructor(config?: Partial<RateLimiterConfig>) {
    this.config = {
      enabled: true,
      failOpen: true,
      defaultWindowMs: 60000, // 1 minute
      defaultMaxRequests: 100,
      bypassRoles: ['global-admin', 'system'],
      tenantLimits: {
        [TenantTier.STARTER]: { windowMs: 60000, maxRequests: 100 },
        [TenantTier.BRONZE]: { windowMs: 60000, maxRequests: 500 },
        [TenantTier.SILVER]: { windowMs: 60000, maxRequests: 1000 },
        [TenantTier.GOLD]: { windowMs: 60000, maxRequests: 5000 },
        [TenantTier.ENTERPRISE]: { windowMs: 60000, maxRequests: 10000 },
      },
      endpointLimits: {
        // Specific endpoint overrides
        'graphql:mutation': {
          [TenantTier.STARTER]: { windowMs: 60000, maxRequests: 50 },
          [TenantTier.BRONZE]: { windowMs: 60000, maxRequests: 200 },
          [TenantTier.SILVER]: { windowMs: 60000, maxRequests: 500 },
          [TenantTier.GOLD]: { windowMs: 60000, maxRequests: 2000 },
          [TenantTier.ENTERPRISE]: { windowMs: 60000, maxRequests: 5000 },
        },
        'export:bulk': {
          [TenantTier.STARTER]: { windowMs: 3600000, maxRequests: 5 },
          [TenantTier.BRONZE]: { windowMs: 3600000, maxRequests: 20 },
          [TenantTier.SILVER]: { windowMs: 3600000, maxRequests: 50 },
          [TenantTier.GOLD]: { windowMs: 3600000, maxRequests: 200 },
          [TenantTier.ENTERPRISE]: { windowMs: 3600000, maxRequests: 1000 },
        },
        'copilot:query': {
          [TenantTier.STARTER]: { windowMs: 60000, maxRequests: 10 },
          [TenantTier.BRONZE]: { windowMs: 60000, maxRequests: 50 },
          [TenantTier.SILVER]: { windowMs: 60000, maxRequests: 100 },
          [TenantTier.GOLD]: { windowMs: 60000, maxRequests: 500 },
          [TenantTier.ENTERPRISE]: { windowMs: 60000, maxRequests: 1000 },
        },
      },
      ...config,
    };

    logger.info('RateLimiterService initialized', {
      enabled: this.config.enabled,
      failOpen: this.config.failOpen,
    });

    // Start metrics cleanup interval
    setInterval(() => this.cleanupOldBuckets(), 300000); // Every 5 minutes
  }

  // ============================================================================
  // Rate Limiting
  // ============================================================================

  /**
   * Check if request should be allowed
   */
  async checkLimit(
    tenantId: string,
    endpoint: string,
    tier: TenantTier,
    userRoles?: string[]
  ): Promise<RateLimitResult> {
    if (!this.config.enabled) {
      return this.allowResult(Infinity);
    }

    // Check for bypass roles
    if (userRoles?.some((role) => this.config.bypassRoles.includes(role))) {
      logger.debug('Rate limit bypassed due to role', { tenantId, endpoint });
      return this.allowResult(Infinity);
    }

    try {
      const config = this.getConfigForEndpoint(endpoint, tier);
      const bucketKey = this.getBucketKey(tenantId, endpoint);

      const bucket = this.getOrCreateBucket(bucketKey, config);
      const result = this.tryAcquireToken(bucket, config);

      // Update metrics
      this.updateMetrics(tenantId, endpoint, result.allowed);

      if (!result.allowed) {
        logger.warn('Rate limit exceeded', {
          tenantId,
          endpoint,
          remaining: result.remaining,
          limit: result.limit,
          resetAt: result.resetAt,
        });

        // Emit metric for monitoring
        this.emitBlockedMetric(tenantId, endpoint);
      }

      return result;
    } catch (error) {
      logger.error('Rate limiter error', {
        error: error instanceof Error ? error.message : String(error),
        tenantId,
        endpoint,
      });

      // Fail open or closed based on config
      if (this.config.failOpen) {
        return this.allowResult(this.config.defaultMaxRequests);
      } else {
        return this.denyResult(0, new Date(Date.now() + 60000));
      }
    }
  }

  /**
   * Check multiple endpoints at once (useful for complex operations)
   */
  async checkMultipleLimits(
    tenantId: string,
    endpoints: string[],
    tier: TenantTier,
    userRoles?: string[]
  ): Promise<Map<string, RateLimitResult>> {
    const results = new Map<string, RateLimitResult>();

    for (const endpoint of endpoints) {
      const result = await this.checkLimit(tenantId, endpoint, tier, userRoles);
      results.set(endpoint, result);
    }

    return results;
  }

  /**
   * Reset rate limit for a tenant (admin operation)
   */
  async resetLimit(tenantId: string, endpoint?: string): Promise<void> {
    if (endpoint) {
      const key = this.getBucketKey(tenantId, endpoint);
      this.buckets.delete(key);
      logger.info('Rate limit reset', { tenantId, endpoint });
    } else {
      // Reset all limits for tenant
      for (const key of this.buckets.keys()) {
        if (key.startsWith(`${tenantId}:`)) {
          this.buckets.delete(key);
        }
      }
      logger.info('All rate limits reset for tenant', { tenantId });
    }
  }

  // ============================================================================
  // Metrics
  // ============================================================================

  /**
   * Get current rate limit status for a tenant
   */
  async getStatus(
    tenantId: string,
    endpoint: string,
    tier: TenantTier
  ): Promise<RateLimitResult> {
    const config = this.getConfigForEndpoint(endpoint, tier);
    const bucketKey = this.getBucketKey(tenantId, endpoint);
    const bucket = this.buckets.get(bucketKey);

    if (!bucket) {
      return this.allowResult(config.maxRequests);
    }

    // Refill tokens to get current state
    this.refillTokens(bucket, config);

    return {
      allowed: bucket.tokens > 0,
      remaining: Math.floor(bucket.tokens),
      limit: config.maxRequests,
      resetAt: new Date(bucket.lastRefill + config.windowMs),
    };
  }

  /**
   * Get metrics for a tenant
   */
  getMetrics(tenantId: string): RateLimitMetrics[] {
    const result: RateLimitMetrics[] = [];

    for (const [key, metrics] of this.metrics.entries()) {
      if (key.startsWith(`${tenantId}:`)) {
        result.push(metrics);
      }
    }

    return result;
  }

  /**
   * Get all metrics (for dashboard)
   */
  getAllMetrics(): RateLimitMetrics[] {
    return Array.from(this.metrics.values());
  }

  // ============================================================================
  // Configuration
  // ============================================================================

  /**
   * Update rate limit configuration dynamically
   */
  updateConfig(config: Partial<RateLimiterConfig>): void {
    this.config = { ...this.config, ...config };
    logger.info('Rate limiter config updated', { config });
  }

  /**
   * Update endpoint-specific limits
   */
  updateEndpointLimit(
    endpoint: string,
    tier: TenantTier,
    config: RateLimitConfig
  ): void {
    if (!this.config.endpointLimits[endpoint]) {
      this.config.endpointLimits[endpoint] = {};
    }
    this.config.endpointLimits[endpoint][tier] = config;
    logger.info('Endpoint limit updated', { endpoint, tier, config });
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private getConfigForEndpoint(
    endpoint: string,
    tier: TenantTier
  ): RateLimitConfig {
    // Check for endpoint-specific config
    const endpointConfig = this.config.endpointLimits[endpoint];
    if (endpointConfig && endpointConfig[tier]) {
      return endpointConfig[tier];
    }

    // Fall back to tier-based config
    return this.config.tenantLimits[tier] || {
      windowMs: this.config.defaultWindowMs,
      maxRequests: this.config.defaultMaxRequests,
    };
  }

  private getBucketKey(tenantId: string, endpoint: string): string {
    return `${tenantId}:${endpoint}`;
  }

  private getOrCreateBucket(key: string, config: RateLimitConfig): TokenBucket {
    let bucket = this.buckets.get(key);

    if (!bucket) {
      bucket = {
        tokens: config.maxRequests,
        lastRefill: Date.now(),
        maxTokens: config.maxRequests,
        refillRate: config.maxRequests / config.windowMs,
      };
      this.buckets.set(key, bucket);
    }

    return bucket;
  }

  private tryAcquireToken(
    bucket: TokenBucket,
    config: RateLimitConfig
  ): RateLimitResult {
    // Refill tokens based on elapsed time
    this.refillTokens(bucket, config);

    if (bucket.tokens >= 1) {
      bucket.tokens -= 1;
      return {
        allowed: true,
        remaining: Math.floor(bucket.tokens),
        limit: config.maxRequests,
        resetAt: new Date(bucket.lastRefill + config.windowMs),
      };
    }

    // Calculate retry after
    const tokensNeeded = 1;
    const timeToRefill = Math.ceil(tokensNeeded / bucket.refillRate);
    const retryAfter = Math.ceil(timeToRefill / 1000); // Convert to seconds

    return {
      allowed: false,
      remaining: 0,
      limit: config.maxRequests,
      resetAt: new Date(bucket.lastRefill + config.windowMs),
      retryAfter,
    };
  }

  private refillTokens(bucket: TokenBucket, config: RateLimitConfig): void {
    const now = Date.now();
    const elapsed = now - bucket.lastRefill;

    if (elapsed >= config.windowMs) {
      // Full refill
      bucket.tokens = config.maxRequests;
      bucket.lastRefill = now;
    } else {
      // Partial refill based on elapsed time
      const tokensToAdd = elapsed * bucket.refillRate;
      bucket.tokens = Math.min(bucket.maxTokens, bucket.tokens + tokensToAdd);
      bucket.lastRefill = now;
    }
  }

  private updateMetrics(
    tenantId: string,
    endpoint: string,
    allowed: boolean
  ): void {
    const key = this.getBucketKey(tenantId, endpoint);
    let metrics = this.metrics.get(key);

    if (!metrics) {
      metrics = {
        tenantId,
        endpoint,
        blockedCount: 0,
        allowedCount: 0,
      };
      this.metrics.set(key, metrics);
    }

    if (allowed) {
      metrics.allowedCount++;
    } else {
      metrics.blockedCount++;
      metrics.lastBlocked = new Date();
    }
  }

  private emitBlockedMetric(tenantId: string, endpoint: string): void {
    // In production, this would emit to Prometheus
    // For now, just log
    logger.info('METRIC: companyos_rate_limit_blocks_total', {
      labels: { tenant_id: tenantId, endpoint },
    });
  }

  private allowResult(remaining: number): RateLimitResult {
    return {
      allowed: true,
      remaining,
      limit: remaining,
      resetAt: new Date(Date.now() + this.config.defaultWindowMs),
    };
  }

  private denyResult(remaining: number, resetAt: Date): RateLimitResult {
    return {
      allowed: false,
      remaining,
      limit: this.config.defaultMaxRequests,
      resetAt,
      retryAfter: Math.ceil((resetAt.getTime() - Date.now()) / 1000),
    };
  }

  private cleanupOldBuckets(): void {
    const now = Date.now();
    const maxAge = 3600000; // 1 hour

    for (const [key, bucket] of this.buckets.entries()) {
      if (now - bucket.lastRefill > maxAge) {
        this.buckets.delete(key);
      }
    }

    logger.debug('Rate limiter bucket cleanup completed', {
      remainingBuckets: this.buckets.size,
    });
  }
}

// Export singleton
let rateLimiterInstance: RateLimiterService | null = null;

export function getRateLimiterService(
  config?: Partial<RateLimiterConfig>
): RateLimiterService {
  if (!rateLimiterInstance) {
    rateLimiterInstance = new RateLimiterService(config);
  }
  return rateLimiterInstance;
}
