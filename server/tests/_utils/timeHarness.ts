import { jest } from '@jest/globals';

export function useFakeTime(start = new Date('2025-01-01T00:00:00Z').getTime()) {
  // Always install modern fake timers
  jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate'] });

  // Ensure Date and timers are aligned to a known epoch
  jest.setSystemTime(start);

  // Helpers
  const now = () => Date.now();

  const advanceMs = async (ms: number) => {
    // Advance all timers and flush microtasks between steps
    jest.advanceTimersByTime(ms);
    // Allow pending promises to resolve
    await Promise.resolve();
  };

  const advanceTo = async (targetMsSinceEpoch: number) => {
    const delta = Math.max(0, targetMsSinceEpoch - now());
    await advanceMs(delta);
  };

  const restore = () => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  };

  // Performance.now shim
  if (globalThis.performance) {
    const base = start;
    // Light-weight stub tied to jest's system time
    jest.spyOn(globalThis.performance, 'now').mockImplementation(() => Date.now() - base);
  }

  return { now, advanceMs, advanceTo, restore };
}
