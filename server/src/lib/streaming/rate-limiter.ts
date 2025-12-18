
// A placeholder for a real metrics client
interface MetricsClient {
  increment(metric: string, tags?: Record<string, string>): void;
  gauge(metric: string, value: number, tags?: Record<string, string>): void;
}

interface TokenBucket {
  tokens: number;
  lastRefill: number;
}

interface AdaptiveRateLimiterOptions {
  initialTokens?: number;
  maxTokens?: number;
  refillRate?: number; // tokens per second
  clientScope?: boolean;
  metricsClient?: MetricsClient;
  adaptive?: {
    queueThreshold: number;
    refillRateAdjustment: number; // e.g., 0.9 to decrease by 10%
  };
}

export class AdaptiveRateLimiter {
  private globalTokens: number;
  private readonly maxTokens: number;
  private refillRate: number; // Can now be modified
  private readonly initialRefillRate: number;
  private globalLastRefill: number;

  private readonly clientTokens: Map<string, TokenBucket> = new Map();
  private readonly clientScope: boolean;
  private readonly metricsClient?: MetricsClient;
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
    this.metricsClient = options.metricsClient;
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
        this.metricsClient?.increment('rate_limiter.queued', { client: id ?? 'global' });
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

    if (hasToken) {
      this.metricsClient?.increment('rate_limiter.acquired', { client: id ?? 'global' });
      return true;
    } else {
      this.metricsClient?.increment('rate_limiter.rejected', { client: id ?? 'global' });
      return false;
    }
  }

  public tryAcquireSync(id?: string): boolean {
      return this.tryAcquire(id);
  }

  private processQueue(): void {
    if (this.requestQueue.length === 0) {
      return;
    }

    const { id, resolve } = this.requestQueue[0];
    if (this.tryAcquire(id)) {
      this.requestQueue.shift();
      resolve();
    }
    this.adapt();
  }

  private adapt(): void {
    if (!this.adaptiveConfig) return;

    if (this.requestQueue.length > this.adaptiveConfig.queueThreshold) {
      this.refillRate = Math.max(1, this.refillRate * this.adaptiveConfig.refillRateAdjustment);
    } else {
      // Gradually return to the initial rate.
      // The formula `2 - adjustment` provides a gradual increase.
      // E.g., if adjustment is 0.9, this becomes 1.1, increasing the rate by 10%.
      this.refillRate = Math.min(this.initialRefillRate, this.refillRate * (2 - this.adaptiveConfig.refillRateAdjustment));
    }
    this.metricsClient?.gauge('rate_limiter.refill_rate', this.refillRate);
  }

  public destroy(): void {
    clearInterval(this.queueProcessorInterval);
    clearInterval(this.cleanupInterval);
  }
}
