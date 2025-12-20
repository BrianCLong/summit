/**
 * Token Bucket Rate Limiter Tests
 *
 * MIT License
 * Copyright (c) 2025 IntelGraph
 */

import { TokenBucketLimiter } from '../algorithms/token-bucket.js';
import type { IRateLimitStore, TokenBucketState } from '../types.js';

// Mock store for token bucket testing
class MockTokenBucketStore implements IRateLimitStore {
  private buckets: Map<string, TokenBucketState> = new Map();

  async increment() {
    throw new Error('Not implemented for token bucket tests');
  }

  async get() {
    return null;
  }

  async reset(key: string): Promise<void> {
    this.buckets.delete(key);
  }

  async getTokenBucket(key: string): Promise<TokenBucketState | null> {
    return this.buckets.get(key) || null;
  }

  async consumeTokens(
    key: string,
    tokensToConsume: number,
    capacity: number,
    refillRate: number,
  ): Promise<TokenBucketState> {
    const now = Date.now();
    let bucket = this.buckets.get(key);

    if (!bucket) {
      bucket = {
        tokens: capacity,
        capacity,
        lastRefill: now,
        refillRate,
      };
    }

    // Refill tokens
    const timePassed = (now - bucket.lastRefill) / 1000;
    const tokensToAdd = timePassed * bucket.refillRate;
    bucket.tokens = Math.min(capacity, bucket.tokens + tokensToAdd);
    bucket.lastRefill = now;

    // Try to consume
    if (bucket.tokens >= tokensToConsume) {
      bucket.tokens -= tokensToConsume;
    }

    this.buckets.set(key, bucket);
    return bucket;
  }

  async healthCheck(): Promise<boolean> {
    return true;
  }
}

describe('TokenBucketLimiter', () => {
  let store: MockTokenBucketStore;
  let limiter: TokenBucketLimiter;

  beforeEach(() => {
    store = new MockTokenBucketStore();
    limiter = new TokenBucketLimiter(store);
  });

  describe('consume', () => {
    it('should allow requests when tokens available', async () => {
      const state = await limiter.consume('test-key', 100, 10);

      expect(state.remaining).toBe(99);
      expect(state.isExceeded).toBe(false);
    });

    it('should consume multiple tokens', async () => {
      const state = await limiter.consume('test-key', 100, 10, 5);

      expect(state.remaining).toBe(95);
      expect(state.isExceeded).toBe(false);
    });

    it('should deny when insufficient tokens', async () => {
      // Consume all tokens
      await limiter.consume('test-key', 10, 1, 10);

      // Try to consume more
      const state = await limiter.consume('test-key', 10, 1);

      expect(state.isExceeded).toBe(true);
    });

    it('should refill tokens over time', async () => {
      // Consume tokens
      await limiter.consume('test-key', 100, 10, 10);

      // Wait for refill (mock by advancing time in store)
      await new Promise((resolve) => setTimeout(resolve, 100));

      const state = await limiter.consume('test-key', 100, 10);

      // Should have refilled some tokens
      expect(state.remaining).toBeGreaterThan(89);
    });

    it('should cap at capacity', async () => {
      const capacity = 100;

      // Wait for potential refill
      await new Promise((resolve) => setTimeout(resolve, 100));

      const state = await limiter.peek('test-key', capacity, 10);

      expect(state?.remaining).toBeLessThanOrEqual(capacity);
    });

    it('should handle burst traffic', async () => {
      const capacity = 100;
      const refillRate = 10;

      // Burst consume
      for (let i = 0; i < 50; i++) {
        await limiter.consume('test-key', capacity, refillRate);
      }

      const state = await limiter.peek('test-key', capacity, refillRate);

      expect(state?.remaining).toBeLessThan(capacity);
    });
  });

  describe('peek', () => {
    it('should return full bucket for new key', async () => {
      const state = await limiter.peek('new-key', 100, 10);

      expect(state?.remaining).toBe(100);
      expect(state?.isExceeded).toBe(false);
    });

    it('should return current state without consuming', async () => {
      await limiter.consume('test-key', 100, 10, 10);

      const state1 = await limiter.peek('test-key', 100, 10);
      const state2 = await limiter.peek('test-key', 100, 10);

      expect(state1?.remaining).toBe(state2?.remaining);
    });
  });

  describe('reset', () => {
    it('should reset bucket state', async () => {
      await limiter.consume('test-key', 100, 10, 50);

      await limiter.reset('test-key');

      const state = await limiter.peek('test-key', 100, 10);

      // After reset, should have full capacity
      expect(state?.remaining).toBe(100);
    });
  });
});
