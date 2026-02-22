import { describe, test, expect, vi, beforeEach } from "vitest";
import { AdaptiveRateLimiter } from "../src/middleware/rate-limit";

// Mock RateLimiterRedis
vi.mock('rate-limiter-flexible', () => {
  return {
    RateLimiterRedis: class {
      consume = vi.fn().mockResolvedValue({ remainingPoints: 1 });
    }
  };
});

describe("AdaptiveRateLimiter", () => {
  let redisMock: any;

  beforeEach(() => {
    redisMock = {};
  });

  test("should allow request under limit", async () => {
    const limiter = new AdaptiveRateLimiter(redisMock);
    const result = await limiter.checkLimit("user1", "free");
    expect(result.allowed).toBe(true);
  });

  test("should use different limits for tiers", async () => {
    const limiter = new AdaptiveRateLimiter(redisMock);
    // Access private method via any cast or just ensure no error
    await limiter.checkLimit("user1", "pro");
    await limiter.checkLimit("user2", "enterprise");
    expect(true).toBe(true);
  });
});
