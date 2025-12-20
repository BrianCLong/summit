/**
 * Jest setup file for GraphQL governance tests
 *
 * Runs before each test suite to set up global test environment
 */

import * as path from 'path';
import * as fs from 'fs/promises';

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error'; // Reduce noise in test output

// Global test timeout
jest.setTimeout(10000);

// Global beforeAll hook
beforeAll(async () => {
  // Ensure test directories exist
  const testDirs = [
    path.join(__dirname, 'tmp'),
    path.join(__dirname, 'fixtures'),
  ];

  for (const dir of testDirs) {
    await fs.mkdir(dir, { recursive: true }).catch(() => {});
  }
});

// Global afterAll hook
afterAll(async () => {
  // Cleanup test directories
  const testDirs = [
    path.join(__dirname, 'tmp'),
  ];

  for (const dir of testDirs) {
    await fs.rm(dir, { recursive: true, force: true }).catch(() => {});
  }
});

// Add custom matchers if needed
expect.extend({
  toBeValidGraphQL(received: string) {
    const { buildSchema } = require('graphql');

    try {
      buildSchema(received);
      return {
        message: () => `expected ${received} not to be valid GraphQL`,
        pass: true,
      };
    } catch (error) {
      return {
        message: () => `expected ${received} to be valid GraphQL: ${error}`,
        pass: false,
      };
    }
  },
});

// Extend Jest matchers type
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidGraphQL(): R;
    }
  }
}
