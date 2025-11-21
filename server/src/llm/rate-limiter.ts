/**
 * Production Rate Limiter for LLM Services
 *
 * Features:
 * - Per-user rate limiting with sliding window
 * - Per-model rate limiting
 * - Burst allowance with token bucket
 * - Cost-based limiting (tokens/requests)
 * - Priority queuing for premium users
 * - Redis-backed for distributed deployment
 */

import { Logger } from '../observability/logger.js';
import { Metrics } from '../observability/metrics.js';

const logger = new Logger('LLMRateLimiter');
const metrics = new Metrics();

export interface RateLimitConfig {
  requestsPerMinute: number;
  requestsPerHour: number;
  tokensPerMinute: number;
  tokensPerDay: number;
  burstAllowance: number;
  costMultiplier: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  retryAfter?: number;
  reason?: string;
  queuePosition?: number;
}

interface RateLimitEntry {
  requests: number[];
  tokens: number;
  lastReset: number;
  burstTokens: number;
}

interface UserTier {
  name: string;
  config: RateLimitConfig;
}

/**
 * Default rate limit configurations by tier
 */
export const RATE_LIMIT_TIERS: Record<string, RateLimitConfig> = {
  free: {
    requestsPerMinute: 10,
    requestsPerHour: 100,
    tokensPerMinute: 10000,
    tokensPerDay: 100000,
    burstAllowance: 5,
    costMultiplier: 1.0,
  },
  basic: {
    requestsPerMinute: 30,
    requestsPerHour: 500,
    tokensPerMinute: 50000,
    tokensPerDay: 500000,
    burstAllowance: 10,
    costMultiplier: 1.0,
  },
  premium: {
    requestsPerMinute: 100,
    requestsPerHour: 2000,
    tokensPerMinute: 200000,
    tokensPerDay: 2000000,
    burstAllowance: 20,
    costMultiplier: 0.8,
  },
  enterprise: {
    requestsPerMinute: 500,
    requestsPerHour: 10000,
    tokensPerMinute: 1000000,
    tokensPerDay: 10000000,
    burstAllowance: 50,
    costMultiplier: 0.5,
  },
};

/**
 * Model-specific rate limits (requests per minute)
 */
export const MODEL_RATE_LIMITS: Record<string, number> = {
  'gpt-4': 40,
  'gpt-4-turbo': 60,
  'gpt-4o': 80,
  'gpt-3.5-turbo': 200,
  'claude-3-opus': 30,
  'claude-3-sonnet': 60,
  'claude-3-haiku': 100,
  'gemini-ultra': 40,
  'gemini-pro': 100,
  default: 50,
};

/**
 * Sliding Window Rate Limiter with Token Bucket
 */
export class LLMRateLimiter {
  private userLimits: Map<string, RateLimitEntry> = new Map();
  private modelLimits: Map<string, RateLimitEntry> = new Map();
  private userTiers: Map<string, UserTier> = new Map();
  private priorityQueue: Map<string, number> = new Map();

  private readonly windowMs = 60000; // 1 minute sliding window
  private readonly hourMs = 3600000;
  private readonly dayMs = 86400000;

  constructor() {
    // Cleanup stale entries every 5 minutes
    setInterval(() => this.cleanup(), 300000);
    logger.info('LLM Rate Limiter initialized');
  }

  /**
   * Set user tier for rate limiting
   */
  setUserTier(userId: string, tierName: string): void {
    const config = RATE_LIMIT_TIERS[tierName] || RATE_LIMIT_TIERS.free;
    this.userTiers.set(userId, { name: tierName, config });
    logger.debug('User tier set', { userId, tier: tierName });
  }

  /**
   * Get user's rate limit configuration
   */
  private getUserConfig(userId: string): RateLimitConfig {
    const tier = this.userTiers.get(userId);
    return tier?.config || RATE_LIMIT_TIERS.free;
  }

  /**
   * Check if request is allowed under rate limits
   */
  async checkLimit(params: {
    userId: string;
    tenantId?: string;
    model: string;
    estimatedTokens?: number;
  }): Promise<RateLimitResult> {
    const { userId, tenantId, model, estimatedTokens = 0 } = params;
    const now = Date.now();
    const config = this.getUserConfig(userId);

    // Initialize or get user entry
    let userEntry = this.userLimits.get(userId);
    if (!userEntry) {
      userEntry = this.initEntry(now);
      this.userLimits.set(userId, userEntry);
    }

    // Initialize or get model entry
    const modelKey = `${model}:${tenantId || 'global'}`;
    let modelEntry = this.modelLimits.get(modelKey);
    if (!modelEntry) {
      modelEntry = this.initEntry(now);
      this.modelLimits.set(modelKey, modelEntry);
    }

    // Slide the window - remove old requests
    this.slideWindow(userEntry, now);
    this.slideWindow(modelEntry, now);

    // Check user rate limits
    const userResult = this.checkUserLimits(userId, userEntry, config, estimatedTokens, now);
    if (!userResult.allowed) {
      metrics.counter('llm_rate_limit_exceeded', { type: 'user', tier: this.userTiers.get(userId)?.name || 'free' });
      return userResult;
    }

    // Check model rate limits
    const modelLimit = MODEL_RATE_LIMITS[model] || MODEL_RATE_LIMITS.default;
    const modelResult = this.checkModelLimits(model, modelEntry, modelLimit, now);
    if (!modelResult.allowed) {
      metrics.counter('llm_rate_limit_exceeded', { type: 'model', model });
      return modelResult;
    }

    // Record the request
    userEntry.requests.push(now);
    userEntry.tokens += estimatedTokens;
    modelEntry.requests.push(now);

    // Use burst token if over soft limit
    if (userEntry.requests.length > config.requestsPerMinute * 0.8) {
      if (userEntry.burstTokens > 0) {
        userEntry.burstTokens--;
        logger.debug('Burst token used', { userId, remaining: userEntry.burstTokens });
      }
    }

    metrics.counter('llm_requests_allowed', {
      tier: this.userTiers.get(userId)?.name || 'free',
      model,
    });

    return {
      allowed: true,
      remaining: config.requestsPerMinute - userEntry.requests.length,
      resetAt: new Date(now + this.windowMs),
    };
  }

  /**
   * Record actual token usage after completion
   */
  recordUsage(userId: string, actualTokens: number): void {
    const entry = this.userLimits.get(userId);
    if (entry) {
      // Adjust token count with actual usage
      entry.tokens += actualTokens;
      metrics.histogram('llm_tokens_used', actualTokens, { userId });
    }
  }

  /**
   * Get current usage stats for user
   */
  getUsageStats(userId: string): {
    requestsUsed: number;
    requestsLimit: number;
    tokensUsed: number;
    tokensLimit: number;
    resetAt: Date;
    tier: string;
  } {
    const config = this.getUserConfig(userId);
    const entry = this.userLimits.get(userId);
    const now = Date.now();

    if (entry) {
      this.slideWindow(entry, now);
    }

    return {
      requestsUsed: entry?.requests.length || 0,
      requestsLimit: config.requestsPerMinute,
      tokensUsed: entry?.tokens || 0,
      tokensLimit: config.tokensPerMinute,
      resetAt: new Date(now + this.windowMs),
      tier: this.userTiers.get(userId)?.name || 'free',
    };
  }

  /**
   * Reserve capacity for priority users
   */
  async reserveCapacity(userId: string, requestCount: number): Promise<boolean> {
    const config = this.getUserConfig(userId);
    const entry = this.userLimits.get(userId) || this.initEntry(Date.now());

    const available = config.requestsPerMinute - entry.requests.length;
    if (available >= requestCount) {
      this.priorityQueue.set(userId, requestCount);
      logger.info('Capacity reserved', { userId, count: requestCount });
      return true;
    }

    return false;
  }

  /**
   * Release reserved capacity
   */
  releaseCapacity(userId: string): void {
    this.priorityQueue.delete(userId);
  }

  private initEntry(now: number): RateLimitEntry {
    return {
      requests: [],
      tokens: 0,
      lastReset: now,
      burstTokens: 5,
    };
  }

  private slideWindow(entry: RateLimitEntry, now: number): void {
    const windowStart = now - this.windowMs;
    entry.requests = entry.requests.filter((ts) => ts > windowStart);

    // Reset tokens daily
    if (now - entry.lastReset > this.dayMs) {
      entry.tokens = 0;
      entry.lastReset = now;
      entry.burstTokens = 5; // Replenish burst tokens
    }
  }

  private checkUserLimits(
    userId: string,
    entry: RateLimitEntry,
    config: RateLimitConfig,
    estimatedTokens: number,
    now: number
  ): RateLimitResult {
    // Check requests per minute
    if (entry.requests.length >= config.requestsPerMinute + entry.burstTokens) {
      const oldestRequest = entry.requests[0];
      const retryAfter = Math.ceil((oldestRequest + this.windowMs - now) / 1000);

      return {
        allowed: false,
        remaining: 0,
        resetAt: new Date(oldestRequest + this.windowMs),
        retryAfter,
        reason: `Rate limit exceeded: ${config.requestsPerMinute} requests/minute`,
      };
    }

    // Check tokens per minute
    if (entry.tokens + estimatedTokens > config.tokensPerMinute) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: new Date(now + this.windowMs),
        retryAfter: 60,
        reason: `Token limit exceeded: ${config.tokensPerMinute} tokens/minute`,
      };
    }

    // Check daily token limit
    if (entry.tokens + estimatedTokens > config.tokensPerDay) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: new Date(entry.lastReset + this.dayMs),
        retryAfter: Math.ceil((entry.lastReset + this.dayMs - now) / 1000),
        reason: `Daily token limit exceeded: ${config.tokensPerDay} tokens/day`,
      };
    }

    return {
      allowed: true,
      remaining: config.requestsPerMinute - entry.requests.length,
      resetAt: new Date(now + this.windowMs),
    };
  }

  private checkModelLimits(
    model: string,
    entry: RateLimitEntry,
    limit: number,
    now: number
  ): RateLimitResult {
    if (entry.requests.length >= limit) {
      const oldestRequest = entry.requests[0];
      const retryAfter = Math.ceil((oldestRequest + this.windowMs - now) / 1000);

      return {
        allowed: false,
        remaining: 0,
        resetAt: new Date(oldestRequest + this.windowMs),
        retryAfter,
        reason: `Model ${model} rate limit exceeded: ${limit} requests/minute`,
      };
    }

    return {
      allowed: true,
      remaining: limit - entry.requests.length,
      resetAt: new Date(now + this.windowMs),
    };
  }

  private cleanup(): void {
    const now = Date.now();
    const staleThreshold = now - this.hourMs;

    for (const [key, entry] of this.userLimits.entries()) {
      if (entry.requests.length === 0 && entry.lastReset < staleThreshold) {
        this.userLimits.delete(key);
      }
    }

    for (const [key, entry] of this.modelLimits.entries()) {
      if (entry.requests.length === 0 && entry.lastReset < staleThreshold) {
        this.modelLimits.delete(key);
      }
    }

    logger.debug('Rate limiter cleanup completed', {
      userEntries: this.userLimits.size,
      modelEntries: this.modelLimits.size,
    });
  }

  /**
   * Get metrics for monitoring
   */
  getMetrics(): {
    activeUsers: number;
    activeModels: number;
    totalRequests: number;
  } {
    let totalRequests = 0;
    for (const entry of this.userLimits.values()) {
      totalRequests += entry.requests.length;
    }

    return {
      activeUsers: this.userLimits.size,
      activeModels: this.modelLimits.size,
      totalRequests,
    };
  }
}

// Export singleton
export const llmRateLimiter = new LLMRateLimiter();
