
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { Request, Response } from 'express';

type RedisMock = jest.MockedFunction<(...args: any[]) => Promise<number>>;
type RedisAnyMock = jest.MockedFunction<(...args: any[]) => any>;

const mockRedisMethods: {
  zadd: RedisMock;
  zAdd: RedisMock;
  expire: RedisMock;
  zcount: RedisMock;
  zCount: RedisMock;
  zrange: RedisMock;
  del: RedisMock;
  pipeline: RedisAnyMock;
  exec: RedisAnyMock;
} = {
  zadd: jest.fn() as RedisMock,
  zAdd: jest.fn() as RedisMock,
  expire: jest.fn() as RedisMock,
  zcount: jest.fn() as RedisMock,
  zCount: jest.fn() as RedisMock,
  zrange: jest.fn() as RedisMock,
  del: jest.fn() as RedisMock,
  pipeline: jest.fn().mockReturnThis() as RedisAnyMock,
  exec: jest.fn() as RedisAnyMock,
};


// Mock ioredis to return an object containing these shared spies
jest.mock('ioredis', () => ({
  __esModule: true,
  default: class {
    constructor() {
      return mockRedisMethods;
    }
  },
}));

// Mock Metrics
function metricsFactory() {
  return {
    PrometheusMetrics: jest.fn().mockImplementation(() => ({
      createCounter: jest.fn(),
      createGauge: jest.fn(),
      createHistogram: jest.fn(),
      incrementCounter: jest.fn(),
      setGauge: jest.fn(),
      observeHistogram: jest.fn(),
    })),
  };
}
jest.mock('../../src/utils/metrics', metricsFactory);
jest.mock('../../src/utils/metrics.js', metricsFactory);

// Mock Logger
jest.mock('../../src/utils/logger.js', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock Tracing
function tracingFactory() {
  const startActiveSpan = jest.fn() as jest.MockedFunction<
    (name: string, callback: (span: any) => any) => any
  >;
  startActiveSpan.mockImplementation((name: string, callback: (span: any) => any) => {
    const span = {
      setAttributes: jest.fn(),
      recordException: jest.fn(),
      end: jest.fn(),
    };
    return callback(span);
  });
  return {
    tracer: {
      startActiveSpan,
    },
  };
}
jest.mock('../../src/utils/tracing', tracingFactory);
jest.mock('../../src/utils/tracing.js', tracingFactory);

// Import after mocks
import { AbuseGuard } from '../../src/middleware/abuseGuard.js';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

describe('AbuseGuard Middleware', () => {
    let abuseGuard: AbuseGuard;
    let req: Partial<Request>;
    let res: any;
    let next: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    const metricsStub = {
      createCounter: jest.fn(),
      createGauge: jest.fn(),
      createHistogram: jest.fn(),
      incrementCounter: jest.fn(),
      setGauge: jest.fn(),
      observeHistogram: jest.fn(),
    };
    jest
      .spyOn(AbuseGuard.prototype as any, 'initializeMetrics')
      .mockImplementation(function (this: any) {
        this.metrics = metricsStub;
      });
    jest
      .spyOn(AbuseGuard.prototype as any, 'startCleanupTask')
      .mockImplementation(() => undefined);
    const tracing = require('../../src/utils/tracing');
    tracing.tracer.startActiveSpan = jest.fn(
      (name: string, callback: (span: any) => any) => {
        const span = {
          setAttributes: jest.fn(),
          recordException: jest.fn(),
          end: jest.fn(),
        };
        return callback(span);
      },
    );
    abuseGuard = new AbuseGuard({
      enabled: true,
      windowSizeMinutes: 1,
      maxRequestsPerWindow: 10,
      anomalyThreshold: 2.0,
      throttleDurationMinutes: 10,
    });
    jest
      .spyOn(abuseGuard as any, 'recordAndAnalyze')
      .mockResolvedValue({
        isAnomaly: false,
        zScore: 0,
        currentRate: 0,
        baselineRate: 0,
        confidence: 0,
        type: 'normal',
      });
    jest.spyOn(abuseGuard as any, 'isThrottled').mockReturnValue(false);
    jest
      .spyOn(abuseGuard as any, 'handleAnomaly')
      .mockResolvedValue(undefined);

    req = {
      headers: {},
      body: {},
      query: {},
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();
  });

    it('should allow normal traffic', async () => {
        const middleware = abuseGuard.middleware();
        req.headers = { 'x-tenant-id': 'tenant-1' };

        mockRedisMethods.zAdd.mockResolvedValue(1);
        mockRedisMethods.expire.mockResolvedValue(1);
        mockRedisMethods.zCount.mockResolvedValue(5);

        await middleware(req as Request, res as Response, next);

        expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

    it('should block anomalous traffic (spike)', async () => {
        (jest
          .spyOn(abuseGuard as any, 'recordAndAnalyze')
          .mockResolvedValue({
            isAnomaly: true,
            zScore: 5,
            currentRate: 200,
            baselineRate: 10,
            confidence: 0.9,
            type: 'spike',
          }) as unknown) as jest.Mock;
        const isThrottledSpy = jest.spyOn(abuseGuard as any, 'isThrottled');
        isThrottledSpy.mockReturnValueOnce(false).mockReturnValueOnce(true);
        const middleware = abuseGuard.middleware();
        req.headers = { 'x-tenant-id': 'tenant-attacker' };

        mockRedisMethods.zAdd.mockResolvedValue(1);
        mockRedisMethods.expire.mockResolvedValue(1);

        let callCount = 0;
        mockRedisMethods.zCount.mockImplementation(() => {
            callCount++;
            if (callCount === 1) return Promise.resolve(200); // Current window: 200 requests (Spike > 10 * average)
            return Promise.resolve(10); // Historical: 10 requests
        });

        await middleware(req as Request, res as Response, next);

        // Expect 429 Too Many Requests
        expect(res.status).toHaveBeenCalledWith(429);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            error: 'Rate limit exceeded',
        }));
    expect(next).not.toHaveBeenCalled();
  });

    it('should bypass with valid token', async () => {
    abuseGuard = new AbuseGuard({
      bypassTokens: ['secret-token'],
    });
    const middleware = abuseGuard.middleware();
    req.headers = {
      'x-tenant-id': 'tenant-1',
      'x-bypass-token': 'secret-token',
    };

    await middleware(req as Request, res as Response, next);

    expect(next).toHaveBeenCalled();
        expect(mockRedisMethods.zAdd).not.toHaveBeenCalled();
  });
});
