
export interface ClientConfig {
  baseUrl?: string;
  timeout?: number;
  retries?: number;
  rateLimit?: {
    maxRequests: number;
    windowMs: number;
  };
  circuitBreaker?: {
    failureThreshold: number;
    resetTimeoutMs: number;
  };
}

export class RateLimiter {
  private tokens: number;
  private lastRefill: number;

  constructor(private maxRequests: number, private windowMs: number) {
    this.tokens = maxRequests;
    this.lastRefill = Date.now();
  }

  tryAcquire(): boolean {
    const now = Date.now();
    const timePassed = now - this.lastRefill;

    if (timePassed > this.windowMs) {
      this.tokens = this.maxRequests;
      this.lastRefill = now;
    }

    if (this.tokens > 0) {
      this.tokens--;
      return true;
    }
    return false;
  }
}

export class CircuitBreaker {
  private failures = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  private nextTry = 0;

  constructor(private threshold: number, private resetTimeout: number) {}

  canRequest(): boolean {
    if (this.state === 'CLOSED') return true;
    if (this.state === 'OPEN') {
      if (Date.now() > this.nextTry) {
        this.state = 'HALF_OPEN';
        return true;
      }
      return false;
    }
    return true; // HALF_OPEN
  }

  onSuccess() {
    this.failures = 0;
    this.state = 'CLOSED';
  }

  onFailure() {
    this.failures++;
    if (this.failures >= this.threshold) {
      this.state = 'OPEN';
      this.nextTry = Date.now() + this.resetTimeout;
    }
  }
}

export class SafeClient {
  private limiter?: RateLimiter;
  private breaker?: CircuitBreaker;

  constructor(private config: ClientConfig) {
    if (config.rateLimit) {
      this.limiter = new RateLimiter(config.rateLimit.maxRequests, config.rateLimit.windowMs);
    }
    if (config.circuitBreaker) {
      this.breaker = new CircuitBreaker(config.circuitBreaker.failureThreshold, config.circuitBreaker.resetTimeoutMs);
    }
  }

  async request(url: string, options: any = {}): Promise<any> {
    // 1. Circuit Breaker Check
    if (this.breaker && !this.breaker.canRequest()) {
      throw new Error('CircuitBreaker is OPEN');
    }

    // 2. Rate Limit Check
    if (this.limiter) {
        // Simple blocking or throw? Let's throw for now to trigger backoff in caller or just fail.
        if (!this.limiter.tryAcquire()) {
            throw new Error('RateLimit Exceeded');
        }
    }

    // 3. Execution (Mock fetch)
    try {
        const response = await this.performFetch(url, options);
        if (this.breaker) this.breaker.onSuccess();
        return response;
    } catch (err) {
        if (this.breaker) this.breaker.onFailure();
        throw err;
    }
  }

  private async performFetch(url: string, options: any) {
    // In real app, use axios/fetch. Here we simulate or delegate.
    if (options.mockFn) return options.mockFn(url);
    return { status: 200, data: 'ok' };
  }
}
