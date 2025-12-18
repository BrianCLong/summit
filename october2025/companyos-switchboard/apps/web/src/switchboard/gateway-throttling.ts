/**
 * Secure API Gateway Throttling and Quota Enforcement for Switchboard
 * Fine-grained rate limiting, quotas, and authentication controls
 * to protect upstream Summit services from overload and abuse.
 */

import { z } from 'zod';
import { EventEmitter } from 'events';
import { createHash, createHmac } from 'crypto';

// Rate limit algorithm types
export const RateLimitAlgorithmSchema = z.enum(['token_bucket', 'sliding_window', 'fixed_window', 'leaky_bucket']);
export type RateLimitAlgorithm = z.infer<typeof RateLimitAlgorithmSchema>;

// Rate limit tier
export const RateLimitTierSchema = z.enum(['free', 'basic', 'premium', 'enterprise', 'internal', 'unlimited']);
export type RateLimitTier = z.infer<typeof RateLimitTierSchema>;

// Tier configuration
export const TierConfigSchema = z.object({
  tier: RateLimitTierSchema,
  requestsPerSecond: z.number().int().min(0),
  requestsPerMinute: z.number().int().min(0),
  requestsPerHour: z.number().int().min(0),
  requestsPerDay: z.number().int().min(0),
  burstLimit: z.number().int().min(0),
  concurrentRequests: z.number().int().min(0),
  quotaLimit: z.number().int().min(0).optional(), // Monthly quota
  costLimit: z.number().min(0).optional(), // Cost-based quota
  priority: z.number().int().min(0).max(100),
});

export type TierConfig = z.infer<typeof TierConfigSchema>;

// Default tier configurations
export const DEFAULT_TIER_CONFIGS: Record<RateLimitTier, TierConfig> = {
  free: {
    tier: 'free',
    requestsPerSecond: 1,
    requestsPerMinute: 10,
    requestsPerHour: 100,
    requestsPerDay: 1000,
    burstLimit: 5,
    concurrentRequests: 2,
    quotaLimit: 10000,
    priority: 10,
  },
  basic: {
    tier: 'basic',
    requestsPerSecond: 10,
    requestsPerMinute: 60,
    requestsPerHour: 1000,
    requestsPerDay: 10000,
    burstLimit: 20,
    concurrentRequests: 5,
    quotaLimit: 100000,
    priority: 30,
  },
  premium: {
    tier: 'premium',
    requestsPerSecond: 50,
    requestsPerMinute: 300,
    requestsPerHour: 10000,
    requestsPerDay: 100000,
    burstLimit: 100,
    concurrentRequests: 20,
    quotaLimit: 1000000,
    priority: 50,
  },
  enterprise: {
    tier: 'enterprise',
    requestsPerSecond: 200,
    requestsPerMinute: 1000,
    requestsPerHour: 50000,
    requestsPerDay: 500000,
    burstLimit: 500,
    concurrentRequests: 100,
    quotaLimit: 10000000,
    priority: 70,
  },
  internal: {
    tier: 'internal',
    requestsPerSecond: 1000,
    requestsPerMinute: 10000,
    requestsPerHour: 500000,
    requestsPerDay: 5000000,
    burstLimit: 2000,
    concurrentRequests: 500,
    priority: 90,
  },
  unlimited: {
    tier: 'unlimited',
    requestsPerSecond: 0, // 0 = unlimited
    requestsPerMinute: 0,
    requestsPerHour: 0,
    requestsPerDay: 0,
    burstLimit: 0,
    concurrentRequests: 0,
    priority: 100,
  },
};

// API key schema
export const ApiKeySchema = z.object({
  id: z.string(),
  key: z.string(), // Hashed
  name: z.string(),
  description: z.string().optional(),
  tenantId: z.string(),
  userId: z.string().optional(),
  tier: RateLimitTierSchema,
  permissions: z.array(z.string()),
  scopes: z.array(z.string()).optional(),
  allowedIPs: z.array(z.string()).optional(),
  allowedOrigins: z.array(z.string()).optional(),
  rateOverrides: TierConfigSchema.partial().optional(),
  quotaUsed: z.number().default(0),
  lastUsedAt: z.date().optional(),
  expiresAt: z.date().optional(),
  isActive: z.boolean().default(true),
  metadata: z.record(z.unknown()).optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type ApiKey = z.infer<typeof ApiKeySchema>;

// Rate limit result
export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  resetAt: Date;
  retryAfterMs?: number;
  tier: RateLimitTier;
  reason?: string;
}

// Quota check result
export interface QuotaCheckResult {
  allowed: boolean;
  used: number;
  limit: number;
  remaining: number;
  resetAt: Date;
  percentage: number;
}

// Request context for throttling
export interface ThrottleContext {
  apiKeyId?: string;
  userId?: string;
  tenantId?: string;
  ipAddress: string;
  userAgent?: string;
  origin?: string;
  endpoint: string;
  method: string;
  cost?: number; // Request cost for cost-based throttling
}

// Throttle decision
export interface ThrottleDecision {
  allowed: boolean;
  rateLimit: RateLimitResult;
  quota?: QuotaCheckResult;
  authenticated: boolean;
  tier: RateLimitTier;
  headers: Record<string, string>;
  blocked?: {
    reason: string;
    code: string;
    retryAfterMs?: number;
  };
}

// Token bucket state
interface TokenBucket {
  tokens: number;
  lastRefill: number;
  capacity: number;
  refillRate: number; // tokens per second
}

// Sliding window entry
interface WindowEntry {
  count: number;
  timestamp: number;
}

interface GatewayThrottlerConfig {
  algorithm?: RateLimitAlgorithm;
  tierConfigs?: Record<RateLimitTier, TierConfig>;
  defaultTier?: RateLimitTier;
  enableQuotas?: boolean;
  quotaResetDay?: number; // Day of month for quota reset
  bypassTokens?: string[];
  logger?: Logger;
  metrics?: MetricsClient;
  storage?: ThrottlerStorage;
}

interface Logger {
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
  debug(message: string, meta?: Record<string, unknown>): void;
}

interface MetricsClient {
  increment(metric: string, tags?: Record<string, string>): void;
  histogram(metric: string, value: number, tags?: Record<string, string>): void;
  gauge(metric: string, value: number, tags?: Record<string, string>): void;
}

// Storage interface for rate limit state
interface ThrottlerStorage {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, expiryMs?: number): Promise<void>;
  incr(key: string): Promise<number>;
  expire(key: string, ms: number): Promise<void>;
  del(key: string): Promise<void>;
}

// In-memory storage implementation
class InMemoryStorage implements ThrottlerStorage {
  private data: Map<string, { value: string; expiresAt?: number }> = new Map();

  async get(key: string): Promise<string | null> {
    const entry = this.data.get(key);
    if (!entry) return null;
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.data.delete(key);
      return null;
    }
    return entry.value;
  }

  async set(key: string, value: string, expiryMs?: number): Promise<void> {
    this.data.set(key, {
      value,
      expiresAt: expiryMs ? Date.now() + expiryMs : undefined,
    });
  }

  async incr(key: string): Promise<number> {
    const current = await this.get(key);
    const newValue = (parseInt(current || '0', 10) + 1).toString();
    const entry = this.data.get(key);
    await this.set(key, newValue, entry?.expiresAt ? entry.expiresAt - Date.now() : undefined);
    return parseInt(newValue, 10);
  }

  async expire(key: string, ms: number): Promise<void> {
    const entry = this.data.get(key);
    if (entry) {
      entry.expiresAt = Date.now() + ms;
    }
  }

  async del(key: string): Promise<void> {
    this.data.delete(key);
  }
}

class ConsoleLogger implements Logger {
  info(m: string, meta?: Record<string, unknown>) { console.log(JSON.stringify({ level: 'info', message: m, ...meta })); }
  warn(m: string, meta?: Record<string, unknown>) { console.warn(JSON.stringify({ level: 'warn', message: m, ...meta })); }
  error(m: string, meta?: Record<string, unknown>) { console.error(JSON.stringify({ level: 'error', message: m, ...meta })); }
  debug(m: string, meta?: Record<string, unknown>) { console.debug(JSON.stringify({ level: 'debug', message: m, ...meta })); }
}

/**
 * Switchboard Gateway Throttler
 * Comprehensive rate limiting and quota enforcement
 */
export class GatewayThrottler extends EventEmitter {
  private config: Required<GatewayThrottlerConfig>;
  private apiKeys: Map<string, ApiKey> = new Map();
  private buckets: Map<string, TokenBucket> = new Map();
  private slidingWindows: Map<string, WindowEntry[]> = new Map();
  private concurrentRequests: Map<string, number> = new Map();

  constructor(config: GatewayThrottlerConfig = {}) {
    super();
    this.config = {
      algorithm: config.algorithm || 'token_bucket',
      tierConfigs: config.tierConfigs || DEFAULT_TIER_CONFIGS,
      defaultTier: config.defaultTier || 'free',
      enableQuotas: config.enableQuotas ?? true,
      quotaResetDay: config.quotaResetDay || 1,
      bypassTokens: config.bypassTokens || [],
      logger: config.logger || new ConsoleLogger(),
      metrics: config.metrics || { increment: () => {}, histogram: () => {}, gauge: () => {} },
      storage: config.storage || new InMemoryStorage(),
    };
  }

  /**
   * Register an API key
   */
  registerApiKey(apiKey: ApiKey): void {
    this.apiKeys.set(apiKey.id, apiKey);
    this.config.logger.info('API key registered', { keyId: apiKey.id, tier: apiKey.tier });
  }

  /**
   * Validate and authenticate API key
   */
  async authenticateApiKey(rawKey: string): Promise<ApiKey | null> {
    const hashedKey = this.hashApiKey(rawKey);

    for (const [id, apiKey] of this.apiKeys) {
      if (apiKey.key === hashedKey) {
        if (!apiKey.isActive) {
          this.config.logger.warn('Inactive API key used', { keyId: id });
          return null;
        }

        if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
          this.config.logger.warn('Expired API key used', { keyId: id });
          return null;
        }

        // Update last used
        apiKey.lastUsedAt = new Date();
        return apiKey;
      }
    }

    return null;
  }

  /**
   * Check throttle for a request
   */
  async checkThrottle(context: ThrottleContext, rawApiKey?: string): Promise<ThrottleDecision> {
    const startTime = performance.now();

    // Check bypass tokens
    if (rawApiKey && this.config.bypassTokens.includes(rawApiKey)) {
      return this.buildAllowedDecision('unlimited', true);
    }

    // Authenticate API key
    let apiKey: ApiKey | null = null;
    let tier: RateLimitTier = this.config.defaultTier;

    if (rawApiKey) {
      apiKey = await this.authenticateApiKey(rawApiKey);
      if (apiKey) {
        tier = apiKey.tier;

        // Check IP allowlist
        if (apiKey.allowedIPs?.length && !apiKey.allowedIPs.includes(context.ipAddress)) {
          this.config.metrics.increment('gateway.throttle.blocked', { reason: 'ip_not_allowed' });
          return this.buildBlockedDecision(tier, 'IP_NOT_ALLOWED', 'IP address not in allowlist');
        }

        // Check origin allowlist
        if (apiKey.allowedOrigins?.length && context.origin && !apiKey.allowedOrigins.includes(context.origin)) {
          this.config.metrics.increment('gateway.throttle.blocked', { reason: 'origin_not_allowed' });
          return this.buildBlockedDecision(tier, 'ORIGIN_NOT_ALLOWED', 'Origin not in allowlist');
        }
      } else {
        this.config.metrics.increment('gateway.throttle.blocked', { reason: 'invalid_api_key' });
        return this.buildBlockedDecision(tier, 'INVALID_API_KEY', 'Invalid or expired API key');
      }
    }

    // Get tier configuration
    const tierConfig = this.getTierConfig(apiKey);

    // Check concurrent requests
    const concurrentKey = this.getConcurrentKey(context, apiKey);
    const currentConcurrent = this.concurrentRequests.get(concurrentKey) || 0;

    if (tierConfig.concurrentRequests > 0 && currentConcurrent >= tierConfig.concurrentRequests) {
      this.config.metrics.increment('gateway.throttle.blocked', { reason: 'concurrent_limit', tier });
      return this.buildBlockedDecision(tier, 'CONCURRENT_LIMIT', 'Too many concurrent requests', 1000);
    }

    // Check rate limit
    const rateLimitResult = await this.checkRateLimit(context, apiKey, tierConfig);
    if (!rateLimitResult.allowed) {
      this.config.metrics.increment('gateway.throttle.blocked', { reason: 'rate_limit', tier });
      return {
        allowed: false,
        rateLimit: rateLimitResult,
        authenticated: !!apiKey,
        tier,
        headers: this.buildRateLimitHeaders(rateLimitResult),
        blocked: {
          reason: rateLimitResult.reason || 'Rate limit exceeded',
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfterMs: rateLimitResult.retryAfterMs,
        },
      };
    }

    // Check quota
    let quotaResult: QuotaCheckResult | undefined;
    if (this.config.enableQuotas && tierConfig.quotaLimit) {
      quotaResult = await this.checkQuota(context, apiKey, tierConfig);
      if (!quotaResult.allowed) {
        this.config.metrics.increment('gateway.throttle.blocked', { reason: 'quota', tier });
        return {
          allowed: false,
          rateLimit: rateLimitResult,
          quota: quotaResult,
          authenticated: !!apiKey,
          tier,
          headers: this.buildRateLimitHeaders(rateLimitResult, quotaResult),
          blocked: {
            reason: 'Monthly quota exceeded',
            code: 'QUOTA_EXCEEDED',
          },
        };
      }
    }

    // Increment concurrent request counter
    this.concurrentRequests.set(concurrentKey, currentConcurrent + 1);

    // Record metrics
    const duration = performance.now() - startTime;
    this.config.metrics.increment('gateway.throttle.allowed', { tier });
    this.config.metrics.histogram('gateway.throttle.check_duration', duration);

    return {
      allowed: true,
      rateLimit: rateLimitResult,
      quota: quotaResult,
      authenticated: !!apiKey,
      tier,
      headers: this.buildRateLimitHeaders(rateLimitResult, quotaResult),
    };
  }

  /**
   * Release concurrent request slot
   */
  releaseRequest(context: ThrottleContext, apiKey?: ApiKey): void {
    const concurrentKey = this.getConcurrentKey(context, apiKey);
    const current = this.concurrentRequests.get(concurrentKey) || 0;
    if (current > 0) {
      this.concurrentRequests.set(concurrentKey, current - 1);
    }
  }

  /**
   * Check rate limit based on algorithm
   */
  private async checkRateLimit(
    context: ThrottleContext,
    apiKey: ApiKey | null,
    tierConfig: TierConfig
  ): Promise<RateLimitResult> {
    switch (this.config.algorithm) {
      case 'token_bucket':
        return this.checkTokenBucket(context, apiKey, tierConfig);
      case 'sliding_window':
        return this.checkSlidingWindow(context, apiKey, tierConfig);
      case 'fixed_window':
        return this.checkFixedWindow(context, apiKey, tierConfig);
      case 'leaky_bucket':
        return this.checkLeakyBucket(context, apiKey, tierConfig);
      default:
        return this.checkTokenBucket(context, apiKey, tierConfig);
    }
  }

  /**
   * Token bucket algorithm
   */
  private async checkTokenBucket(
    context: ThrottleContext,
    apiKey: ApiKey | null,
    tierConfig: TierConfig
  ): Promise<RateLimitResult> {
    const key = this.getRateLimitKey(context, apiKey);
    const now = Date.now();

    let bucket = this.buckets.get(key);
    if (!bucket) {
      bucket = {
        tokens: tierConfig.burstLimit || tierConfig.requestsPerSecond,
        lastRefill: now,
        capacity: tierConfig.burstLimit || tierConfig.requestsPerSecond,
        refillRate: tierConfig.requestsPerSecond,
      };
      this.buckets.set(key, bucket);
    }

    // Refill tokens
    const elapsed = (now - bucket.lastRefill) / 1000;
    bucket.tokens = Math.min(bucket.capacity, bucket.tokens + elapsed * bucket.refillRate);
    bucket.lastRefill = now;

    // Check if we have tokens
    const cost = context.cost || 1;
    if (bucket.tokens >= cost) {
      bucket.tokens -= cost;
      return {
        allowed: true,
        remaining: Math.floor(bucket.tokens),
        limit: bucket.capacity,
        resetAt: new Date(now + ((bucket.capacity - bucket.tokens) / bucket.refillRate) * 1000),
        tier: tierConfig.tier,
      };
    }

    // Calculate retry after
    const tokensNeeded = cost - bucket.tokens;
    const retryAfterMs = Math.ceil((tokensNeeded / bucket.refillRate) * 1000);

    return {
      allowed: false,
      remaining: 0,
      limit: bucket.capacity,
      resetAt: new Date(now + retryAfterMs),
      retryAfterMs,
      tier: tierConfig.tier,
      reason: 'Token bucket exhausted',
    };
  }

  /**
   * Sliding window algorithm
   */
  private async checkSlidingWindow(
    context: ThrottleContext,
    apiKey: ApiKey | null,
    tierConfig: TierConfig
  ): Promise<RateLimitResult> {
    const key = this.getRateLimitKey(context, apiKey);
    const now = Date.now();
    const windowMs = 60000; // 1 minute window

    let window = this.slidingWindows.get(key) || [];

    // Remove old entries
    window = window.filter((entry) => now - entry.timestamp < windowMs);

    // Count requests in window
    const count = window.reduce((sum, entry) => sum + entry.count, 0);

    if (count >= tierConfig.requestsPerMinute) {
      const oldestEntry = window[0];
      const retryAfterMs = oldestEntry ? windowMs - (now - oldestEntry.timestamp) : windowMs;

      return {
        allowed: false,
        remaining: 0,
        limit: tierConfig.requestsPerMinute,
        resetAt: new Date(now + retryAfterMs),
        retryAfterMs,
        tier: tierConfig.tier,
        reason: 'Sliding window limit exceeded',
      };
    }

    // Add new entry
    window.push({ count: context.cost || 1, timestamp: now });
    this.slidingWindows.set(key, window);

    return {
      allowed: true,
      remaining: tierConfig.requestsPerMinute - count - 1,
      limit: tierConfig.requestsPerMinute,
      resetAt: new Date(now + windowMs),
      tier: tierConfig.tier,
    };
  }

  /**
   * Fixed window algorithm
   */
  private async checkFixedWindow(
    context: ThrottleContext,
    apiKey: ApiKey | null,
    tierConfig: TierConfig
  ): Promise<RateLimitResult> {
    const key = this.getRateLimitKey(context, apiKey);
    const windowMs = 60000;
    const windowStart = Math.floor(Date.now() / windowMs) * windowMs;
    const windowKey = `${key}:${windowStart}`;

    const countStr = await this.config.storage.get(windowKey);
    const count = parseInt(countStr || '0', 10);

    if (count >= tierConfig.requestsPerMinute) {
      const resetAt = new Date(windowStart + windowMs);
      const retryAfterMs = resetAt.getTime() - Date.now();

      return {
        allowed: false,
        remaining: 0,
        limit: tierConfig.requestsPerMinute,
        resetAt,
        retryAfterMs,
        tier: tierConfig.tier,
        reason: 'Fixed window limit exceeded',
      };
    }

    await this.config.storage.set(windowKey, (count + 1).toString(), windowMs);

    return {
      allowed: true,
      remaining: tierConfig.requestsPerMinute - count - 1,
      limit: tierConfig.requestsPerMinute,
      resetAt: new Date(windowStart + windowMs),
      tier: tierConfig.tier,
    };
  }

  /**
   * Leaky bucket algorithm
   */
  private async checkLeakyBucket(
    context: ThrottleContext,
    apiKey: ApiKey | null,
    tierConfig: TierConfig
  ): Promise<RateLimitResult> {
    // Similar to token bucket but requests leak at constant rate
    return this.checkTokenBucket(context, apiKey, tierConfig);
  }

  /**
   * Check quota usage
   */
  private async checkQuota(
    context: ThrottleContext,
    apiKey: ApiKey | null,
    tierConfig: TierConfig
  ): Promise<QuotaCheckResult> {
    if (!tierConfig.quotaLimit) {
      return {
        allowed: true,
        used: 0,
        limit: 0,
        remaining: 0,
        resetAt: new Date(),
        percentage: 0,
      };
    }

    const quotaKey = this.getQuotaKey(context, apiKey);
    const usedStr = await this.config.storage.get(quotaKey);
    const used = parseInt(usedStr || '0', 10);

    // Calculate reset date (first of next month)
    const now = new Date();
    const resetAt = new Date(now.getFullYear(), now.getMonth() + 1, this.config.quotaResetDay);

    const cost = context.cost || 1;
    if (used + cost > tierConfig.quotaLimit) {
      return {
        allowed: false,
        used,
        limit: tierConfig.quotaLimit,
        remaining: Math.max(0, tierConfig.quotaLimit - used),
        resetAt,
        percentage: (used / tierConfig.quotaLimit) * 100,
      };
    }

    // Increment usage
    await this.config.storage.set(quotaKey, (used + cost).toString(), resetAt.getTime() - Date.now());

    // Update API key if present
    if (apiKey) {
      apiKey.quotaUsed = used + cost;
    }

    return {
      allowed: true,
      used: used + cost,
      limit: tierConfig.quotaLimit,
      remaining: tierConfig.quotaLimit - used - cost,
      resetAt,
      percentage: ((used + cost) / tierConfig.quotaLimit) * 100,
    };
  }

  /**
   * Get tier configuration with overrides
   */
  private getTierConfig(apiKey: ApiKey | null): TierConfig {
    const baseConfig = this.config.tierConfigs[apiKey?.tier || this.config.defaultTier];

    if (!apiKey?.rateOverrides) {
      return baseConfig;
    }

    return {
      ...baseConfig,
      ...apiKey.rateOverrides,
    };
  }

  /**
   * Build allowed decision
   */
  private buildAllowedDecision(tier: RateLimitTier, authenticated: boolean): ThrottleDecision {
    return {
      allowed: true,
      rateLimit: {
        allowed: true,
        remaining: Infinity,
        limit: 0,
        resetAt: new Date(),
        tier,
      },
      authenticated,
      tier,
      headers: {},
    };
  }

  /**
   * Build blocked decision
   */
  private buildBlockedDecision(
    tier: RateLimitTier,
    code: string,
    reason: string,
    retryAfterMs?: number
  ): ThrottleDecision {
    return {
      allowed: false,
      rateLimit: {
        allowed: false,
        remaining: 0,
        limit: 0,
        resetAt: new Date(),
        tier,
        reason,
        retryAfterMs,
      },
      authenticated: false,
      tier,
      headers: retryAfterMs ? { 'Retry-After': String(Math.ceil(retryAfterMs / 1000)) } : {},
      blocked: { reason, code, retryAfterMs },
    };
  }

  /**
   * Build rate limit headers
   */
  private buildRateLimitHeaders(
    rateLimit: RateLimitResult,
    quota?: QuotaCheckResult
  ): Record<string, string> {
    const headers: Record<string, string> = {
      'X-RateLimit-Limit': String(rateLimit.limit),
      'X-RateLimit-Remaining': String(rateLimit.remaining),
      'X-RateLimit-Reset': String(Math.floor(rateLimit.resetAt.getTime() / 1000)),
    };

    if (rateLimit.retryAfterMs) {
      headers['Retry-After'] = String(Math.ceil(rateLimit.retryAfterMs / 1000));
    }

    if (quota) {
      headers['X-Quota-Limit'] = String(quota.limit);
      headers['X-Quota-Remaining'] = String(quota.remaining);
      headers['X-Quota-Reset'] = String(Math.floor(quota.resetAt.getTime() / 1000));
    }

    return headers;
  }

  /**
   * Get rate limit key
   */
  private getRateLimitKey(context: ThrottleContext, apiKey: ApiKey | null): string {
    if (apiKey) {
      return `rate:${apiKey.id}`;
    }
    return `rate:ip:${context.ipAddress}`;
  }

  /**
   * Get quota key
   */
  private getQuotaKey(context: ThrottleContext, apiKey: ApiKey | null): string {
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    if (apiKey) {
      return `quota:${apiKey.id}:${month}`;
    }
    return `quota:ip:${context.ipAddress}:${month}`;
  }

  /**
   * Get concurrent request key
   */
  private getConcurrentKey(context: ThrottleContext, apiKey: ApiKey | null): string {
    if (apiKey) {
      return `concurrent:${apiKey.id}`;
    }
    return `concurrent:ip:${context.ipAddress}`;
  }

  /**
   * Hash API key
   */
  private hashApiKey(rawKey: string): string {
    return createHash('sha256').update(rawKey).digest('hex');
  }

  /**
   * Generate new API key
   */
  generateApiKey(
    data: Omit<ApiKey, 'id' | 'key' | 'quotaUsed' | 'createdAt' | 'updatedAt'>
  ): { apiKey: ApiKey; rawKey: string } {
    const rawKey = `sk_${crypto.randomUUID().replace(/-/g, '')}`;
    const hashedKey = this.hashApiKey(rawKey);

    const apiKey: ApiKey = {
      ...data,
      id: crypto.randomUUID(),
      key: hashedKey,
      quotaUsed: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.registerApiKey(apiKey);

    return { apiKey, rawKey };
  }

  /**
   * Revoke API key
   */
  revokeApiKey(keyId: string): boolean {
    const apiKey = this.apiKeys.get(keyId);
    if (apiKey) {
      apiKey.isActive = false;
      apiKey.updatedAt = new Date();
      this.config.logger.info('API key revoked', { keyId });
      return true;
    }
    return false;
  }

  /**
   * Get usage statistics
   */
  getUsageStats(keyId: string): {
    quotaUsed: number;
    quotaLimit: number;
    tier: RateLimitTier;
    lastUsedAt?: Date;
  } | null {
    const apiKey = this.apiKeys.get(keyId);
    if (!apiKey) return null;

    const tierConfig = this.getTierConfig(apiKey);

    return {
      quotaUsed: apiKey.quotaUsed,
      quotaLimit: tierConfig.quotaLimit || 0,
      tier: apiKey.tier,
      lastUsedAt: apiKey.lastUsedAt,
    };
  }
}

// Export singleton
export const gatewayThrottler = new GatewayThrottler();
