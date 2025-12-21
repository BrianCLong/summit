export type TokenBucketOptions = {
  capacity: number;
  refillRatePerSec: number;
  initialTokens?: number;
};

export type TokenBucketState = {
  tokens: number;
  lastRefill: number;
};

export class TokenBucket {
  private capacity: number;
  private refillRatePerSec: number;
  private state: TokenBucketState;

  constructor(options: TokenBucketOptions) {
    this.capacity = Math.max(1, options.capacity);
    this.refillRatePerSec = Math.max(0, options.refillRatePerSec);
    const initial = options.initialTokens ?? this.capacity;
    this.state = { tokens: Math.min(initial, this.capacity), lastRefill: Date.now() };
  }

  private refill(now: number) {
    const elapsed = (now - this.state.lastRefill) / 1000;
    if (elapsed <= 0 || this.refillRatePerSec === 0) return;
    const refillAmount = elapsed * this.refillRatePerSec;
    this.state.tokens = Math.min(this.capacity, this.state.tokens + refillAmount);
    this.state.lastRefill = now;
  }

  consume(tokens = 1, now = Date.now()) {
    this.refill(now);
    if (tokens <= this.state.tokens) {
      this.state.tokens -= tokens;
      return { allowed: true, remaining: this.state.tokens, retryAfterMs: 0 } as const;
    }
    const deficit = tokens - this.state.tokens;
    const secondsUntilAvailable = deficit / this.refillRatePerSec;
    return {
      allowed: false,
      remaining: this.state.tokens,
      retryAfterMs: Math.ceil(secondsUntilAvailable * 1000),
    } as const;
  }

  getState(): TokenBucketState {
    return { ...this.state };
  }
}

export function createRateLimiter(options: TokenBucketOptions) {
  const bucket = new TokenBucket(options);
  return (tokens = 1) => bucket.consume(tokens);
}
