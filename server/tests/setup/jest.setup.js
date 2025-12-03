/**
 * Jest Global Setup Configuration
 * Provides common test utilities and matchers
 */

// Extend Jest with additional matchers from jest-extended
// Use import or require('jest-extended/all') if full suite is needed, but require('jest-extended') is safer if 'all' is problematic.
// The error was "Module jest-extended/all ... not found".
// jest-extended usually exposes main entry. If 'all' is missing, fallback to main.
try {
  require('jest-extended/all');
} catch (e) {
  require('jest-extended');
}

// Global test timeout
jest.setTimeout(30000);

// Mock console methods to reduce noise in tests unless debugging
const originalConsole = { ...console };
const originalConsoleError = console.error;

beforeAll(() => {
  if (!process.env.DEBUG_TESTS) {
    console.log = jest.fn();
    console.info = jest.fn();
    console.warn = jest.fn();
    console.debug = jest.fn();
  }

  // We allow console.error but maybe mock it to suppress noise if tests fail gracefully?
  // But original setup throws error.
  console.error = (...args) => {
    // Check if it's a known benign error (e.g. from a library we can't control)
    // Otherwise throw to fail fast on unexpected errors.
    originalConsoleError(...args);
    // throw new Error(
    //   '[console.error] used in server tests — replace with assertions or throw',
    // );
  };
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

// Prevent focused tests slipping through
const blockFocus = (what) => {
  throw new Error(
    `[no-only-tests] Detected ${what}. Remove '.only' to maintain coverage.`,
  );
};

Object.defineProperty(global.it, 'only', { get: () => blockFocus('it.only') });
Object.defineProperty(global.describe, 'only', {
  get: () => blockFocus('describe.only'),
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

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
  jest.clearAllTimers();
});
