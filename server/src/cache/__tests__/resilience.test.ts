import { jest } from '@jest/globals';
import { buildDeterministicCacheKey, stableObjectKey } from '../cacheKeyBuilder.js';
import { CircuitBreaker } from '../circuitBreaker.js';
import { TokenBucket } from '../rateLimit.js';
import { withSafeFallback } from '../safeFallback.js';

describe('cache resilience primitives', () => {
  it('generates deterministic cache keys', () => {
    const keyA = buildDeterministicCacheKey('ns', { b: 2, a: 1 });
    const keyB = buildDeterministicCacheKey('ns', { a: 1, b: 2 });
    expect(keyA).toBe(keyB);
    expect(stableObjectKey({ z: 1, a: 2 })).toBe('{a:2,z:1}');
  });

  it('enforces rate limits with refills', () => {
    const bucket = new TokenBucket({ capacity: 2, refillRatePerSec: 1, initialTokens: 1 });
    const first = bucket.consume();
    expect(first.allowed).toBe(true);
    const second = bucket.consume();
    expect(second.allowed).toBe(false);
    const future = bucket.consume(1, bucket.getState().lastRefill + 1500);
    expect(future.allowed).toBe(true);
    expect(Math.round(future.remaining)).toBe(1);
  });

  it('opens and closes circuit breakers after failures and successes', async () => {
    jest.useFakeTimers();
    const breaker = new CircuitBreaker({ failureThreshold: 2, successThreshold: 1, openTimeoutMs: 1000 });

    await expect(breaker.exec(async () => { throw new Error('boom'); })).rejects.toThrow('boom');
    await expect(breaker.exec(async () => { throw new Error('boom'); })).rejects.toThrow('boom');
    expect(breaker.getState()).toBe('open');

    await expect(breaker.exec(async () => 'ok')).rejects.toThrow('circuit-open');
    jest.advanceTimersByTime(1100);
    const result = await breaker.exec(async () => 'recovered');
    expect(result).toBe('recovered');
    expect(breaker.getState()).toBe('closed');
    jest.useRealTimers();
  });

  it('falls back safely on timeout or failure', async () => {
    const primary = jest.fn(async () => new Promise((resolve) => setTimeout(() => resolve('primary'), 50)));
    const fallback = jest.fn(async () => 'fallback');
    const spy = jest.fn();

    const promise = withSafeFallback({ timeoutMs: 10, primary, fallback, onError: spy });
    jest.advanceTimersByTime(20);
    const value = await promise;

    expect(value).toBe('fallback');
    expect(spy).toHaveBeenCalled();
    expect(primary).toHaveBeenCalled();
    expect(fallback).toHaveBeenCalled();
  });
});
