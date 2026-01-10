
import { jest } from '@jest/globals';
import { register } from 'prom-client';

// Global test harness setup

/**
 * Resets the global Prometheus metrics registry.
 * Should be called in `afterEach` or `beforeEach` to prevent duplicate metric errors.
 */
export const resetMetricsRegistry = () => {
  register.clear();
};

/**
 * Mocks Redis client (ioredis) to prevent network connections.
 */
export const mockRedis = () => {
  jest.mock('ioredis', () => {
    return class MockRedis {
      constructor() {}
      on() { return this; }
      subscribe() { return Promise.resolve(); }
      psubscribe() { return Promise.resolve(); }
      publish() { return Promise.resolve(); }
      set() { return Promise.resolve('OK'); }
      get() { return Promise.resolve(null); }
      del() { return Promise.resolve(1); }
      scanStream() {
          // Return an async iterator
          return {
              async *[Symbol.asyncIterator]() {
                  yield [];
              },
              on: () => {}
          }
      }
      quit() { return Promise.resolve(); }
      disconnect() { }
      duplicate() { return new MockRedis(); }

      // Add other methods as needed
      static createClient() { return new MockRedis(); }
    };
  });
};

/**
 * Prevents network access for unit tests.
 * This can be more sophisticated using 'nock' or similar if needed.
 */
export const blockNetworkByDefault = () => {
  // Simple implementation: Fail if http.request is called?
  // For now, rely on mocks.
};

export const setupTestEnv = () => {
    resetMetricsRegistry();
};

export const teardownTestEnv = () => {
    resetMetricsRegistry();
};
