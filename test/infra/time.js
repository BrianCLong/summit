"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.useFakeTimers = useFakeTimers;
exports.restoreTimers = restoreTimers;
exports.advanceTimers = advanceTimers;
exports.advanceTimersToNextTimer = advanceTimersToNextTimer;
exports.runAllTimers = runAllTimers;
exports.runOnlyPendingTimers = runOnlyPendingTimers;
exports.getCurrentTime = getCurrentTime;
exports.setCurrentTime = setCurrentTime;
exports.countPendingTimers = countPendingTimers;
exports.waitForWithTimers = waitForWithTimers;
const fake_timers_1 = require("@sinonjs/fake-timers");
let clock = null;
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
function useFakeTimers(options) {
    if (clock) {
        throw new Error('Fake timers already installed. Call restoreTimers() first.');
    }
    clock = (0, fake_timers_1.install)({
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
function restoreTimers() {
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
function advanceTimers(ms) {
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
function advanceTimersToNextTimer() {
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
function runAllTimers() {
    if (!clock) {
        throw new Error('Fake timers not installed. Call useFakeTimers() first.');
    }
    clock.runAll();
}
/**
 * Run only pending timers (not recursively scheduled ones).
 */
function runOnlyPendingTimers() {
    if (!clock) {
        throw new Error('Fake timers not installed. Call useFakeTimers() first.');
    }
    clock.runToLast();
}
/**
 * Get the current fake time (milliseconds since epoch).
 */
function getCurrentTime() {
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
function setCurrentTime(ms) {
    if (!clock) {
        throw new Error('Fake timers not installed. Call useFakeTimers() first.');
    }
    clock.setSystemTime(ms);
}
/**
 * Get the number of pending timers.
 */
function countPendingTimers() {
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
async function waitForWithTimers(promise, advanceMs = 0) {
    if (!clock) {
        throw new Error('Fake timers not installed. Call useFakeTimers() first.');
    }
    if (advanceMs > 0) {
        advanceTimers(advanceMs);
    }
    return promise;
}
