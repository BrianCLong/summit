/**
 * Jest Setup for E2E Tests
 * Configures test environment and adds custom matchers
 */

import { expect } from '@jest/globals';

// Extend Jest matchers if needed
// import 'jest-extended';

// Set default timeout for all tests
jest.setTimeout(120000);

// Global test hooks
beforeAll(async () => {
  console.log('🧪 Starting E2E test suite...');
});

afterAll(async () => {
  console.log('✅ E2E test suite completed');
});

// Silence console during tests (optional)
if (process.env.SILENT_TESTS === 'true') {
  global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    // Keep error for debugging
  };
}
