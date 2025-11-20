/**
 * Sliding Window Rate Limiter Tests
 *
 * MIT License
 * Copyright (c) 2025 IntelGraph
 */

import { SlidingWindowLimiter } from '../algorithms/sliding-window.js';
import type { IRateLimitStore, RateLimitState } from '../types.js';

// Mock store implementation for testing
class MockRateLimitStore implements IRateLimitStore {
  private data: Map<string, { count: number; timestamp: number }> = new Map();

  async increment(key: string, windowMs: number): Promise<RateLimitState> {
    const now = Date.now();
    const existing = this.data.get(key);

    let count = 1;
    if (existing && now - existing.timestamp < windowMs) {
      count = existing.count + 1;
    }

    this.data.set(key, { count, timestamp: now });

    const resetAt = Math.floor((now + windowMs) / 1000);

    return {
      key,
      consumed: count,
      limit: 0,
      remaining: 0,
      resetAt,
      retryAfter: Math.ceil(windowMs / 1000),
      isExceeded: false,
    };
  }

  async get(key: string): Promise<RateLimitState | null> {
    const data = this.data.get(key);
    if (!data) return null;

    return {
      key,
      consumed: data.count,
      limit: 0,
      remaining: 0,
      resetAt: Math.floor((data.timestamp + 60000) / 1000),
      retryAfter: 60,
      isExceeded: false,
    };
  }

  async reset(key: string): Promise<void> {
    this.data.delete(key);
  }

  async getTokenBucket() {
    return null;
  }

  async consumeTokens() {
    throw new Error('Not implemented for sliding window tests');
  }

  async healthCheck(): Promise<boolean> {
    return true;
  }
}

describe('SlidingWindowLimiter', () => {
  let store: MockRateLimitStore;
  let limiter: SlidingWindowLimiter;

  beforeEach(() => {
    store = new MockRateLimitStore();
    limiter = new SlidingWindowLimiter(store);
  });

  describe('consume', () => {
    it('should allow requests within limit', async () => {
      const state = await limiter.consume('test-key', 10, 60000);

      expect(state.consumed).toBe(1);
      expect(state.limit).toBe(10);
      expect(state.remaining).toBe(9);
      expect(state.isExceeded).toBe(false);
    });

    it('should track multiple requests', async () => {
      await limiter.consume('test-key', 10, 60000);
      await limiter.consume('test-key', 10, 60000);
      const state = await limiter.consume('test-key', 10, 60000);

      expect(state.consumed).toBe(3);
      expect(state.remaining).toBe(7);
      expect(state.isExceeded).toBe(false);
    });

    it('should exceed limit when max reached', async () => {
      // Consume up to limit
      for (let i = 0; i < 10; i++) {
        await limiter.consume('test-key', 10, 60000);
      }

      // Next request should exceed
      const state = await limiter.consume('test-key', 10, 60000);

      expect(state.consumed).toBe(11);
      expect(state.remaining).toBe(0);
      expect(state.isExceeded).toBe(true);
    });

    it('should handle different keys independently', async () => {
      await limiter.consume('key1', 10, 60000);
      await limiter.consume('key1', 10, 60000);

      await limiter.consume('key2', 10, 60000);

      const state1 = await limiter.peek('key1', 10);
      const state2 = await limiter.peek('key2', 10);

      expect(state1?.consumed).toBe(2);
      expect(state2?.consumed).toBe(1);
    });
  });

  describe('peek', () => {
    it('should return current state without consuming', async () => {
      await limiter.consume('test-key', 10, 60000);

      const state1 = await limiter.peek('test-key', 10);
      const state2 = await limiter.peek('test-key', 10);

      expect(state1?.consumed).toBe(1);
      expect(state2?.consumed).toBe(1);
    });

    it('should return null for non-existent key', async () => {
      const state = await limiter.peek('non-existent', 10);
      expect(state).toBeNull();
    });
  });

  describe('reset', () => {
    it('should reset rate limit for key', async () => {
      await limiter.consume('test-key', 10, 60000);
      await limiter.consume('test-key', 10, 60000);

      await limiter.reset('test-key');

      const state = await limiter.peek('test-key', 10);
      expect(state).toBeNull();
    });
  });
});
