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

// Mock console.error to avoid noise but allow it to be spied on without throwing
// unless we want to enforce no console.error
const _originalConsoleError = console.error;
console.error = (..._args) => {
  // _originalConsoleError(..._args); // Uncomment to see errors
};
