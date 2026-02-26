/**
 * Jest Global Setup Configuration for Integration Tests
 * Allows real database connections
 */

require('dotenv').config({ path: './.env.test' });

process.env.TZ = process.env.TZ || 'UTC';
process.env.NODE_ENV = 'test';

// Global test timeout
jest.setTimeout(30000);

const ciRetryTimes = Number(process.env.JEST_RETRY_TIMES || (process.env.CI ? '2' : '0'));
if (ciRetryTimes > 0 && typeof jest.retryTimes === 'function') {
  jest.retryTimes(ciRetryTimes, { logErrorsBeforeRetry: true });
}

// Ensure DB env vars are set (defaults for local dev if not present)
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgres://postgres:password@localhost:5432/intelgraph_test';
}
if (!process.env.NEO4J_URI) process.env.NEO4J_URI = 'bolt://localhost:7687';
if (!process.env.NEO4J_USER) process.env.NEO4J_USER = 'neo4j';
if (!process.env.NEO4J_PASSWORD) process.env.NEO4J_PASSWORD = 'password';
if (!process.env.REDIS_HOST) process.env.REDIS_HOST = 'localhost';
if (!process.env.REDIS_PORT) process.env.REDIS_PORT = '6379';

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  process.env.JWT_SECRET = 'test-jwt-secret-for-testing-only-must-be-32-chars';
}
if (!process.env.JWT_REFRESH_SECRET || process.env.JWT_REFRESH_SECRET.length < 32) {
  process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret-for-testing-only-32-chars';
}

const envSnapshot = { ...process.env };

// Mock node-fetch for ESM compatibility
jest.mock('node-fetch', () => ({
  __esModule: true,
  default: jest.fn(() => Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(''),
  })),
  Response: jest.fn(),
  Headers: jest.fn(),
  Request: jest.fn(),
}));

// Mock apollo-server-express
jest.mock('apollo-server-express', () => ({
  __esModule: true,
  ApolloServer: jest.fn().mockImplementation(() => ({
    start: jest.fn().mockResolvedValue(undefined),
    stop: jest.fn().mockResolvedValue(undefined),
    applyMiddleware: jest.fn(),
    executeOperation: jest.fn().mockResolvedValue({ data: {} }),
  })),
  AuthenticationError: class AuthenticationError extends Error {
    constructor(message) {
      super(message);
      this.name = 'AuthenticationError';
    }
  },
  ForbiddenError: class ForbiddenError extends Error {
    constructor(message) {
      super(message);
      this.name = 'ForbiddenError';
    }
  },
  gql: (strings) => strings.join(''),
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
    console.error = jest.fn();
  } else {
    // In debug mode, spy on console.error but still log it for easier debugging
    console.error = jest.fn((...args) => {
      originalConsoleError(...args);
    });
  }
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
global.testUtils = {
  waitFor: async (condition, timeout = 5000, interval = 100) => {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      if (await condition()) return true;
      await new Promise((resolve) => setTimeout(resolve, interval));
    }
    throw new Error(`Condition not met within ${timeout}ms`);
  },
  generateId: (prefix = 'test') =>
    `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
};

// Error handling
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Clean up after each test
afterEach(async () => {
  Object.keys(process.env).forEach((key) => {
    if (!(key in envSnapshot)) {
      delete process.env[key];
    }
  });
  Object.entries(envSnapshot).forEach(([key, value]) => {
    process.env[key] = value;
  });
  jest.useRealTimers();
  jest.restoreAllMocks();
  jest.clearAllMocks();
  jest.clearAllTimers();
});
