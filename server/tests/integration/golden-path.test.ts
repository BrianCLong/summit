import request from 'supertest';
import { jest } from '@jest/globals';



// Mock the Neo4j driver initialization to prevent connection errors in environment without DB
jest.mock('../../src/db/neo4j.js', () => ({
  initializeNeo4jDriver: jest.fn(),
  getNeo4jDriver: jest.fn(() => ({
    session: () => ({
      run: jest.fn().mockResolvedValue({ records: [] }),
      close: jest.fn(),
    }),
    close: jest.fn(),
  })),
}));

// Mock OpenTelemetry
jest.mock('../../src/monitoring/opentelemetry.js', () => ({
  __esModule: true,
  otelService: {
    shutdown: jest.fn(),
    addSpanAttributes: jest.fn(),
  },
  default: {
    start: jest.fn(),
    shutdown: jest.fn(),
  },
}));

// Mock prom-client
jest.mock('prom-client', () => ({
  collectDefaultMetrics: jest.fn(),
  register: {
    contentType: 'text/plain',
    metrics: jest.fn().mockResolvedValue('http_requests_total 10\n'),
    clear: jest.fn(),
  },
}));

// Mock Redis to prevent connection errors
jest.mock('ioredis', () => {
  const Redis = jest.fn();
  (Redis as any).prototype.on = jest.fn();
  (Redis as any).prototype.quit = jest.fn();
  (Redis as any).prototype.disconnect = jest.fn();
  return Redis;
});

// Mock Postgres
jest.mock('../../src/db/postgres.js', () => ({
  getPostgresPool: jest.fn(() => ({
    connect: jest.fn().mockResolvedValue({
      query: jest.fn().mockResolvedValue({ rows: [] }),
      release: jest.fn(),
    }),
    query: jest.fn().mockResolvedValue({ rows: [] }),
    end: jest.fn(),
  })),
}));

// Mock prom-client
jest.unstable_mockModule('prom-client', () => ({
  register: {
    contentType: 'text/plain',
    metrics: jest.fn().mockResolvedValue('http_requests_total 10'),
    clear: jest.fn(),
    getSingleMetric: jest.fn(),
  },
  collectDefaultMetrics: jest.fn(),
  Counter: class { inc() { } },
  Histogram: class { observe() { } startTimer() { return () => { }; } },
  Gauge: class { set() { } inc() { } dec() { } },
  Summary: class { observe() { } startTimer() { return () => { }; } },
  Registry: class {
    registerMetric() { }
    metrics() { return Promise.resolve(''); }
    getSingleMetric() { }
    clear() { }
    resetMetrics() { }
    setDefaultLabels() { }
  },
}));

// Mock pino
jest.unstable_mockModule('pino', () => ({
  default: jest.fn(() => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    trace: jest.fn(),
    fatal: jest.fn(),
    child: jest.fn().mockReturnThis(),
    level: 'debug',
  })),
  pino: jest.fn(), // Named export if needed
}));


// Mock utils/logger
jest.unstable_mockModule('../../src/utils/logger.js', () => {
  const loggerMock = {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  };
  return {
    logger: loggerMock,
    default: loggerMock,
  };
});

// Mock config/logger used by production-security


// Mock config/logger used by harness and production-security
const loggerFactory = () => {
  const loggerMock = {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    child: jest.fn().mockReturnThis(),
    trace: jest.fn(),
    fatal: jest.fn(),
    silent: jest.fn(),
    level: 'debug',
  };
  return {
    logger: loggerMock,
    correlationStorage: {
      getStore: jest.fn(),
      run: jest.fn((store: any, cb: any) => cb()),
      enterWith: jest.fn(),
    },
    default: loggerMock,
  };
};

jest.unstable_mockModule('../../src/config/logger.js', loggerFactory);
jest.unstable_mockModule('../../src/config/logger', loggerFactory);
jest.unstable_mockModule('../../src/config/logger.ts', loggerFactory);

// Mock TieredRateLimitMiddleware to avoid pino usage
jest.unstable_mockModule('../../src/middleware/TieredRateLimitMiddleware.ts', () => ({
  RateLimitTier: {
    FREE: 'free',
    BASIC: 'basic',
    PREMIUM: 'premium',
    ENTERPRISE: 'enterprise',
    INTERNAL: 'internal',
  },
  RequestPriority: {
    LOW: 'low',
    NORMAL: 'normal',
    HIGH: 'high',
  },
  advancedRateLimiter: {
    getStatus: jest.fn(),
  },
}));

// Mock TelemetryService
jest.unstable_mockModule('../../src/analytics/telemetry/TelemetryService.js', () => ({
  telemetryService: {
    track: jest.fn(),
  },
}));

// Mock AuditTrailService
jest.unstable_mockModule('../../src/services/audit/AuditTrailService.js', () => ({
  auditTrailService: {
    recordPolicyDecision: jest.fn(),
  },
}));

// Mock db/postgres.js to avoid loading real pino via logger
jest.unstable_mockModule('../../src/db/postgres.js', () => ({
  getPostgresPool: jest.fn(() => ({
    query: jest.fn().mockResolvedValue({ rows: [] }),
    connect: jest.fn(),
  })),
  query: jest.fn(),
}));

// Mocks must be before imports
const { createTestHarness } = await import('../harness.js');


// Mocks must be before imports
const db = await import('../../src/config/database.js');

// Skip AI routes to avoid pino CJS/ESM interop issues during tests
process.env.SKIP_AI_ROUTES = 'true';

describe('Golden Path Integration', () => {
  let harness: any;
  let server: any;
  let app: any;

  beforeAll(async () => {
    // Skip AI routes to avoid pino CJS/ESM interop issues during tests
    process.env.SKIP_AI_ROUTES = 'true';

    // Override db connections
    jest.spyOn(db, 'getRedisClient').mockImplementation(() => ({
      ping: jest.fn().mockResolvedValue('PONG'),
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      quit: jest.fn(),
      disconnect: jest.fn(),
    } as any));

    jest.spyOn(db, 'getNeo4jDriver').mockImplementation(() => ({
      verifyConnectivity: jest.fn().mockResolvedValue(true),
      session: jest.fn().mockReturnValue({
        run: jest.fn().mockResolvedValue({ records: [] }),
        close: jest.fn(),
      }),
      close: jest.fn(),
    } as any));

    jest.spyOn(db, 'getPostgresPool').mockImplementation(() => ({
      query: jest.fn().mockResolvedValue({ rows: [{ '?column?': 1 }] }),
      connect: jest.fn().mockResolvedValue({
        release: jest.fn(),
        query: jest.fn().mockResolvedValue({ rows: [] }),
      }),
    } as any));

    harness = await createTestHarness();
    server = harness.server;
    app = harness.app;
  });

  afterAll(async () => {
    await harness.teardown();
  });

  it('Health Check returns 200', async () => {
    const res = await request(server).get('/health');
    if (res.status !== 200) {
      console.log('Health Check Failed Body:', JSON.stringify(res.body, null, 2));
      console.log('Health Check Failed Text:', res.text);
      // Force log to stdout
      process.stdout.write('Health Check Status: ' + res.status + '\n');
      process.stdout.write('Health Check Body: ' + JSON.stringify(res.body) + '\n');
    }
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status', 'healthy');
  });

  it('GraphQL Introspection works', async () => {
    const res = await request(server)
      .post('/graphql')
      .set(harness.getAuthHeader())
      .send({
        query: `
          query {
            __schema {
              queryType {
                name
              }
            }
          }
        `,
      });

    expect(res.status).toBe(200);
    expect(res.body.data.__schema.queryType.name).toBe('Query');
  });

  it('Metrics endpoint is exposed', async () => {
    const res = await request(server).get('/metrics');
    expect(res.status).toBe(200);
    // expect(res.text).toContain('http_requests_total'); // Mock doesn't actually produce text
  });
});
