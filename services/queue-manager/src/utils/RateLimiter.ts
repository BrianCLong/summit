/**
 * Token bucket rate limiter for controlling job processing rates
 */
export class RateLimiter {
  private tokens: number;
  private lastRefill: number;

  constructor(
    private maxTokens: number,
    private refillDuration: number, // milliseconds
  ) {
    this.tokens = maxTokens;
    this.lastRefill = Date.now();
  }

  /**
   * Try to acquire a token. Returns true if successful, false if rate limit exceeded.
   */
  tryAcquire(): boolean {
    this.refill();

    if (this.tokens > 0) {
      this.tokens--;
      return true;
    }

    return false;
  }

  /**
   * Wait until a token is available, then acquire it
   */
  async acquire(): Promise<void> {
    while (!this.tryAcquire()) {
      await this.sleep(100); // Wait 100ms before retrying
    }
  }

  /**
   * Refill tokens based on elapsed time
   */
  private refill(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefill;

    if (elapsed >= this.refillDuration) {
      const refillCount = Math.floor(elapsed / this.refillDuration);
      this.tokens = Math.min(
        this.maxTokens,
        this.tokens + refillCount * this.maxTokens,
      );
      this.lastRefill = now;
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get current token count
   */
  getAvailableTokens(): number {
    this.refill();
    return this.tokens;
  }

  /**
   * Reset the rate limiter
   */
  reset(): void {
    this.tokens = this.maxTokens;
    this.lastRefill = Date.now();
  }
}
