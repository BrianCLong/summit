
import { Request, Response } from 'express';
import { AbuseGuard } from '../../src/middleware/abuseGuard';

// Shared mocks
const mockRedisMethods = {
    zadd: jest.fn(),
    expire: jest.fn(),
    zcount: jest.fn(),
    zrange: jest.fn(),
    del: jest.fn(),
    pipeline: jest.fn().mockReturnThis(),
    exec: jest.fn(),
};

// Mock ioredis
jest.mock('ioredis', () => {
    return {
        default: class {
            constructor() {
                return mockRedisMethods;
            }
        }
    };
});

// Mock Metrics
jest.mock('../../src/utils/metrics', () => ({
    PrometheusMetrics: jest.fn().mockImplementation(() => ({
        createCounter: jest.fn(),
        createGauge: jest.fn(),
        createHistogram: jest.fn(),
        incrementCounter: jest.fn(),
        setGauge: jest.fn(),
        observeHistogram: jest.fn(),
    })),
}));

// Mock Logger
jest.mock('../../src/utils/logger', () => ({
    default: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
    },
}));

// Mock Tracing
jest.mock('../../src/utils/tracing', () => ({
    tracer: {
        startActiveSpan: jest.fn((name, callback) => {
            const span = {
                setAttributes: jest.fn(),
                recordException: jest.fn(),
                end: jest.fn(),
            };
            return callback(span);
        }),
    },
}));

describe('AbuseGuard Middleware', () => {
    let abuseGuard: AbuseGuard;
    let req: Partial<Request>;
    let res: Partial<Response>;
    let next: any;

    beforeEach(() => {
        jest.clearAllMocks();
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
            status: jest.fn().mockReturnThis() as any,
            json: jest.fn(),
        };
        next = jest.fn();
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
