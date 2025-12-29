// Jest Global Setup (ESM-compatible)
import { jest } from '@jest/globals';

// Extend Jest timeout for integration tests
jest.setTimeout(30000);

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

  sleep: (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
  },

  mockConsole: () => {
    const originalConsole = { ...console };
    console.log = jest.fn();
    console.warn = jest.fn();
    console.error = jest.fn();
    console.info = jest.fn();
    console.debug = jest.fn();

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
  jest.clearAllMocks();
});

// Global error handler for unhandled rejections in tests
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection in test:', reason);
});

// Suppress specific warnings in tests
const originalWarn = console.warn;
console.warn = (...args) => {
  // Suppress known benign warnings
  const message = args[0];
  if (typeof message === 'string') {
    if (message.includes('Warning: ReactDOM.render is no longer supported')) return;
    if (message.includes('Warning: An update to')) return;
  }
  originalWarn.apply(console, args);
};
