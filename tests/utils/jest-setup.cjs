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

const ensureEnv = function(key, value) {
  if (!process.env[key]) {
    process.env[key] = value;
  }
};

ensureEnv('DATABASE_URL', 'postgresql://user:pass@localhost:5432/db');
ensureEnv('NEO4J_URI', 'bolt://localhost:7687');
ensureEnv('NEO4J_USER', 'neo4j');
ensureEnv('NEO4J_PASSWORD', 'devpassword');
ensureEnv('JWT_SECRET', 'devsecretdevsecretdevsecretdevsecret');
ensureEnv('JWT_REFRESH_SECRET', 'refreshsecretrefreshsecretrefreshsecret');

// Mock prom-client to prevent metric registration conflicts in unit tests
if (typeof jest !== 'undefined') {
  jest.mock('prom-client', () => {
    const mockMetric = {
      __value: 0,
      inc(value = 1) {
        this.__value += value;
      },
      dec(value = 1) {
        this.__value -= value;
      },
      set(value) {
        this.__value = value;
      },
      observe() {},
      reset() {
        this.__value = 0;
      },
      get() {
        return { values: [{ value: this.__value }] };
      },
      labels() {
        return this;
      },
      startTimer: () => () => {},
    };

    class MockCounter {
      constructor() { Object.assign(this, mockMetric); }
    }
    class MockGauge {
      constructor() { Object.assign(this, mockMetric); }
    }
    class MockHistogram {
      constructor() { Object.assign(this, mockMetric); }
    }
    class MockSummary {
      constructor() { Object.assign(this, mockMetric); }
    }
    class MockRegistry {
      registerMetric() {}
      getSingleMetric() { return null; }
      getMetricsAsJSON() { return []; }
      metrics() { return ''; }
      clear() {}
      setDefaultLabels() {}
      resetMetrics() {}
    }

    return {
      __esModule: true,
      Counter: MockCounter,
      Gauge: MockGauge,
      Histogram: MockHistogram,
      Summary: MockSummary,
      Registry: MockRegistry,
      register: new MockRegistry(),
      collectDefaultMetrics: jest.fn(),
      default: {
        Counter: MockCounter,
        Gauge: MockGauge,
        Histogram: MockHistogram,
        Summary: MockSummary,
        Registry: MockRegistry,
        register: new MockRegistry(),
        collectDefaultMetrics: jest.fn(),
      },
    };
  });
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
