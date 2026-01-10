/**
 * Test Infrastructure: Clock Control (Fake Timers)
 *
 * Problem: Tests that rely on setTimeout, setInterval, or Date.now() are
 * non-deterministic and slow.
 *
 * Solution: Use fake timers to control time in tests.
 *
 * Usage:
 *   import { useFakeTimers, advanceTimers, restoreTimers } from '../../test/infra/time';
 *
 *   beforeEach(() => {
 *     useFakeTimers();
 *   });
 *
 *   afterEach(() => {
 *     restoreTimers();
 *   });
 *
 *   it('should timeout after 60 seconds', () => {
 *     const limiter = new RateLimiter({ windowSeconds: 60 });
 *     limiter.consume(100);
 *     expect(limiter.isExhausted()).toBe(true);
 *
 *     advanceTimers(60000); // Advance 60 seconds
 *     expect(limiter.isExhausted()).toBe(false);
 *   });
 */

import { install as installFakeTimers, InstalledClock } from '@sinonjs/fake-timers';

let clock: InstalledClock | null = null;

/**
 * Install fake timers.
 *
 * This replaces global timer functions (setTimeout, setInterval, Date.now, etc.)
 * with controllable fakes.
 *
 * Call this in beforeEach().
 *
 * @param options - Fake timer options
 */
export function useFakeTimers(options?: {
  now?: number | Date;
  shouldAdvanceTime?: boolean;
  shouldClearNativeTimers?: boolean;
}): void {
  if (clock) {
    throw new Error('Fake timers already installed. Call restoreTimers() first.');
  }

  clock = installFakeTimers({
    now: options?.now ?? Date.now(),
    shouldAdvanceTime: options?.shouldAdvanceTime ?? false,
    shouldClearNativeTimers: options?.shouldClearNativeTimers ?? true,
    toFake: [
      'setTimeout',
      'clearTimeout',
      'setInterval',
      'clearInterval',
      'setImmediate',
      'clearImmediate',
      'Date',
      'nextTick',
      'hrtime',
      'requestAnimationFrame',
      'cancelAnimationFrame',
      'requestIdleCallback',
      'cancelIdleCallback',
      'performance',
    ],
  });
}

/**
 * Restore real timers.
 *
 * This uninstalls fake timers and restores the original timer functions.
 *
 * Call this in afterEach().
 */
export function restoreTimers(): void {
  if (clock) {
    clock.uninstall();
    clock = null;
  }
}

/**
 * Advance the fake timers by the specified amount.
 *
 * @param ms - Milliseconds to advance
 */
export function advanceTimers(ms: number): void {
  if (!clock) {
    throw new Error('Fake timers not installed. Call useFakeTimers() first.');
  }
  clock.tick(ms);
}

/**
 * Advance timers to the next timer.
 *
 * This is useful when you don't know the exact timeout value.
 */
export function advanceTimersToNextTimer(): void {
  if (!clock) {
    throw new Error('Fake timers not installed. Call useFakeTimers() first.');
  }
  clock.next();
}

/**
 * Run all pending timers.
 *
 * This advances time until no timers are left.
 */
export function runAllTimers(): void {
  if (!clock) {
    throw new Error('Fake timers not installed. Call useFakeTimers() first.');
  }
  clock.runAll();
}

/**
 * Run only pending timers (not recursively scheduled ones).
 */
export function runOnlyPendingTimers(): void {
  if (!clock) {
    throw new Error('Fake timers not installed. Call useFakeTimers() first.');
  }
  clock.runToLast();
}

/**
 * Get the current fake time (milliseconds since epoch).
 */
export function getCurrentTime(): number {
  if (!clock) {
    throw new Error('Fake timers not installed. Call useFakeTimers() first.');
  }
  return clock.now;
}

/**
 * Set the current fake time.
 *
 * @param ms - Milliseconds since epoch
 */
export function setCurrentTime(ms: number): void {
  if (!clock) {
    throw new Error('Fake timers not installed. Call useFakeTimers() first.');
  }
  clock.setSystemTime(ms);
}

/**
 * Get the number of pending timers.
 */
export function countPendingTimers(): number {
  if (!clock) {
    throw new Error('Fake timers not installed. Call useFakeTimers() first.');
  }
  return clock.countTimers();
}

/**
 * Wait for a promise to resolve while advancing timers.
 *
 * This is useful for testing async code that relies on timers.
 *
 * @param promise - Promise to wait for
 * @param advanceMs - Milliseconds to advance timers while waiting
 */
export async function waitForWithTimers<T>(
  promise: Promise<T>,
  advanceMs: number = 0
): Promise<T> {
  if (!clock) {
    throw new Error('Fake timers not installed. Call useFakeTimers() first.');
  }

  if (advanceMs > 0) {
    advanceTimers(advanceMs);
  }

  return promise;
}
