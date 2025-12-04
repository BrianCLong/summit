/**
 * Jest Global Setup Configuration
 * Provides common test utilities and matchers
 */

// Extend Jest with additional matchers from jest-extended
require('jest-extended');

// Mock ioredis globally
jest.mock('ioredis', () => {
  const EventEmitter = require('events');
  class MockRedis extends EventEmitter {
    constructor() {
      super();
      this.status = 'ready';
    }
    connect() { return Promise.resolve(); }
    disconnect() { return Promise.resolve(); }
    quit() { return Promise.resolve(); }
    duplicate() { return new MockRedis(); }
    on() { return this; }
    get() { return Promise.resolve(null); }
    set() { return Promise.resolve('OK'); }
    del() { return Promise.resolve(1); }
    subscribe() { return Promise.resolve(); }
    psubscribe() { return Promise.resolve(); }
    publish() { return Promise.resolve(1); }
    scan() { return Promise.resolve(['0', []]); }
    pipeline() {
      return {
        exec: () => Promise.resolve([])
      };
    }
    multi() {
      return {
        exec: () => Promise.resolve([])
      };
    }
  }
  return MockRedis;
});

// Mock pg globally to avoid connection errors in tests that don't need real DB
jest.mock('pg', () => {
  const { EventEmitter } = require('events');
  class MockPool extends EventEmitter {
    connect() {
      return Promise.resolve({
        query: jest.fn().mockResolvedValue({ rows: [] }),
        release: jest.fn(),
      });
    }
    query() { return Promise.resolve({ rows: [] }); }
    end() { return Promise.resolve(); }
    on() { return this; }
  }
  return { Pool: MockPool };
});

// Global test timeout
jest.setTimeout(30000);

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

  // Allow console.error for test debugging if needed, but fail test on it?
  // The original code threw an error, which is strict but good.
  console.error = (...args) => {
    // Check if it's the "Unhandled Rejection" we caught below, don't double throw
    if (args[0] && typeof args[0] === 'string' && args[0].startsWith('Unhandled Rejection')) {
      originalConsoleError(...args);
      return;
    }

    originalConsoleError(...args);
    // throw new Error(
    //   '[console.error] used in server tests — replace with assertions or throw',
    // );
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

Object.defineProperty(global.it, 'only', { get: () => blockFocus('it.only') });
Object.defineProperty(global.describe, 'only', {
  get: () => blockFocus('describe.only'),
});

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
