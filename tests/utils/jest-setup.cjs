/**
 * Jest Global Setup
 *
 * This file is run before each test file.
 * It sets up global test utilities and configuration.
 */

// Extend Jest timeout for integration tests
if (typeof jest !== 'undefined') {
  jest.setTimeout(30000);
}

// Wait for a condition to be true
globalThis.testHelpers = {
  waitFor: async function(fn, timeout) {
    timeout = timeout || 5000;
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const result = await fn();
      if (result) return;
      await new Promise(function(resolve) { setTimeout(resolve, 100); });
    }
    throw new Error('waitFor timed out after ' + timeout + 'ms');
  },

  sleep: function(ms) {
    return new Promise(function(resolve) { setTimeout(resolve, ms); });
  },

  mockConsole: function() {
    const originalConsole = Object.assign({}, console);
    console.log = jest.fn();
    console.warn = jest.fn();
    console.error = jest.fn();
    console.info = jest.fn();
    console.debug = jest.fn();

    return {
      restore: function() {
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
afterEach(function() {
  jest.clearAllMocks();
});

// Global error handler for unhandled rejections in tests
process.on('unhandledRejection', function(reason, promise) {
  console.error('Unhandled Rejection in test:', reason);
});

// Suppress specific warnings in tests
const originalWarn = console.warn;
console.warn = function() {
  const args = Array.prototype.slice.call(arguments);
  const message = args[0];
  if (typeof message === 'string') {
    if (message.includes('Warning: ReactDOM.render is no longer supported')) return;
    if (message.includes('Warning: An update to')) return;
  }
  originalWarn.apply(console, args);
};
