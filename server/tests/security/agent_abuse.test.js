"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const mockRedisMethods = {
    zadd: globals_1.jest.fn(),
    zAdd: globals_1.jest.fn(),
    expire: globals_1.jest.fn(),
    zcount: globals_1.jest.fn(),
    zCount: globals_1.jest.fn(),
    zrange: globals_1.jest.fn(),
    del: globals_1.jest.fn(),
    pipeline: globals_1.jest.fn().mockReturnThis(),
    exec: globals_1.jest.fn(),
};
// Mock ioredis to return an object containing these shared spies
globals_1.jest.mock('ioredis', () => ({
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
        PrometheusMetrics: globals_1.jest.fn().mockImplementation(() => ({
            createCounter: globals_1.jest.fn(),
            createGauge: globals_1.jest.fn(),
            createHistogram: globals_1.jest.fn(),
            incrementCounter: globals_1.jest.fn(),
            setGauge: globals_1.jest.fn(),
            observeHistogram: globals_1.jest.fn(),
        })),
    };
}
globals_1.jest.mock('../../src/utils/metrics', metricsFactory);
globals_1.jest.mock('../../src/utils/metrics.js', metricsFactory);
// Mock Logger
globals_1.jest.mock('../../src/utils/logger.js', () => ({
    __esModule: true,
    default: {
        info: globals_1.jest.fn(),
        warn: globals_1.jest.fn(),
        error: globals_1.jest.fn(),
        debug: globals_1.jest.fn(),
    },
}));
// Mock Tracing
function tracingFactory() {
    const startActiveSpan = globals_1.jest.fn();
    startActiveSpan.mockImplementation((name, callback) => {
        const span = {
            setAttributes: globals_1.jest.fn(),
            recordException: globals_1.jest.fn(),
            end: globals_1.jest.fn(),
        };
        return callback(span);
    });
    return {
        tracer: {
            startActiveSpan,
        },
    };
}
globals_1.jest.mock('../../src/utils/tracing', tracingFactory);
globals_1.jest.mock('../../src/utils/tracing.js', tracingFactory);
// Import after mocks
const abuseGuard_js_1 = require("../../src/middleware/abuseGuard.js");
(0, globals_1.describe)('AbuseGuard Middleware', () => {
    let abuseGuard;
    let req;
    let res;
    let next;
    (0, globals_1.beforeEach)(() => {
        globals_1.jest.clearAllMocks();
        const metricsStub = {
            createCounter: globals_1.jest.fn(),
            createGauge: globals_1.jest.fn(),
            createHistogram: globals_1.jest.fn(),
            incrementCounter: globals_1.jest.fn(),
            setGauge: globals_1.jest.fn(),
            observeHistogram: globals_1.jest.fn(),
        };
        globals_1.jest
            .spyOn(abuseGuard_js_1.AbuseGuard.prototype, 'initializeMetrics')
            .mockImplementation(function () {
            this.metrics = metricsStub;
        });
        globals_1.jest
            .spyOn(abuseGuard_js_1.AbuseGuard.prototype, 'startCleanupTask')
            .mockImplementation(() => undefined);
        const tracing = require('../../src/utils/tracing');
        tracing.tracer.startActiveSpan = globals_1.jest.fn((name, callback) => {
            const span = {
                setAttributes: globals_1.jest.fn(),
                recordException: globals_1.jest.fn(),
                end: globals_1.jest.fn(),
            };
            return callback(span);
        });
        abuseGuard = new abuseGuard_js_1.AbuseGuard({
            enabled: true,
            windowSizeMinutes: 1,
            maxRequestsPerWindow: 10,
            anomalyThreshold: 2.0,
            throttleDurationMinutes: 10,
        });
        globals_1.jest
            .spyOn(abuseGuard, 'recordAndAnalyze')
            .mockResolvedValue({
            isAnomaly: false,
            zScore: 0,
            currentRate: 0,
            baselineRate: 0,
            confidence: 0,
            type: 'normal',
        });
        globals_1.jest.spyOn(abuseGuard, 'isThrottled').mockReturnValue(false);
        globals_1.jest
            .spyOn(abuseGuard, 'handleAnomaly')
            .mockResolvedValue(undefined);
        req = {
            headers: {},
            body: {},
            query: {},
        };
        res = {
            status: globals_1.jest.fn().mockReturnThis(),
            json: globals_1.jest.fn(),
        };
        next = globals_1.jest.fn();
    });
    (0, globals_1.it)('should allow normal traffic', async () => {
        const middleware = abuseGuard.middleware();
        req.headers = { 'x-tenant-id': 'tenant-1' };
        mockRedisMethods.zAdd.mockResolvedValue(1);
        mockRedisMethods.expire.mockResolvedValue(1);
        mockRedisMethods.zCount.mockResolvedValue(5);
        await middleware(req, res, next);
        (0, globals_1.expect)(next).toHaveBeenCalled();
        (0, globals_1.expect)(res.status).not.toHaveBeenCalled();
    });
    (0, globals_1.it)('should block anomalous traffic (spike)', async () => {
        globals_1.jest
            .spyOn(abuseGuard, 'recordAndAnalyze')
            .mockResolvedValue({
            isAnomaly: true,
            zScore: 5,
            currentRate: 200,
            baselineRate: 10,
            confidence: 0.9,
            type: 'spike',
        });
        const isThrottledSpy = globals_1.jest.spyOn(abuseGuard, 'isThrottled');
        isThrottledSpy.mockReturnValueOnce(false).mockReturnValueOnce(true);
        const middleware = abuseGuard.middleware();
        req.headers = { 'x-tenant-id': 'tenant-attacker' };
        mockRedisMethods.zAdd.mockResolvedValue(1);
        mockRedisMethods.expire.mockResolvedValue(1);
        let callCount = 0;
        mockRedisMethods.zCount.mockImplementation(() => {
            callCount++;
            if (callCount === 1)
                return Promise.resolve(200); // Current window: 200 requests (Spike > 10 * average)
            return Promise.resolve(10); // Historical: 10 requests
        });
        await middleware(req, res, next);
        // Expect 429 Too Many Requests
        (0, globals_1.expect)(res.status).toHaveBeenCalledWith(429);
        (0, globals_1.expect)(res.json).toHaveBeenCalledWith(globals_1.expect.objectContaining({
            error: 'Rate limit exceeded',
        }));
        (0, globals_1.expect)(next).not.toHaveBeenCalled();
    });
    (0, globals_1.it)('should bypass with valid token', async () => {
        abuseGuard = new abuseGuard_js_1.AbuseGuard({
            bypassTokens: ['secret-token'],
        });
        const middleware = abuseGuard.middleware();
        req.headers = {
            'x-tenant-id': 'tenant-1',
            'x-bypass-token': 'secret-token',
        };
        await middleware(req, res, next);
        (0, globals_1.expect)(next).toHaveBeenCalled();
        (0, globals_1.expect)(mockRedisMethods.zAdd).not.toHaveBeenCalled();
    });
});
