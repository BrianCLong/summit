import { Pool } from 'pg';
import { seedTestTenants, teardownTestTenants } from './helpers/testTenants';

const resolvedMock = (value: unknown) => jest.fn(async () => value);

const returnedMock = (value: unknown) => jest.fn(() => value);

// Setup test environment
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error';

// Database setup for tests
let testDbPool: Pool;

beforeAll(async () => {
  // Create test database connection
  testDbPool = new Pool({
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432'),
    database: process.env.POSTGRES_DB || 'intelgraph_test',
    user: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || 'test',
    max: 10,
    idleTimeoutMillis: 30000,
  });

  // Run migrations
  try {
    // Add migration logic here if needed
    console.log('Test database setup complete');
  } catch (error) {
    console.error('Failed to setup test database:', error);
    process.exit(1);
  }

  await seedTestTenants();
});

afterAll(async () => {
  // Clean up database connections
  if (testDbPool) {
    await testDbPool.end();
  }

  await teardownTestTenants();
});

beforeEach(() => {
  // Clear all mocks before each test
  jest.clearAllMocks();
});

afterEach(async () => {
  // Clean up test data after each test
  if (testDbPool) {
    try {
      // Clean test tables
      await testDbPool.query(
        'TRUNCATE TABLE cases, entities, comments, audit_logs RESTART IDENTITY CASCADE',
      );
    } catch (error) {
      console.warn('Failed to clean test data:', error);
    }
  }
});

// Global test utilities
global.testDb = testDbPool;

// Mock external services
jest.mock('../src/services/ExternalAPIService', () => ({
  ExternalAPIService: jest.fn().mockImplementation(() => ({
    sendSlackNotification: resolvedMock(true),
    createJiraIssue: resolvedMock({ id: 'JIRA-123' }),
    queryVirusTotal: resolvedMock({ malicious: false }),
  })),
}));

// Mock Redis
jest.mock('redis', () => ({
  createClient: jest.fn(() => ({
    connect: resolvedMock(undefined),
    disconnect: resolvedMock(undefined),
    get: resolvedMock(null),
    set: resolvedMock('OK'),
    del: resolvedMock(1),
    exists: resolvedMock(0),
    expire: resolvedMock(1),
  })),
}));

// Mock Neo4j
jest.mock('neo4j-driver', () => ({
  driver: jest.fn(() => ({
    session: jest.fn(() => ({
      run: resolvedMock({ records: [] }),
      close: resolvedMock(undefined),
    })),
    close: resolvedMock(undefined),
  })),
  auth: {
    basic: jest.fn(),
  },
}));

// Mock WebSocket
jest.mock('socket.io', () => ({
  Server: jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    emit: jest.fn(),
    to: returnedMock({
      emit: jest.fn(),
    }),
    close: jest.fn(),
  })),
}));

// Test data factories
export const createTestUser = (overrides = {}) => ({
  id: 'test-user-1',
  email: 'test@example.com',
  name: 'Test User',
  role: 'analyst',
  tenantId: 'test-tenant-1',
  ...overrides,
});

export const createTestCase = (overrides = {}) => ({
  id: 'test-case-1',
  title: 'Test Case',
  description: 'Test case description',
  status: 'active',
  priority: 'medium',
  assigneeId: 'test-user-1',
  tenantId: 'test-tenant-1',
  ...overrides,
});

export const createTestEntity = (overrides = {}) => ({
  id: 'test-entity-1',
  type: 'person',
  name: 'Test Entity',
  properties: { email: 'entity@example.com' },
  caseId: 'test-case-1',
  tenantId: 'test-tenant-1',
  ...overrides,
});

// Custom matchers
expect.extend({
  toBeValidUUID(received: string) {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const pass = uuidRegex.test(received);

    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid UUID`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid UUID`,
        pass: false,
      };
    }
  },

  toBeISODate(received: string) {
    const date = new Date(received);
    const pass = !isNaN(date.getTime()) && received === date.toISOString();

    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid ISO date`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid ISO date`,
        pass: false,
      };
    }
  },
});

// Declare global types
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidUUID(): R;
      toBeISODate(): R;
    }
  }

  var testDb: Pool;
}
