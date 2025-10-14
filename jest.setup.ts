import '@testing-library/jest-dom';
import 'jest-extended';

// Minimal shims for jsdom-based suites that expect browser-ish globals
const globalObj = globalThis || global || window;

Object.defineProperty(globalObj, 'crypto', {
  value: { randomUUID: () => '00000000-0000-4000-8000-000000000000' },
});
Object.assign(globalObj, {
  navigator: { clipboard: { writeText: jest.fn() } },
});

// Global test timeout and environment setup
jest.setTimeout(30000);

// Global environment variables for tests (Node.js environments)
if (typeof process !== 'undefined') {
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db';
  process.env.REDIS_URL = 'redis://localhost:6379/0';
  process.env.NEO4J_URI = 'bolt://localhost:7687';
  process.env.NEO4J_USER = 'neo4j';
  process.env.NEO4J_PASSWORD = 'test';
}

// Clear mocks between tests
beforeEach(() => {
  jest.clearAllMocks();
  jest.clearAllTimers();
});

// Mock ResizeObserver for tests (browser environments)
if (typeof window !== 'undefined' && !window.ResizeObserver) {
  window.ResizeObserver = class MockResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

// Mock IntersectionObserver for tests (browser environments)
if (typeof window !== 'undefined' && !window.IntersectionObserver) {
  window.IntersectionObserver = class MockIntersectionObserver {
    constructor() {}
    observe() {}
    unobserve() {}
    disconnect() {}
  } as any;
}

// Mock matchMedia for tests (browser environments)
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });
}