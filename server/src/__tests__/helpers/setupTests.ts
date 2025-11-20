/**
 * Global test setup
 * Runs before all tests to configure the test environment
 */

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.NEO4J_URI = 'bolt://localhost:7687';
process.env.NEO4J_USER = 'neo4j';
process.env.NEO4J_PASSWORD = 'testpassword';
process.env.POSTGRES_HOST = 'localhost';
process.env.POSTGRES_PORT = '5432';
process.env.POSTGRES_DB = 'test_db';
process.env.POSTGRES_USER = 'test_user';
process.env.POSTGRES_PASSWORD = 'testpassword';
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key-for-testing-only';
process.env.REQUIRE_REAL_DBS = 'false'; // Use mocks by default in tests
process.env.LOG_LEVEL = 'silent'; // Suppress logs during tests
process.env.CORS_ORIGIN = 'http://localhost:3000';

// Increase test timeout for integration tests
jest.setTimeout(10000);

// Mock console methods to keep test output clean
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Global test utilities
declare global {
  namespace NodeJS {
    interface Global {
      __TEST_ENV__: string;
    }
  }
}

(global as any).__TEST_ENV__ = 'jest';

// Clean up after all tests
afterAll(async () => {
  // Close any open connections
  // This will be populated as we add more integration tests
});

export {};
