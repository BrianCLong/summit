/**
 * Jest Global Setup
 *
 * This file is run before each test file.
 * It sets up global test utilities and configuration.
 */

const jestGlobal = globalThis.jest || require('@jest/globals').jest;

// Extend Jest timeout for integration tests
jestGlobal.setTimeout(30000);

// Global test utilities
globalThis.testHelpers = {
  waitFor: async (fn, timeout = 5000) => {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const result = await fn();
      if (result) return;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    throw new Error(`waitFor timed out after ${timeout}ms`);
  },

  sleep: ms => new Promise(resolve => setTimeout(resolve, ms)),

  mockConsole: () => {
    const originalConsole = { ...console };
    console.log = jestGlobal.fn();
    console.warn = jestGlobal.fn();
    console.error = jestGlobal.fn();
    console.info = jestGlobal.fn();
    console.debug = jestGlobal.fn();

    return {
      restore: () => {
        console.log = originalConsole.log;
        console.warn = originalConsole.warn;
        console.error = originalConsole.error;
        console.info = originalConsole.info;
        console.debug = originalConsole.debug;
      },
    };
  },
};

// Clean up after each test
afterEach(() => {
  jestGlobal.clearAllMocks();
});

// Global error handler for unhandled rejections in tests
process.on('unhandledRejection', reason => {
  console.error('Unhandled Rejection in test:', reason);
});

// Suppress specific warnings in tests
const originalWarn = console.warn;
console.warn = (...args) => {
  const [message] = args;
  if (typeof message === 'string') {
    if (message.includes('Warning: ReactDOM.render is no longer supported')) return;
    if (message.includes('Warning: An update to')) return;
  }
  originalWarn.apply(console, args);
};
