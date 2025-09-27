/**
 * Jest Global Setup Configuration
 * Provides common test utilities and matchers
 */

console.log('jest.setup.js loaded');

// Extend Jest with additional matchers from jest-extended
require('jest-extended');

// Global test timeout
jest.setTimeout(30000);

// Mock console methods to reduce noise in tests unless debugging
const originalConsole = { ...console };

beforeAll(() => {
  if (!process.env.DEBUG_TESTS) {
    console.log = jest.fn();
    console.info = jest.fn();
    console.warn = jest.fn();
    console.debug = jest.fn();
    // Keep console.error for debugging test failures
  }
});

afterAll(() => {
  if (!process.env.DEBUG_TESTS) {
    console.log = originalConsole.log;
    console.info = originalConsole.info;
    console.warn = originalConsole.warn;
    console.debug = originalConsole.debug;
  }
});

// Global test utilities
global.testUtils = {
  // Wait for condition with timeout
  waitFor: async (condition, timeout = 5000, interval = 100) => {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      if (await condition()) return true;
      await new Promise(resolve => setTimeout(resolve, interval));
    }
    throw new Error(`Condition not met within ${timeout}ms`);
  },
  
  // Generate test IDs
  generateId: (prefix = 'test') => `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  
  // Mock data generators
  mockEntity: (overrides = {}) => ({
    id: global.testUtils.generateId('entity'),
    type: 'TEST_ENTITY',
    label: 'Test Entity',
    props: { name: 'Test Entity', description: 'A test entity' },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides
  }),
  
  mockRelationship: (overrides = {}) => ({
    id: global.testUtils.generateId('rel'),
    from: global.testUtils.generateId('from'),
    to: global.testUtils.generateId('to'),
    type: 'TEST_RELATIONSHIP',
    props: { confidence: 0.8, source: 'test' },
    createdAt: new Date().toISOString(),
    ...overrides
  }),
  
  mockUser: (overrides = {}) => ({
    id: global.testUtils.generateId('user'),
    email: `test_${Date.now()}@example.com`,
    name: 'Test User',
    role: 'analyst',
    createdAt: new Date().toISOString(),
    ...overrides
  })
};

// Error handling for unhandled rejections in tests
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
  jest.clearAllTimers();
});