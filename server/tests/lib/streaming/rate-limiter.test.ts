
import { AdaptiveRateLimiter } from '../../../src/lib/streaming/rate-limiter';

describe('AdaptiveRateLimiter', () => {
  jest.useFakeTimers();

  it('should allow acquiring tokens when available', async () => {
    const limiter = new AdaptiveRateLimiter({ initialTokens: 10 });
    await limiter.acquire(); // Should resolve immediately
  });

  it('should block when no tokens are available', async () => {
    const limiter = new AdaptiveRateLimiter({ initialTokens: 1, refillRate: 1 });
    await limiter.acquire(); // Uses the only token

    let acquired = false;
    const acquirePromise = limiter.acquire().then(() => {
      acquired = true;
    });

    expect(acquired).toBe(false);

    // Advance time to refill tokens
    jest.advanceTimersByTime(1000); // 1 second

    await acquirePromise;
    expect(acquired).toBe(true);
  });

  it('should handle client-scoped limits', async () => {
    const limiter = new AdaptiveRateLimiter({ clientScope: true, initialTokens: 1, refillRate: 1 });
    await limiter.acquire('client1'); // Uses the only token for client1

    let client1Acquired = false;
    const client1Promise = limiter.acquire('client1').then(() => {
      client1Acquired = true;
    });

    // client2 should be able to acquire a token immediately
    await limiter.acquire('client2');

    expect(client1Acquired).toBe(false);

    jest.advanceTimersByTime(1000);

    await client1Promise;
    expect(client1Acquired).toBe(true);
  });
});
