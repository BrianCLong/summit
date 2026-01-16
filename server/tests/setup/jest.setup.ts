/**
 * Jest Global Setup Configuration
 * Provides common test utilities and matchers
 */

import 'jest-extended';

// Mock ioredis globally - using a simple mock implementation since module resolution fails
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
}, { virtual: true });

// Mock pg globally to avoid connection errors in tests that don't need real DB
jest.mock('pg', () => {
  const { EventEmitter } = require('events');
  class MockClient extends EventEmitter {
    connect() { return Promise.resolve(); }
    query() { return Promise.resolve({ rows: [], rowCount: 0 }); }
    end() { return Promise.resolve(); }
  }
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
  return { Pool: MockPool, Client: MockClient };
});

// Mock fluent-ffmpeg globally
jest.mock('fluent-ffmpeg', () => {
  const ffmpeg = jest.fn(() => {
    return {
      seekInput: jest.fn().mockReturnThis(),
      duration: jest.fn().mockReturnThis(),
      fps: jest.fn().mockReturnThis(),
      addOption: jest.fn().mockReturnThis(),
      output: jest.fn().mockReturnThis(),
      noVideo: jest.fn().mockReturnThis(),
      audioCodec: jest.fn().mockReturnThis(),
      on: jest.fn().mockReturnThis(),
      run: jest.fn(),
      save: jest.fn(),
      toFormat: jest.fn().mockReturnThis(),
      input: jest.fn().mockReturnThis(),
      inputFormat: jest.fn().mockReturnThis(),
      inputOptions: jest.fn().mockReturnThis(),
      outputOptions: jest.fn().mockReturnThis(),
      videoCodec: jest.fn().mockReturnThis(),
      format: jest.fn().mockReturnThis(),
      pipe: jest.fn(),
    };
  }) as any;
  ffmpeg.setFfmpegPath = jest.fn();
  ffmpeg.setFfprobePath = jest.fn();
  ffmpeg.ffprobe = jest.fn();
  return ffmpeg;
});

// Mock src/config/logger.js to provide a proper logger instance
jest.mock('/Users/brianlong/Developer/summit/server/src/config/logger.js', () => {
  const loggerMock = require('../mocks/logger.cjs');
  return {
    logger: loggerMock.logger || loggerMock,
    __esModule: true,
  };
}, { virtual: false });

// Global test timeout
jest.setTimeout(30000);

// Mock console methods to reduce noise in tests unless debugging
const originalConsole = { ...console };
const originalConsoleError = console.error;

beforeAll(() => {
  if (!process.env.DEBUG_TESTS) {
    console.log = jest.fn() as typeof console.log;
    console.info = jest.fn() as typeof console.info;
    console.warn = jest.fn() as typeof console.warn;
    console.debug = jest.fn() as typeof console.debug;
  }

  console.error = (...args: unknown[]): void => {
    // Check if it's the "Unhandled Rejection" we caught below, don't double throw
    if (args[0] && typeof args[0] === 'string' && args[0].startsWith('Unhandled Rejection')) {
      originalConsoleError(...args);
      return;
    }
    originalConsoleError(...args);
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

// Global test utilities
(global as any).testUtils = {
  // Wait for condition with timeout
  waitFor: async (condition: () => Promise<boolean> | boolean, timeout = 5000, interval = 100) => {
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
    id: (global as any).testUtils.generateId('entity'),
    type: 'TEST_ENTITY',
    label: 'Test Entity',
    props: { name: 'Test Entity', description: 'A test entity' },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  }),

  mockRelationship: (overrides = {}) => ({
    id: (global as any).testUtils.generateId('rel'),
    from: (global as any).testUtils.generateId('from'),
    to: (global as any).testUtils.generateId('to'),
    type: 'TEST_RELATIONSHIP',
    props: { confidence: 0.8, source: 'test' },
    createdAt: new Date().toISOString(),
    ...overrides,
  }),

  mockUser: (overrides = {}) => ({
    id: (global as any).testUtils.generateId('user'),
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
