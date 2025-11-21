/**
 * Test Utilities and Helpers
 *
 * Provides additional test utilities that can be imported in test files.
 * These are utility functions, not Jest setup hooks.
 */

/**
 * Wait for a condition to become true
 */
export const waitFor = async (
  fn: () => boolean | Promise<boolean>,
  timeout = 5000
): Promise<void> => {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const result = await fn();
    if (result) return;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error(`waitFor timed out after ${timeout}ms`);
};

/**
 * Sleep for specified milliseconds
 */
export const sleep = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Create a deferred promise for testing async behavior
 */
export const createDeferred = <T>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;

  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
};

/**
 * Retry a function until it succeeds or max retries reached
 */
export const retry = async <T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  delay = 100
): Promise<T> => {
  let lastError: Error | undefined;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (i < maxRetries - 1) {
        await sleep(delay * Math.pow(2, i));
      }
    }
  }

  throw lastError;
};

/**
 * Mock a module with automatic cleanup
 */
export const mockModule = <T>(moduleName: string, implementation: T) => {
  jest.mock(moduleName, () => implementation);
  return () => jest.unmock(moduleName);
};

/**
 * Create a spy that tracks all calls
 */
export const createCallTracker = <T extends (...args: unknown[]) => unknown>() => {
  const calls: Parameters<T>[] = [];
  const fn = ((...args: Parameters<T>) => {
    calls.push(args);
  }) as T;
  return { fn, calls };
};

export default {
  waitFor,
  sleep,
  createDeferred,
  retry,
  mockModule,
  createCallTracker,
};
