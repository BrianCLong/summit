// Copied and adapted from server/src/lib/streaming/rate-limiter.ts to avoid cross-package build issues

export interface TokenBucket {
  tokens: number;
  lastRefill: number;
}

export interface AdaptiveRateLimiterOptions {
  initialTokens?: number;
  maxTokens?: number;
  refillRate?: number; // tokens per second
  clientScope?: boolean;
  adaptive?: {
    queueThreshold: number;
    refillRateAdjustment: number;
  };
}

export class AdaptiveRateLimiter {
  private globalTokens: number;
  private readonly maxTokens: number;
  private refillRate: number;
  private readonly initialRefillRate: number;
  private globalLastRefill: number;

  private readonly clientTokens: Map<string, TokenBucket> = new Map();
  private readonly clientScope: boolean;
  private readonly adaptiveConfig?: AdaptiveRateLimiterOptions['adaptive'];

  private requestQueue: Array<{ id?: string; resolve: () => void }> = [];
  private queueProcessorInterval: NodeJS.Timeout;
  private cleanupInterval: NodeJS.Timeout;

  constructor(options: AdaptiveRateLimiterOptions = {}) {
    this.maxTokens = options.maxTokens ?? 100;
    this.globalTokens = options.initialTokens ?? this.maxTokens;
    this.refillRate = options.refillRate ?? 10;
    this.initialRefillRate = this.refillRate;
    this.globalLastRefill = Date.now();
    this.clientScope = options.clientScope ?? false;
    this.adaptiveConfig = options.adaptive;

    this.queueProcessorInterval = setInterval(() => this.processQueue(), 100);

    // Cleanup stale client token buckets every 5 minutes
    this.cleanupInterval = setInterval(() => {
        const now = Date.now();
        const staleThreshold = 5 * 60 * 1000;
        for (const [key, bucket] of this.clientTokens.entries()) {
            if (now - bucket.lastRefill > staleThreshold) {
                this.clientTokens.delete(key);
            }
        }
    }, 5 * 60 * 1000);
  }

  private refill(id?: string): void {
    const now = Date.now();

    if (this.clientScope && id) {
      const bucket = this.clientTokens.get(id) ?? { tokens: this.maxTokens, lastRefill: now };
      const elapsedTime = (now - bucket.lastRefill) / 1000;
      const tokensToAdd = elapsedTime * this.refillRate;
      bucket.tokens = Math.min(this.maxTokens, bucket.tokens + tokensToAdd);
      bucket.lastRefill = now;
      this.clientTokens.set(id, bucket);
    } else {
      const elapsedTime = (now - this.globalLastRefill) / 1000;
      const tokensToAdd = elapsedTime * this.refillRate;
      this.globalTokens = Math.min(this.maxTokens, this.globalTokens + tokensToAdd);
      this.globalLastRefill = now;
    }
  }

  public async acquire(id?: string): Promise<void> {
    return new Promise((resolve) => {
      if (this.tryAcquire(id)) {
        resolve();
      } else {
        this.requestQueue.push({ id, resolve });
      }
    });
  }

  private tryAcquire(id?: string): boolean {
    this.refill(id);

    let hasToken = false;
    if (this.clientScope && id) {
        const bucket = this.clientTokens.get(id);
        if (bucket && bucket.tokens >= 1) {
            bucket.tokens--;
            hasToken = true;
        }
    } else {
        if (this.globalTokens >= 1) {
            this.globalTokens--;
            hasToken = true;
        }
    }

    return hasToken;
  }

  public tryAcquireSync(id?: string): boolean {
      return this.tryAcquire(id);
  }

  private processQueue(): void {
    if (this.requestQueue.length === 0) {
      return;
    }

    const item = this.requestQueue[0];
    if (item && this.tryAcquire(item.id)) {
      this.requestQueue.shift();
      item.resolve();
    }
    this.adapt();
  }

  private adapt(): void {
    if (!this.adaptiveConfig) return;

    if (this.requestQueue.length > this.adaptiveConfig.queueThreshold) {
      this.refillRate = Math.max(1, this.refillRate * this.adaptiveConfig.refillRateAdjustment);
    } else {
      this.refillRate = Math.min(this.initialRefillRate, this.refillRate * (2 - this.adaptiveConfig.refillRateAdjustment));
    }
  }

  public destroy(): void {
    clearInterval(this.queueProcessorInterval);
    clearInterval(this.cleanupInterval);
  }
}
