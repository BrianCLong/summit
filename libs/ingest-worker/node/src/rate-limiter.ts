/**
 * Token Bucket Rate Limiter
 *
 * Implements token bucket algorithm with support for:
 * - Global rate limiting
 * - Per-tenant rate limiting
 * - Burst allowance via bucket capacity
 */

export interface TokenBucketConfig {
  /** Maximum tokens in bucket (burst capacity) */
  capacity: number;

  /** Tokens added per second */
  refillRate: number;

  /** Initial tokens (defaults to capacity) */
  initialTokens?: number;
}

export class TokenBucket {
  private tokens: number;
  private lastRefillTime: number;
  private readonly capacity: number;
  private readonly refillRate: number;

  constructor(config: TokenBucketConfig) {
    this.capacity = config.capacity;
    this.refillRate = config.refillRate;
    this.tokens = config.initialTokens ?? config.capacity;
    this.lastRefillTime = Date.now();
  }

  /**
   * Try to consume tokens from the bucket.
   * Returns true if tokens were consumed, false if not enough tokens.
   */
  tryConsume(tokens: number = 1): boolean {
    this.refill();

    if (this.tokens >= tokens) {
      this.tokens -= tokens;
      return true;
    }

    return false;
  }

  /**
   * Consume tokens, waiting if necessary.
   * Returns the time waited in milliseconds.
   */
  async consume(tokens: number = 1): Promise<number> {
    this.refill();

    if (this.tokens >= tokens) {
      this.tokens -= tokens;
      return 0;
    }

    // Calculate wait time
    const tokensNeeded = tokens - this.tokens;
    const waitMs = (tokensNeeded / this.refillRate) * 1000;

    await this.sleep(waitMs);
    this.refill();
    this.tokens -= tokens;

    return waitMs;
  }

  /**
   * Get time in ms until tokens are available.
   */
  getWaitTime(tokens: number = 1): number {
    this.refill();

    if (this.tokens >= tokens) {
      return 0;
    }

    const tokensNeeded = tokens - this.tokens;
    return Math.ceil((tokensNeeded / this.refillRate) * 1000);
  }

  /**
   * Get current token count.
   */
  getTokens(): number {
    this.refill();
    return this.tokens;
  }

  /**
   * Get bucket stats.
   */
  getStats(): { tokens: number; capacity: number; refillRate: number } {
    this.refill();
    return {
      tokens: Math.floor(this.tokens),
      capacity: this.capacity,
      refillRate: this.refillRate,
    };
  }

  /**
   * Reset bucket to full capacity.
   */
  reset(): void {
    this.tokens = this.capacity;
    this.lastRefillTime = Date.now();
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefillTime;
    const tokensToAdd = (elapsed / 1000) * this.refillRate;

    this.tokens = Math.min(this.tokens + tokensToAdd, this.capacity);
    this.lastRefillTime = now;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Multi-tenant rate limiter with per-tenant buckets.
 */
export class MultiTenantRateLimiter {
  private globalBucket: TokenBucket;
  private tenantBuckets: Map<string, TokenBucket> = new Map();
  private defaultTenantConfig: TokenBucketConfig;
  private tenantConfigs: Map<string, TokenBucketConfig> = new Map();

  constructor(
    globalConfig: TokenBucketConfig,
    defaultTenantConfig: TokenBucketConfig,
    tenantConfigs?: Record<string, TokenBucketConfig>
  ) {
    this.globalBucket = new TokenBucket(globalConfig);
    this.defaultTenantConfig = defaultTenantConfig;

    if (tenantConfigs) {
      for (const [tenantId, config] of Object.entries(tenantConfigs)) {
        this.tenantConfigs.set(tenantId, config);
      }
    }
  }

  /**
   * Try to acquire rate limit for a tenant.
   */
  tryAcquire(tenantId: string, tokens: number = 1): boolean {
    // Check global limit first
    if (!this.globalBucket.tryConsume(tokens)) {
      return false;
    }

    // Check tenant limit
    const tenantBucket = this.getOrCreateTenantBucket(tenantId);
    if (!tenantBucket.tryConsume(tokens)) {
      // Refund global tokens
      // Note: This is a simplification; in production you might want to handle this differently
      return false;
    }

    return true;
  }

  /**
   * Acquire rate limit, waiting if necessary.
   */
  async acquire(tenantId: string, tokens: number = 1): Promise<number> {
    // Wait for global limit
    const globalWait = await this.globalBucket.consume(tokens);

    // Wait for tenant limit
    const tenantBucket = this.getOrCreateTenantBucket(tenantId);
    const tenantWait = await tenantBucket.consume(tokens);

    return globalWait + tenantWait;
  }

  /**
   * Get wait time for rate limit.
   */
  getWaitTime(tenantId: string, tokens: number = 1): number {
    const globalWait = this.globalBucket.getWaitTime(tokens);
    const tenantBucket = this.getOrCreateTenantBucket(tenantId);
    const tenantWait = tenantBucket.getWaitTime(tokens);

    return Math.max(globalWait, tenantWait);
  }

  /**
   * Check if tenant can proceed without waiting.
   */
  canProceed(tenantId: string, tokens: number = 1): boolean {
    return this.getWaitTime(tenantId, tokens) === 0;
  }

  /**
   * Update tenant rate limit configuration.
   */
  setTenantConfig(tenantId: string, config: TokenBucketConfig): void {
    this.tenantConfigs.set(tenantId, config);
    // Reset tenant bucket with new config
    this.tenantBuckets.set(tenantId, new TokenBucket(config));
  }

  /**
   * Remove tenant rate limit (use default).
   */
  removeTenantConfig(tenantId: string): void {
    this.tenantConfigs.delete(tenantId);
    this.tenantBuckets.delete(tenantId);
  }

  /**
   * Get stats for all buckets.
   */
  getStats(): {
    global: ReturnType<TokenBucket["getStats"]>;
    tenants: Record<string, ReturnType<TokenBucket["getStats"]>>;
  } {
    const tenants: Record<string, ReturnType<TokenBucket["getStats"]>> = {};

    for (const [tenantId, bucket] of this.tenantBuckets) {
      tenants[tenantId] = bucket.getStats();
    }

    return {
      global: this.globalBucket.getStats(),
      tenants,
    };
  }

  /**
   * Reset all buckets.
   */
  reset(): void {
    this.globalBucket.reset();
    for (const bucket of this.tenantBuckets.values()) {
      bucket.reset();
    }
  }

  private getOrCreateTenantBucket(tenantId: string): TokenBucket {
    let bucket = this.tenantBuckets.get(tenantId);

    if (!bucket) {
      const config = this.tenantConfigs.get(tenantId) ?? this.defaultTenantConfig;
      bucket = new TokenBucket(config);
      this.tenantBuckets.set(tenantId, bucket);
    }

    return bucket;
  }
}

/**
 * Sliding window rate limiter for more accurate rate limiting.
 */
export class SlidingWindowRateLimiter {
  private windows: Map<string, number[]> = new Map();
  private readonly limit: number;
  private readonly windowMs: number;

  constructor(limit: number, windowMs: number = 1000) {
    this.limit = limit;
    this.windowMs = windowMs;
  }

  /**
   * Check if request is allowed and record it.
   */
  allow(key: string = "global"): boolean {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    // Get or create window
    let timestamps = this.windows.get(key);
    if (!timestamps) {
      timestamps = [];
      this.windows.set(key, timestamps);
    }

    // Remove expired timestamps
    const validTimestamps = timestamps.filter((ts) => ts > windowStart);

    // Check limit
    if (validTimestamps.length >= this.limit) {
      this.windows.set(key, validTimestamps);
      return false;
    }

    // Record this request
    validTimestamps.push(now);
    this.windows.set(key, validTimestamps);

    return true;
  }

  /**
   * Get remaining allowance.
   */
  getRemaining(key: string = "global"): number {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    const timestamps = this.windows.get(key) ?? [];
    const validCount = timestamps.filter((ts) => ts > windowStart).length;

    return Math.max(0, this.limit - validCount);
  }

  /**
   * Get time until next allowance in ms.
   */
  getResetTime(key: string = "global"): number {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    const timestamps = this.windows.get(key) ?? [];
    const validTimestamps = timestamps.filter((ts) => ts > windowStart);

    if (validTimestamps.length < this.limit) {
      return 0;
    }

    // Return time until oldest timestamp expires
    const oldest = Math.min(...validTimestamps);
    return Math.max(0, oldest + this.windowMs - now);
  }

  /**
   * Clear rate limit data for a key.
   */
  reset(key: string = "global"): void {
    this.windows.delete(key);
  }

  /**
   * Clear all rate limit data.
   */
  resetAll(): void {
    this.windows.clear();
  }
}
