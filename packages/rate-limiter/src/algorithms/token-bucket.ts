/**
 * Token Bucket Rate Limiter Algorithm
 *
 * MIT License
 * Copyright (c) 2025 IntelGraph
 */

import type {
  IRateLimitStore,
  RateLimitState,
  TokenBucketState,
} from '../types.js';

export class TokenBucketLimiter {
  private store: IRateLimitStore;

  constructor(store: IRateLimitStore) {
    this.store = store;
  }

  /**
   * Check and consume tokens using token bucket algorithm
   */
  async consume(
    key: string,
    capacity: number,
    refillRate: number,
    tokensToConsume = 1,
  ): Promise<RateLimitState> {
    // Consume tokens from bucket
    const bucketState = await this.store.consumeTokens(
      key,
      tokensToConsume,
      capacity,
      refillRate,
    );

    // Calculate when bucket will be full again
    const tokensNeeded = capacity - bucketState.tokens;
    const timeToRefillMs = (tokensNeeded / refillRate) * 1000;
    const resetAt = Math.floor((Date.now() + timeToRefillMs) / 1000);

    // Calculate retry time if we don't have enough tokens
    const retryAfter = bucketState.tokens < tokensToConsume
      ? Math.ceil((tokensToConsume - bucketState.tokens) / refillRate)
      : 0;

    const isExceeded = bucketState.tokens < tokensToConsume;

    return {
      key,
      consumed: capacity - Math.floor(bucketState.tokens),
      limit: capacity,
      remaining: Math.floor(bucketState.tokens),
      resetAt,
      retryAfter,
      isExceeded,
    };
  }

  /**
   * Get current bucket state without consuming
   */
  async peek(
    key: string,
    capacity: number,
    refillRate: number,
  ): Promise<RateLimitState | null> {
    const bucketState = await this.store.getTokenBucket(key);

    if (!bucketState) {
      // If bucket doesn't exist, it's full
      return {
        key,
        consumed: 0,
        limit: capacity,
        remaining: capacity,
        resetAt: Math.floor(Date.now() / 1000),
        retryAfter: 0,
        isExceeded: false,
      };
    }

    // Recalculate current tokens based on refill
    const now = Date.now();
    const timePassed = (now - bucketState.lastRefill) / 1000;
    const tokensToAdd = timePassed * bucketState.refillRate;
    const currentTokens = Math.min(capacity, bucketState.tokens + tokensToAdd);

    const tokensNeeded = capacity - currentTokens;
    const timeToRefillMs = (tokensNeeded / refillRate) * 1000;
    const resetAt = Math.floor((now + timeToRefillMs) / 1000);

    return {
      key,
      consumed: capacity - Math.floor(currentTokens),
      limit: capacity,
      remaining: Math.floor(currentTokens),
      resetAt,
      retryAfter: 0,
      isExceeded: false,
    };
  }

  /**
   * Reset bucket for a key
   */
  async reset(key: string): Promise<void> {
    await this.store.reset('tb:' + key);
  }
}
