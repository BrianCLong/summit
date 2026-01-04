/**
 * Mock for otel.ts module for testing
 */

// Mock tracer that returns no-op functions
const mockSpan = {
  end: jest.fn(),
  setAttribute: jest.fn(),
  setStatus: jest.fn(),
  recordException: jest.fn(),
  isRecording: () => false,
};

const mockTracer = {
  startSpan: jest.fn(() => mockSpan),
  startActiveSpan: jest.fn((name: string, fn: (span: typeof mockSpan) => unknown) => fn(mockSpan)),
  createSpan: jest.fn(() => mockSpan),
  withSpan: jest.fn((span: unknown, fn: () => unknown) => fn()),
};

export const getTracer = jest.fn(() => mockTracer);

export async function startOtel(): Promise<void> {
  // No-op for tests
}

export function isOtelStarted() {
  return false;
}
