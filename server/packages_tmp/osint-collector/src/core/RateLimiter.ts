/**
 * Rate Limiter - Controls request rates for respectful crawling
 */

import { RateLimiterMemory } from 'rate-limiter-flexible';

export class RateLimiter {
  private limiters: Map<string, RateLimiterMemory> = new Map();

  /**
   * Create a rate limiter for a specific source
   */
  createLimiter(
    source: string,
    points: number,
    duration: number
  ): void {
    const limiter = new RateLimiterMemory({
      points, // Number of requests
      duration, // Per duration in seconds
      blockDuration: 0 // Do not block, just delay
    });

    this.limiters.set(source, limiter);
  }

  /**
   * Consume a point from the rate limiter
   */
  async consume(source: string, points: number = 1): Promise<void> {
    const limiter = this.limiters.get(source);
    if (!limiter) {
      throw new Error(`No rate limiter configured for source: ${source}`);
    }

    try {
      await limiter.consume(source, points);
    } catch (rejRes: any) {
      // Wait for the required time
      const delay = rejRes.msBeforeNext || 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
      // Retry
      await limiter.consume(source, points);
    }
  }

  /**
   * Get rate limiter status
   */
  async getStatus(source: string): Promise<{
    remainingPoints: number;
    consumedPoints: number;
  } | null> {
    const limiter = this.limiters.get(source);
    if (!limiter) {
      return null;
    }

    const res = await limiter.get(source);
    if (!res) {
      return { remainingPoints: 0, consumedPoints: 0 };
    }

    return {
      remainingPoints: res.remainingPoints,
      consumedPoints: res.consumedPoints
    };
  }

  /**
   * Reset rate limiter for a source
   */
  async reset(source: string): Promise<void> {
    const limiter = this.limiters.get(source);
    if (limiter) {
      await limiter.delete(source);
    }
  }

  /**
   * Remove rate limiter
   */
  removeLimiter(source: string): void {
    this.limiters.delete(source);
  }

  /**
   * Clear all rate limiters
   */
  clear(): void {
    this.limiters.clear();
  }
}
