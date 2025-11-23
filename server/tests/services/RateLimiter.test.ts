import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { RateLimiter } from '../../src/services/RateLimiter';

// Mock deps
const mockRedis = {
  eval: jest.fn(),
  call: jest.fn(),
};

jest.mock('../../src/config/database.js', () => ({
  getRedisClient: () => mockRedis,
}));

jest.mock('../../src/utils/metrics.js', () => ({
  PrometheusMetrics: class MockMetrics {
      createCounter = jest.fn();
      createGauge = jest.fn();
      incrementCounter = jest.fn();
      setGauge = jest.fn();
  }
}));

describe('RateLimiter', () => {
  let limiter: RateLimiter;

  beforeEach(() => {
    jest.clearAllMocks();
    limiter = new RateLimiter();
  });

  it('should allow request when limit not exceeded', async () => {
    // Mock Lua response: [current_count, ttl]
    mockRedis.eval.mockResolvedValue([1, 1000]);

    const result = await limiter.checkLimit('test-key', 10, 60000);

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(9);
    expect(mockRedis.eval).toHaveBeenCalledWith(
      expect.stringContaining('local current'),
      1,
      expect.stringContaining('test-key'),
      60000
    );
  });

  it('should block request when limit exceeded', async () => {
    mockRedis.eval.mockResolvedValue([11, 1000]);

    const result = await limiter.checkLimit('test-key', 10, 60000);

    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('should fail open (allow) when redis fails', async () => {
    mockRedis.eval.mockRejectedValue(new Error('Redis down'));

    const result = await limiter.checkLimit('test-key', 10, 60000);

    expect(result.allowed).toBe(true);
    expect(result.total).toBe(10);
  });
});
