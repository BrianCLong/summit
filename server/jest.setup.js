/* eslint-env jest */
/* global jest */
// Global test setup
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-at-least-32-chars-long-for-safety';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-at-least-32-chars-long';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db';

// Mock node-fetch globally to avoid ESM issues
jest.mock('node-fetch', () => {
  const mockResponse = {
    ok: true,
    status: 200,
    statusText: 'OK',
    json: jest.fn(() => Promise.resolve({})),
    text: jest.fn(() => Promise.resolve('')),
    arrayBuffer: jest.fn(() => Promise.resolve(new ArrayBuffer(0))),
    headers: new Map(),
  };
  const mockFetch = jest.fn(() => Promise.resolve(mockResponse));
  mockFetch.default = mockFetch;
  mockFetch.Response = jest.fn(() => mockResponse);
  mockFetch.Headers = Map;
  return mockFetch;
});

// Mock OpenTelemetry auto-instrumentations to avoid ESM issues
jest.mock('@opentelemetry/auto-instrumentations-node', () => ({
  getNodeAutoInstrumentations: jest.fn(() => []),
}));

jest.mock('@opentelemetry/resource-detector-gcp', () => ({
  gcpDetector: { detect: jest.fn(() => Promise.resolve({})) },
}));

// Mock ioredis to avoid connection attempts during unit tests
jest.mock('ioredis', () => {
  const Redis = jest.fn().mockImplementation(() => ({
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
    exists: jest.fn().mockResolvedValue(0),
    hget: jest.fn().mockResolvedValue(null),
    hset: jest.fn().mockResolvedValue(1),
    hdel: jest.fn().mockResolvedValue(1),
    hexists: jest.fn().mockResolvedValue(0),
    hgetall: jest.fn().mockResolvedValue({}),
    publish: jest.fn().mockResolvedValue(1),
    subscribe: jest.fn().mockResolvedValue(1),
    on: jest.fn(),
    quit: jest.fn().mockResolvedValue('OK'),
    disconnect: jest.fn(),
    ping: jest.fn().mockResolvedValue('PONG'),
    flushall: jest.fn().mockResolvedValue('OK'),
    pipeline: jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue([]),
    }),
    multi: jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue([]),
    }),
  }));
  return {
    default: Redis,
    Redis,
  };
});

// Mock console.error to avoid noise but allow it to be spied on without throwing
// unless we want to enforce no console.error
const _originalConsoleError = console.error;
console.error = (..._args) => {
  // _originalConsoleError(..._args); // Uncomment to see errors
};
