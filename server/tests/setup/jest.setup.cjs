/**
 * Jest Global Setup Configuration
 * Provides common test utilities and matchers
 */

// Extend Jest with additional matchers from jest-extended
// require('jest-extended'); // Handled by jest.config.ts via jest-extended/all

require('dotenv').config({ path: './.env.test' });

// Global test timeout
jest.setTimeout(30000);

const sanitizeForConsole = (value, seen = new WeakSet()) => {
  if (typeof value === 'bigint') return value.toString();
  if (Array.isArray(value)) return value.map((item) => sanitizeForConsole(item, seen));
  if (value && typeof value === 'object') {
    if (seen.has(value)) return '[Circular]';
    seen.add(value);
    return Object.fromEntries(
      Object.entries(value).map(([key, val]) => [key, sanitizeForConsole(val, seen)]),
    );
  }
  return value;
};

const wrapConsole = (method) => (...args) => method(...args.map((arg) => sanitizeForConsole(arg)));
['log', 'info', 'warn', 'error'].forEach((name) => {
  if (typeof console[name] === 'function') {
    console[name] = wrapConsole(console[name].bind(console));
  }
});

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

// Mock pg globally to avoid real database connections
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
  return { Client: MockClient, Pool: MockPool };
});

// Mock neo4j-driver globally to prevent real driver initialization
jest.mock('neo4j-driver', () => {
  const mockSession = () => ({
    run: jest.fn().mockResolvedValue({ records: [] }),
    close: jest.fn().mockResolvedValue(undefined),
  });
  const mockDriver = () => ({
    session: jest.fn(() => mockSession()),
    close: jest.fn().mockResolvedValue(undefined),
  });
  return {
    __esModule: true,
    default: {
      driver: jest.fn(() => mockDriver()),
      auth: { basic: jest.fn() },
      int: (value) => value,
    },
    driver: jest.fn(() => mockDriver()),
    auth: { basic: jest.fn() },
    int: (value) => value,
  };
});

// Mock IORedis globally to prevent connection errors
jest.mock('ioredis', () => {
  const EventEmitter = require('events');
  const subscribers = new Map();
  const streams = new Map();
  let streamIdCounter = 0;

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
    async setex() { return 'OK'; }
    async del() { return 1; }
    async exists() { return 0; }
    async info() { return 'redis_version:7.0.0'; }
    async smembers() { return []; }
    async zadd() { return 1; }
    async zrange() { return []; }
    async zrevrange() { return []; }
    async zremrangebyrank() { return 0; }
    async xgroup() { return 'OK'; }
    async xadd(stream, ...args) {
      if (!streams.has(stream)) streams.set(stream, []);
      const id = `${Date.now()}-${streamIdCounter++}`;
      const starIndex = args.indexOf('*');
      const fields = starIndex >= 0 ? args.slice(starIndex + 1) : args;
      streams.get(stream).push([id, fields]);
      return id;
    }
    async xrange(stream, _start, _end, ...args) {
      const entries = streams.get(stream) || [];
      const countIndex = args.indexOf('COUNT');
      const count = countIndex >= 0 ? Number(args[countIndex + 1]) : entries.length;
      return entries.slice(0, count);
    }
    async xrevrange(stream, _start, _end, ...args) {
      const entries = streams.get(stream) || [];
      const countIndex = args.indexOf('COUNT');
      const count = countIndex >= 0 ? Number(args[countIndex + 1]) : entries.length;
      return [...entries].reverse().slice(0, count);
    }
    async xreadgroup() { return []; }
    async xack() { return 1; }
    async xinfo() {
      return [
        'length', 10,
        'first-entry', ['123-0', ['data', 'test']],
        'last-entry', ['456-0', ['data', 'test']],
        'groups', 1,
        'last-generated-id', '456-0',
      ];
    }
    pipeline() {
      const queued = [];
      return {
        xadd: (...args) => {
          queued.push(() => this.xadd(args[0], ...args.slice(1)));
          return this;
        },
        exec: async () => queued.map(() => [null, 'OK']),
      };
    }
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
    Redis: MockRedis,
  };
});

// Mock config/logger removed to use moduleNameMapper and tests/mocks/logger.ts
// Mock OCREngine to avoid pino import issues and external dependencies
jest.mock('../../src/ai/engines/OCREngine.js', () => ({
  __esModule: true,
  OCREngine: jest.fn().mockImplementation(() => ({
    initialize: jest.fn().mockResolvedValue(undefined),
    shutdown: jest.fn().mockResolvedValue(undefined),
    isReady: jest.fn().mockReturnValue(true),
    extractText: jest.fn().mockResolvedValue([]),
  })),
  default: jest.fn().mockImplementation(() => ({
    initialize: jest.fn().mockResolvedValue(undefined),
    shutdown: jest.fn().mockResolvedValue(undefined),
    isReady: jest.fn().mockReturnValue(true),
    extractText: jest.fn().mockResolvedValue([]),
  })),
}));

// Mock middleware/audit-logger
jest.mock('../../src/middleware/audit-logger', () => ({
  __esModule: true,
  auditLogger: (req, res, next) => next(),
  createAuditLogger: () => (req, res, next) => next(),
  logAuditEvent: jest.fn().mockResolvedValue(undefined),
}));

// Mock utils/audit
jest.mock('../../src/utils/audit', () => ({
  __esModule: true,
  writeAudit: jest.fn().mockResolvedValue(undefined),
  deepDiff: jest.fn().mockReturnValue({}),
  signPayload: jest.fn().mockReturnValue('mock-signature'),
}));

// Mock db/neo4j module to provide 'neo' export
jest.mock('../../src/db/neo4j', () => {
  const mockSession = {
    run: jest.fn().mockResolvedValue({ records: [] }),
    close: jest.fn().mockResolvedValue(undefined),
    beginTransaction: () => ({
      run: jest.fn().mockResolvedValue({ records: [] }),
      commit: jest.fn().mockResolvedValue(undefined),
      rollback: jest.fn().mockResolvedValue(undefined),
    }),
  };

  const mockDriver = {
    session: () => mockSession,
    close: jest.fn().mockResolvedValue(undefined),
    verifyConnectivity: jest.fn().mockResolvedValue(undefined),
  };

  return {
    __esModule: true,
    initializeNeo4jDriver: jest.fn().mockResolvedValue(undefined),
    getNeo4jDriver: jest.fn().mockReturnValue(mockDriver),
    isNeo4jMockMode: jest.fn().mockReturnValue(true),
    closeNeo4jDriver: jest.fn().mockResolvedValue(undefined),
    onNeo4jDriverReady: jest.fn(),
    neo: {
      session: () => mockSession,
      run: jest.fn().mockResolvedValue({ records: [] }),
    },
    instrumentSession: jest.fn((session) => session),
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

// Mock BullMQ to prevent Queue/Worker initialization at module load
jest.mock('bullmq', () => {
  class MockQueue {
    constructor(name, opts) {
      this.name = name;
      this.opts = opts;
    }
    async add() { return { id: 'mock-job-id' }; }
    async count() { return 0; }
    async getJobCounts() { return { waiting: 0, active: 0, completed: 0, failed: 0 }; }
    async close() { return Promise.resolve(); }
    async obliterate() { return Promise.resolve(); }
    on() { return this; }
    off() { return this; }
  }

  class MockWorker {
    constructor(name, processor, opts) {
      this.name = name;
      this.processor = processor;
      this.opts = opts;
    }
    async close() { return Promise.resolve(); }
    on() { return this; }
    off() { return this; }
  }

  class MockJob {
    constructor(data) {
      this.id = 'mock-job-id';
      this.data = data;
    }
    async updateProgress() { return Promise.resolve(); }
  }

  return {
    __esModule: true,
    Queue: MockQueue,
    Worker: MockWorker,
    Job: MockJob,
    QueueEvents: jest.fn().mockImplementation(() => ({
      on: jest.fn(),
      close: jest.fn(),
    })),
  };
});

// Mock node-cron to prevent cron jobs from starting
jest.mock('node-cron', () => ({
  __esModule: true,
  default: {
    schedule: jest.fn(() => ({
      start: jest.fn(),
      stop: jest.fn(),
      destroy: jest.fn(),
    })),
    validate: jest.fn(() => true),
  },
  schedule: jest.fn(() => ({
    start: jest.fn(),
    stop: jest.fn(),
    destroy: jest.fn(),
  })),
  validate: jest.fn(() => true),
}));

// Mock socket.io to prevent WebSocket server initialization
jest.mock('socket.io', () => {
  const EventEmitter = require('events');

  class MockServer extends EventEmitter {
    constructor() {
      super();
      this.sockets = new MockNamespace();
    }
    use() { return this; }
    on() { return this; }
    emit() { return this; }
    to() { return this; }
    in() { return this; }
    close(callback) {
      if (callback) callback();
      return this;
    }
    listen() { return this; }
  }

  class MockNamespace extends EventEmitter {
    constructor() {
      super();
      this.adapter = { rooms: new Map() };
    }
    emit() { return this; }
    to() { return this; }
    in() { return this; }
  }

  class MockSocket extends EventEmitter {
    constructor() {
      super();
      this.id = 'mock-socket-id';
      this.rooms = new Set();
    }
    join() { return this; }
    leave() { return this; }
    emit() { return this; }
    disconnect() { return this; }
  }

  return {
    __esModule: true,
    Server: MockServer,
    Socket: MockSocket,
  };
});

// Mock kafkajs to prevent Kafka client initialization
jest.mock('kafkajs', () => {
  class MockProducer {
    async connect() { return Promise.resolve(); }
    async disconnect() { return Promise.resolve(); }
    async send() { return Promise.resolve(); }
    on() { return this; }
  }

  class MockConsumer {
    async connect() { return Promise.resolve(); }
    async disconnect() { return Promise.resolve(); }
    async subscribe() { return Promise.resolve(); }
    async run() { return Promise.resolve(); }
    on() { return this; }
  }

  class MockAdmin {
    async connect() { return Promise.resolve(); }
    async disconnect() { return Promise.resolve(); }
    async createTopics() { return Promise.resolve(); }
    async deleteTopics() { return Promise.resolve(); }
  }

  class MockKafka {
    producer() { return new MockProducer(); }
    consumer() { return new MockConsumer(); }
    admin() { return new MockAdmin(); }
  }

  return {
    __esModule: true,
    Kafka: MockKafka,
    Producer: MockProducer,
    Consumer: MockConsumer,
    Admin: MockAdmin,
  };
});

// Mock ws (WebSocket) to prevent WebSocket server initialization
jest.mock('ws', () => {
  const EventEmitter = require('events');

  class MockWebSocket extends EventEmitter {
    constructor(url, opts) {
      super();
      this.url = url;
      this.readyState = 1; // OPEN
      setTimeout(() => this.emit('open'), 0);
    }
    send(data, callback) {
      if (callback) callback();
    }
    close() {
      this.emit('close');
    }
    terminate() { }
  }

  class MockWebSocketServer extends EventEmitter {
    constructor(opts) {
      super();
      this.clients = new Set();
    }
    close(callback) {
      if (callback) callback();
    }
    handleUpgrade() { }
  }

  MockWebSocket.Server = MockWebSocketServer;
  MockWebSocketServer.prototype.WebSocket = MockWebSocket;

  return {
    __esModule: true,
    default: MockWebSocket,
    WebSocket: MockWebSocket,
    WebSocketServer: MockWebSocketServer,
    Server: MockWebSocketServer,
  };
});

// Mock prom-client to prevent metric registration conflicts
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
    observe() { },
    reset() {
      this.__value = 0;
    },
    get() {
      return { values: [{ value: this.__value }] };
    },
    labels() {
      return this;
    },
    startTimer: () => () => { },
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
      this._metrics = {};
    }
    registerMetric() { }
    getSingleMetric() { return null; }
    getMetricsAsJSON() { return []; }
    metrics() { return ''; }
    clear() { }
    setDefaultLabels() { }
    resetMetrics() { }
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


// Cleanup registry for managing open handles
const cleanupRegistry = {
  resources: new Set(),
  register(resource, cleanup) {
    const entry = { resource, cleanup };
    this.resources.add(entry);
    return () => this.resources.delete(entry);
  },
  async cleanupAll() {
    const promises = [];
    for (const entry of this.resources) {
      try {
        const result = entry.cleanup();
        if (result instanceof Promise) {
          promises.push(result.catch(e => console.error('Cleanup error:', e)));
        }
      } catch (e) {
        console.error('Cleanup error:', e);
      }
    }
    await Promise.all(promises);
    this.resources.clear();
  }
};

// Export cleanup utilities for tests
global.testCleanup = {
  // Register a resource for cleanup at end of test
  register: (resource, cleanup) => cleanupRegistry.register(resource, cleanup),

  // Register a server for cleanup
  registerServer: (server) => {
    return cleanupRegistry.register(server, () => {
      return new Promise((resolve) => {
        server.close(() => resolve());
        // Force resolve after timeout to prevent hanging
        setTimeout(resolve, 1000);
      });
    });
  },

  // Register a timer for cleanup
  registerTimer: (timerId) => {
    return cleanupRegistry.register(timerId, () => {
      clearTimeout(timerId);
      clearInterval(timerId);
    });
  },

  // Register a connection for cleanup
  registerConnection: (conn, closeMethod = 'close') => {
    return cleanupRegistry.register(conn, () => {
      if (conn && typeof conn[closeMethod] === 'function') {
        return conn[closeMethod]();
      }
    });
  },
};

// Mock SecretAuditLogger using __mocks__ directory
jest.mock('../../lib/security/secret-audit-logger');

// Clean up after each test
afterEach(async () => {
  jest.clearAllMocks();
  jest.clearAllTimers();
  await cleanupRegistry.cleanupAll();
});
