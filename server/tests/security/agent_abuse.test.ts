
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response } from 'express';

// Define spies first so they can be hoisted/used in the factory if needed
// However, variables initialized here are not hoisted into the mock factory.
// We must use `vi.hoisted()` or define the mock factory to return the object.

const { mockRedisMethods } = vi.hoisted(() => {
    return {
        mockRedisMethods: {
            zadd: vi.fn(),
            expire: vi.fn(),
            zcount: vi.fn(),
            zrange: vi.fn(),
            del: vi.fn(),
            pipeline: vi.fn().mockReturnThis(),
            exec: vi.fn(),
        }
    }
});


// Mock ioredis to return an object containing these shared spies
vi.mock('ioredis', () => {
    return {
        default: class {
            constructor() {
                return mockRedisMethods;
            }
        }
    };
});

// Mock Metrics
vi.mock('../src/utils/metrics', () => ({
    PrometheusMetrics: vi.fn().mockImplementation(() => ({
        createCounter: vi.fn(),
        createGauge: vi.fn(),
        createHistogram: vi.fn(),
        incrementCounter: vi.fn(),
        setGauge: vi.fn(),
        observeHistogram: vi.fn(),
    })),
}));

// Mock Logger
vi.mock('../src/utils/logger', () => ({
    default: {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
    },
}));

// Mock Tracing
vi.mock('../src/utils/tracing', () => ({
    tracer: {
        startActiveSpan: vi.fn((name, callback) => {
            const span = {
                setAttributes: vi.fn(),
                recordException: vi.fn(),
                end: vi.fn(),
            };
            return callback(span);
        }),
    },
}));

// Import after mocks
import { AbuseGuard } from '../../src/middleware/abuseGuard';

describe('AbuseGuard Middleware', () => {
    let abuseGuard: AbuseGuard;
    let req: Partial<Request>;
    let res: Partial<Response>;
    let next: any;

    beforeEach(() => {
        vi.clearAllMocks();
        abuseGuard = new AbuseGuard({
            enabled: true,
            windowSizeMinutes: 1,
            maxRequestsPerWindow: 10,
            anomalyThreshold: 2.0,
            throttleDurationMinutes: 10
        });

        req = {
            headers: {},
            body: {},
            query: {},
        };
        res = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn(),
        };
        next = vi.fn();
    });

    it('should allow normal traffic', async () => {
        const middleware = abuseGuard.middleware();
        req.headers = { 'x-tenant-id': 'tenant-1' };

        mockRedisMethods.zadd.mockResolvedValue(1);
        mockRedisMethods.expire.mockResolvedValue(1);
        mockRedisMethods.zcount.mockResolvedValue(5);

        await middleware(req as Request, res as Response, next);

        expect(next).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
    });

    it('should block anomalous traffic (spike)', async () => {
        const middleware = abuseGuard.middleware();
        req.headers = { 'x-tenant-id': 'tenant-attacker' };

        mockRedisMethods.zadd.mockResolvedValue(1);
        mockRedisMethods.expire.mockResolvedValue(1);

        let callCount = 0;
        mockRedisMethods.zcount.mockImplementation(() => {
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
             bypassTokens: ['secret-token']
        });
        const middleware = abuseGuard.middleware();
        req.headers = {
            'x-tenant-id': 'tenant-1',
            'x-bypass-token': 'secret-token'
        };

        await middleware(req as Request, res as Response, next);

        expect(next).toHaveBeenCalled();
        expect(mockRedisMethods.zadd).not.toHaveBeenCalled();
    });
});
