/**
 * Jest Test Setup
 *
 * Global setup for all tests including database mocking.
 */

import { jest } from '@jest/globals';

// Mock database connection
jest.mock('../src/db/connection.js', () => ({
  createPool: jest.fn(),
  getPool: jest.fn(() => ({
    query: jest.fn(),
    connect: jest.fn(),
    end: jest.fn(),
    totalCount: 5,
    idleCount: 3,
    waitingCount: 0,
  })),
  query: jest.fn(),
  getClient: jest.fn(),
  transaction: jest.fn(async (callback: (client: unknown) => Promise<unknown>) => {
    const mockClient = {
      query: jest.fn(),
      release: jest.fn(),
    };
    return callback(mockClient);
  }),
  healthCheck: jest.fn().mockResolvedValue({
    status: 'healthy',
    latency: 5,
    poolSize: 5,
    idleCount: 3,
    waitingCount: 0,
  }),
  closePool: jest.fn(),
}));

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '5432';
process.env.DB_NAME = 'test_db';
process.env.DB_USER = 'test';
process.env.DB_PASSWORD = 'test';

// Global test timeout
jest.setTimeout(30000);

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
});
