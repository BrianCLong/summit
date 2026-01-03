/**
 * Jest Global Setup Configuration
 * Provides common test utilities and matchers
 */

// Extend Jest with additional matchers from jest-extended
require('jest-extended');

require('dotenv').config({ path: './.env.test' });

// Global test timeout
jest.setTimeout(30000);

// Use Zero Footprint mode to avoid real DB connections by default
process.env.ZERO_FOOTPRINT = 'true';

// Mock required environment variables for config.ts validation
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgres://postgres:postgres@localhost:5432/intelgraph_test';
}
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  process.env.JWT_SECRET = 'test-jwt-secret-for-testing-only-must-be-32-chars';
}
if (!process.env.JWT_REFRESH_SECRET || process.env.JWT_REFRESH_SECRET.length < 32) {
  process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret-for-testing-only-32-chars';
}
if (!process.env.NEO4J_URI) process.env.NEO4J_URI = 'bolt://localhost:7687';
if (!process.env.NEO4J_USER) process.env.NEO4J_USER = 'neo4j';
if (!process.env.NEO4J_PASSWORD) process.env.NEO4J_PASSWORD = 'password';

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

// Mock apollo-server-express for ESM compatibility
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

// Mock IORedis globally to prevent connection errors
jest.mock('ioredis', () => {
  const EventEmitter = require('events');
  const subscribers = new Map();

  class MockRedis extends EventEmitter {
    constructor() {
      super();
      this.status = 'ready';
      setTimeout(() => this.emit('ready'), 0);
      setTimeout(() => this.emit('connect'), 0);
    }
    async connect() { return Promise.resolve(); }
    async disconnect() { return Promise.resolve(); }
    async quit() { return Promise.resolve(); }
    async get() { return null; }
    async set() { return 'OK'; }
    async del() { return 1; }
    async publish(channel, message) {
      if (subscribers.has(channel)) {
        subscribers.get(channel).forEach(client => {
          client.emit('message', channel, message);
        });
        return subscribers.get(channel).size;
      }
      return 0;
    }
    async subscribe(...channels) {
      channels.forEach(channel => {
        if (!subscribers.has(channel)) {
          subscribers.set(channel, new Set());
        }
        subscribers.get(channel).add(this);
      });
      return channels.length;
    }
    async unsubscribe(...channels) {
      channels.forEach(channel => {
        if (subscribers.has(channel)) {
          subscribers.get(channel).delete(this);
        }
      });
      return channels.length;
    }
    duplicate() { return new MockRedis(); }
    defineCommand() { }
  }
  return {
    __esModule: true,
    default: MockRedis,
  };
});

// Mock database config to bypass initialization checks
jest.mock('../../src/config/database', () => {
  const mockPool = {
    connect: jest.fn().mockResolvedValue({
      query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
      release: jest.fn(),
    }),
    query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
    on: jest.fn(),
    end: jest.fn(),
  };

  return {
    __esModule: true,
    connectPostgres: jest.fn().mockResolvedValue(mockPool),
    connectRedis: jest.fn(),
    connectNeo4j: jest.fn(),
    getPostgresPool: jest.fn().mockReturnValue(mockPool),
    getRedisClient: jest.fn().mockReturnValue({
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      keys: jest.fn().mockResolvedValue([]),
      mget: jest.fn().mockResolvedValue([]),
      quit: jest.fn(),
      disconnect: jest.fn(),
    }),
    getNeo4jDriver: jest.fn().mockReturnValue({
      session: () => ({
        run: jest.fn().mockResolvedValue({ records: [] }),
        close: jest.fn(),
      }),
      close: jest.fn(),
    }),
    closeConnections: jest.fn(),
  };
});

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

// Mock tracing service to avoid OTel initialization issues
jest.mock('../../src/observability/tracing', () => ({
  __esModule: true,
  otelService: {
    start: jest.fn(),
    shutdown: jest.fn(),
    createSpan: jest.fn(() => ({ end: jest.fn() })),
    getCurrentTraceContext: jest.fn(() => null),
    trace: jest.fn((name, fn) => fn({ end: jest.fn() })),
  },
  TracingService: jest.fn().mockImplementation(() => ({
    start: jest.fn(),
    shutdown: jest.fn(),
    createSpan: jest.fn(() => ({ end: jest.fn() })),
    trace: jest.fn((name, fn) => fn({ end: jest.fn() })),
  })),
}));

// Mock prom-client to prevent metric registration conflicts
jest.mock('prom-client', () => {
  const mockMetric = {
    inc: jest.fn(),
    dec: jest.fn(),
    set: jest.fn(),
    observe: jest.fn(),
    reset: jest.fn(),
    labels: jest.fn().mockReturnThis(),
    startTimer: jest.fn().mockReturnValue(jest.fn()),
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
    constructor() {
      this.metrics = {};
    }
    registerMetric() { }
    getSingleMetric() { return null; }
    getMetricsAsJSON() { return []; }
    metrics() { return ''; }
    clear() { }
    setDefaultLabels() { }
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

// Mock redis package to prevent real connections
jest.mock('redis', () => {
  const EventEmitter = require('events');

  class MockRedisClient extends EventEmitter {
    constructor() {
      super();
      this.status = 'ready';
      this.connected = true;
    }

    async connect() {
      this.status = 'ready';
      this.connected = true;
      this.emit('connect');
      this.emit('ready');
      return 'OK';
    }

    async disconnect() {
      this.status = 'end';
      this.connected = false;
      this.emit('end');
      return 'OK';
    }

    async get(key) {
      return null; // Always return null for testing
    }

    async set(key, value, opts = {}) {
      return 'OK';
    }

    async setEx(key, ttl, value) {
      return 'OK';
    }

    async setex(key, ttl, value) {
      return 'OK';
    }

    async incr(key) {
      return 1; // Always return 1 for rate limiting tests
    }

    async expire(key, ttl) {
      return 1;
    }

    async ttl(key) {
      return -1; // Negative means key doesn't exist or no expiry
    }

    async del(...keys) {
      return keys.length; // Return number of keys deleted
    }

    async keys(pattern) {
      return [];
    }

    async mget(...keys) {
      return keys.map(() => null);
    }

    async publish(channel, message) {
      return 1;
    }

    async subscribe(channel, listener) {
      // Mock subscription behavior
    }

    select() {
      return Promise.resolve('OK');
    }
  }

  const createClient = jest.fn(() => new MockRedisClient());

  return {
    createClient,
    default: {
      createClient,
    }
  };
});

// Import and use the metrics reset helper to clear the registry between tests
const { resetRegistry } = require('../../src/metrics/registry');  // Relative to test directory structure

// Implement network ban to prevent real network connections in tests
const originalNetConnect = require('net').connect;
const originalDnsResolve = require('dns').lookup;

// Store original methods to allow restore in afterAll
const originalMethods = {
  netConnect: originalNetConnect,
  dnsLookup: originalDnsResolve,
};

// Ban network connections during tests
beforeAll(() => {
  // Override net.connect to prevent TCP connections (includes Redis)
  jest.spyOn(require('net'), 'connect').mockImplementation((...args) => {
    const error = new Error(
      'Network connection attempt blocked in tests. ' +
      'All network connections must be mocked. ' +
      'Connection attempt details: ' + JSON.stringify(args)
    );
    error.name = 'NetworkConnectionBlockedError';
    throw error;
  });

  // Override DNS lookup to prevent DNS resolution (this helps catch Redis, DB, API calls)
  jest.spyOn(require('dns'), 'lookup').mockImplementation((hostname, options, callback) => {
    if (typeof options === 'function') {
      callback = options;
      options = {};
    }

    // Allow localhost for specific test utilities if needed (though ideally no network at all)
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      // Even localhost should typically be mocked, but we'll log a warning
      console.warn(`⚠️  Network connection to localhost attempted: ${hostname}. This should be mocked!`);
    }

    const error = new Error(
      `DNS lookup blocked in tests. All network calls must be mocked. Attempted to resolve: ${hostname}`
    );
    error.name = 'DnsLookupBlockedError';

    if (callback) {
      setImmediate(() => callback(error));
    } else {
      throw error;
    }
  });
});

// Clean up network bans
afterAll(() => {
  // Restore original methods
  try {
    if (originalMethods.netConnect) {
      require('net').connect = originalMethods.netConnect;
    }
    if (originalMethods.dnsLookup) {
      require('dns').lookup = originalMethods.dnsLookup;
    }
  } catch (e) {
    // Ignore errors during restore
  }
});

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
  jest.clearAllTimers();

  // Also try to reset the real registry if it exists (for cases where mocks didn't fully work)
  try {
    resetRegistry();
  } catch (error) {
    // Ignore errors if the module wasn't imported or doesn't exist
  }
});
