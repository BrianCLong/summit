/**
 * Jest Test Setup
 */

// Increase timeout for integration tests
jest.setTimeout(30000);

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'silent';
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '5432';
process.env.DB_NAME = 'intelgraph_test';
process.env.DB_USER = 'postgres';
process.env.DB_PASSWORD = 'postgres';

// Global test utilities
global.console = {
  ...console,
  // Suppress console logs during tests unless explicitly needed
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};
