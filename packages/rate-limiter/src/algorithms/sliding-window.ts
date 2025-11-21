/**
 * Sliding Window Rate Limiter Algorithm
 *
 * MIT License
 * Copyright (c) 2025 IntelGraph
 */

import type { IRateLimitStore, RateLimitState } from '../types.js';

export class SlidingWindowLimiter {
  private store: IRateLimitStore;

  constructor(store: IRateLimitStore) {
    this.store = store;
  }

  /**
   * Check and consume a request using sliding window algorithm
   */
  async consume(
    key: string,
    max: number,
    windowMs: number,
  ): Promise<RateLimitState> {
    // Increment request count and get current state
    const state = await this.store.increment(key, windowMs);

    // Calculate remaining and whether limit is exceeded
    const remaining = Math.max(0, max - state.consumed);
    const isExceeded = state.consumed > max;

    return {
      ...state,
      limit: max,
      remaining,
      isExceeded,
    };
  }

  /**
   * Get current state without consuming
   */
  async peek(key: string, max: number): Promise<RateLimitState | null> {
    const state = await this.store.get(key);

    if (!state) {
      return null;
    }

    const remaining = Math.max(0, max - state.consumed);
    const isExceeded = state.consumed > max;

    return {
      ...state,
      limit: max,
      remaining,
      isExceeded,
    };
  }

  /**
   * Reset rate limit for a key
   */
  async reset(key: string): Promise<void> {
    await this.store.reset(key);
  }
}
