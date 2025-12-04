/**
 * Jest Global Setup Configuration
 * Provides common test utilities and matchers
 */

import { jest, beforeAll, afterAll, afterEach, expect } from '@jest/globals';
import * as matchers from 'jest-extended';

const { __esModule, default: defaultExport, ...actualMatchers } = matchers;
expect.extend(actualMatchers);

// Mock IORedis
jest.mock('ioredis', () => {
  return class Redis {
    constructor() {}
    on() { return this; }
    connect() { return Promise.resolve(); }
    get() { return Promise.resolve(null); }
    set() { return Promise.resolve('OK'); }
    del() { return Promise.resolve(1); }
    quit() { return Promise.resolve('OK'); }
    disconnect() { return Promise.resolve('OK'); }
    duplicate() { return this; }
    subscribe() { return Promise.resolve(); }
    psubscribe() { return Promise.resolve(); }
    publish() { return Promise.resolve(); }
    scanStream() { return { on: (evt, cb) => { if (evt === 'end') cb(); } }; }
  };
});

// Mock pg
jest.mock('pg', () => {
  const mClient = {
    connect: jest.fn(),
    query: jest.fn(),
    end: jest.fn(),
    release: jest.fn(),
  };
  return {
    Pool: jest.fn(() => ({
      connect: jest.fn(() => Promise.resolve(mClient)),
      query: jest.fn(),
      end: jest.fn(),
      on: jest.fn(),
    })),
    Client: jest.fn(() => mClient),
    types: {
      setTypeParser: jest.fn(),
    },
  };
});

// Mock OpenTelemetry
jest.mock('@opentelemetry/api', () => ({
  metrics: {
    getMeterProvider: jest.fn(),
    setGlobalMeterProvider: jest.fn(),
  },
  Meter: jest.fn(),
  Counter: jest.fn(),
  Histogram: jest.fn(),
  UpDownCounter: jest.fn(),
  ObservableGauge: jest.fn(),
  trace: {
    getTracer: jest.fn(() => ({
      startSpan: jest.fn(() => ({
        end: jest.fn(),
        setAttribute: jest.fn(),
        recordException: jest.fn(),
        setStatus: jest.fn(),
      })),
    })),
  },
  context: {
    active: jest.fn(),
  },
}));

jest.mock('@opentelemetry/exporter-prometheus', () => ({
  PrometheusExporter: jest.fn(),
}));

jest.mock('@opentelemetry/sdk-metrics', () => ({
  MeterProvider: jest.fn(() => ({
    getMeter: jest.fn(() => ({
      createCounter: jest.fn(() => ({ add: jest.fn() })),
      createHistogram: jest.fn(() => ({ record: jest.fn() })),
      createUpDownCounter: jest.fn(() => ({ add: jest.fn() })),
      createObservableGauge: jest.fn(() => ({ addCallback: jest.fn() })),
    })),
    addMetricReader: jest.fn(),
  })),
  PeriodicExportingMetricReader: jest.fn(),
}));

jest.mock('@opentelemetry/resources', () => ({
  Resource: jest.fn(),
}));

jest.mock('@opentelemetry/semantic-conventions', () => ({
  SemanticResourceAttributes: { SERVICE_NAME: 'service.name' },
}));

// Mock console methods to reduce noise in tests unless debugging
const originalConsole = { ...console };
const originalConsoleError = console.error;

beforeAll(() => {
  if (!process.env.DEBUG_TESTS) {
    console.log = jest.fn();
    console.info = jest.fn();
    console.warn = jest.fn();
    console.debug = jest.fn();
  }

  console.error = (...args) => {
    originalConsoleError(...args);
    throw new Error(
      '[console.error] used in server tests — replace with assertions or throw',
    );
  };
});

afterAll(() => {
  if (!process.env.DEBUG_TESTS) {
    console.log = originalConsole.log;
    console.info = originalConsole.info;
    console.warn = originalConsole.warn;
    console.debug = originalConsole.debug;
  }
  console.error = originalConsoleError;
});

// Prevent focused tests slipping through
const blockFocus = (what) => {
  throw new Error(
    `[no-only-tests] Detected ${what}. Remove '.only' to maintain coverage.`,
  );
};

if (global.it) {
  Object.defineProperty(global.it, 'only', { get: () => blockFocus('it.only') });
}
if (global.describe) {
  Object.defineProperty(global.describe, 'only', {
    get: () => blockFocus('describe.only'),
  });
}

// Global test utilities
global.testUtils = {
  // Wait for condition with timeout
  waitFor: async (condition, timeout = 5000, interval = 100) => {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      if (await condition()) return true;
      await new Promise((resolve) => setTimeout(resolve, interval));
    }
    throw new Error(`Condition not met within ${timeout}ms`);
  },

  // Generate test IDs
  generateId: (prefix = 'test') =>
    `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,

  // Mock data generators
  mockEntity: (overrides = {}) => ({
    id: global.testUtils.generateId('entity'),
    type: 'TEST_ENTITY',
    label: 'Test Entity',
    props: { name: 'Test Entity', description: 'A test entity' },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  }),

  mockRelationship: (overrides = {}) => ({
    id: global.testUtils.generateId('rel'),
    from: global.testUtils.generateId('from'),
    to: global.testUtils.generateId('to'),
    type: 'TEST_RELATIONSHIP',
    props: { confidence: 0.8, source: 'test' },
    createdAt: new Date().toISOString(),
    ...overrides,
  }),

  mockUser: (overrides = {}) => ({
    id: global.testUtils.generateId('user'),
    email: `test_${Date.now()}@example.com`,
    name: 'Test User',
    role: 'analyst',
    createdAt: new Date().toISOString(),
    ...overrides,
  }),
};

// Error handling for unhandled rejections in tests
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
  jest.clearAllTimers();
});
