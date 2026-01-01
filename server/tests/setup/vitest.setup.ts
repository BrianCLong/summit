// server/tests/setup/vitest.setup.ts

// Assume globals are enabled (vi, beforeEach, afterEach are available globally)

// Mock process.env variables if needed
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret';
process.env.PORT = '4000';

// Mock Redis to prevent connection attempts
vi.mock('ioredis', () => {
  const RedisMock = vi.fn(() => ({
    connect: vi.fn(),
    disconnect: vi.fn(),
    quit: vi.fn(),
    on: vi.fn(),
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
    publish: vi.fn(),
    subscribe: vi.fn(),
    duplicate: vi.fn(() => new RedisMock()),
    // Add other used methods
  }));
  return { default: RedisMock };
});

// Mock prom-client to prevent "Metric already registered" errors
vi.mock('prom-client', async (importOriginal) => {
  const actual = await importOriginal();

  // Create mock implementations
  const mockInc = vi.fn();
  const mockCounter = vi.fn().mockImplementation(() => ({
    inc: mockInc,
    get: vi.fn(),
  }));

  const mockGauge = vi.fn().mockImplementation(() => ({
    set: vi.fn(),
    inc: vi.fn(),
    dec: vi.fn(),
  }));

  const mockHistogram = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    startTimer: vi.fn().mockReturnValue(vi.fn()),
  }));

  const mockRegister = {
    clear: vi.fn(),
    setDefaultLabels: vi.fn(),
    metrics: vi.fn().mockResolvedValue(''),
    contentType: 'text/plain',
  };

  // If actual is a module namespace, it might have a default export
  // We need to cover both named exports and the default export object
  return {
    ...actual,
    // Mock named exports
    register: mockRegister,
    Counter: mockCounter,
    Gauge: mockGauge,
    Histogram: mockHistogram,
    // Mock default export if it exists
    default: {
      ...(actual as any).default,
      register: mockRegister,
      Counter: mockCounter,
      Gauge: mockGauge,
      Histogram: mockHistogram,
    },
  };
});

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.clearAllMocks();
});
