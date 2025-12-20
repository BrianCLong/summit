import { RateLimiter } from '../utils/RateLimiter';

describe('RateLimiter', () => {
  it('should allow requests within rate limit', () => {
    const limiter = new RateLimiter(10, 1000); // 10 requests per second

    for (let i = 0; i < 10; i++) {
      expect(limiter.tryAcquire()).toBe(true);
    }
  });

  it('should block requests exceeding rate limit', () => {
    const limiter = new RateLimiter(5, 1000); // 5 requests per second

    // Use up all tokens
    for (let i = 0; i < 5; i++) {
      expect(limiter.tryAcquire()).toBe(true);
    }

    // Next request should be blocked
    expect(limiter.tryAcquire()).toBe(false);
  });

  it('should refill tokens after duration', async () => {
    const limiter = new RateLimiter(5, 100); // 5 requests per 100ms

    // Use up all tokens
    for (let i = 0; i < 5; i++) {
      limiter.tryAcquire();
    }

    expect(limiter.tryAcquire()).toBe(false);

    // Wait for refill
    await new Promise((resolve) => setTimeout(resolve, 150));

    expect(limiter.tryAcquire()).toBe(true);
  });

  it('should return available token count', () => {
    const limiter = new RateLimiter(10, 1000);

    expect(limiter.getAvailableTokens()).toBe(10);

    limiter.tryAcquire();
    expect(limiter.getAvailableTokens()).toBe(9);

    limiter.tryAcquire();
    limiter.tryAcquire();
    expect(limiter.getAvailableTokens()).toBe(7);
  });

  it('should reset to max tokens', () => {
    const limiter = new RateLimiter(10, 1000);

    // Use some tokens
    for (let i = 0; i < 5; i++) {
      limiter.tryAcquire();
    }

    expect(limiter.getAvailableTokens()).toBe(5);

    limiter.reset();
    expect(limiter.getAvailableTokens()).toBe(10);
  });

  it('should wait until token is available', async () => {
    const limiter = new RateLimiter(1, 100); // 1 request per 100ms

    limiter.tryAcquire();

    const start = Date.now();
    await limiter.acquire();
    const elapsed = Date.now() - start;

    expect(elapsed).toBeGreaterThanOrEqual(100);
  });
});
