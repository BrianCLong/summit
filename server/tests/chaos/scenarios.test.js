"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const axios_1 = __importDefault(require("axios"));
const harness_js_1 = require("../../src/lib/chaos/harness.js");
const ChaosHttpClient_js_1 = require("../../src/lib/chaos/ChaosHttpClient.js");
const ChaosGraphDriver_js_1 = require("../../src/lib/chaos/ChaosGraphDriver.js");
const ChaosJobMiddleware_js_1 = require("../../src/lib/chaos/ChaosJobMiddleware.js");
// Mock Neo4j driver/session
const mockRun = globals_1.jest.fn();
const mockClose = globals_1.jest.fn();
const mockSession = {
    run: mockRun,
    close: mockClose,
    beginTransaction: globals_1.jest.fn(),
    readTransaction: globals_1.jest.fn(),
    writeTransaction: globals_1.jest.fn(),
    lastBookmark: globals_1.jest.fn(() => []),
    lastBookmarks: globals_1.jest.fn(() => []),
    executeRead: globals_1.jest.fn(),
    executeWrite: globals_1.jest.fn(),
};
const mockDriver = {
    session: () => mockSession,
    close: globals_1.jest.fn(),
    verifyConnectivity: globals_1.jest.fn(),
    supportsMultiDb: globals_1.jest.fn(),
    supportsTransactionConfig: globals_1.jest.fn(),
    executableQuery: globals_1.jest.fn(),
    executeQuery: globals_1.jest.fn(),
};
// Plain function adapter
const plainAxiosAdapter = (config) => {
    return Promise.resolve({
        data: { success: true },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: config,
        request: {}
    });
};
(0, globals_1.describe)('Chaos Harness Integration Tests', () => {
    (0, globals_1.beforeEach)(() => {
        harness_js_1.ChaosHarness.getInstance().reset();
        globals_1.jest.clearAllMocks();
    });
    (0, globals_1.describe)('Scenario 1: HTTP 429 Burst', () => {
        (0, globals_1.it)('should inject 429 errors and allow retry logic to handle it', async () => {
            const axiosInstance = axios_1.default.create({ adapter: plainAxiosAdapter });
            const chaosClient = new ChaosHttpClient_js_1.ChaosHttpClient(axiosInstance, 'external-api');
            // Enable Chaos: 100% error rate, type 429
            harness_js_1.ChaosHarness.getInstance().setConfig('external-api', {
                mode: 'error',
                errorRate: 1.0,
                errorType: '429'
            });
            let attempts = 0;
            try {
                // Initial request - should fail with 429
                attempts++;
                await chaosClient.getClient().get('/test');
            }
            catch (err) {
                // Expect 429
                if (err.response) {
                    (0, globals_1.expect)(err.response.status).toBe(429);
                }
                else {
                    throw err;
                }
                // Disable chaos to simulate "burst over" or "retry success"
                harness_js_1.ChaosHarness.getInstance().setConfig('external-api', { mode: 'none' });
                // Retry
                attempts++;
                const res = await chaosClient.getClient().get('/test');
                (0, globals_1.expect)(res.status).toBe(200);
            }
            (0, globals_1.expect)(attempts).toBe(2);
        });
    });
    (0, globals_1.describe)('Scenario 2: Graph Latency Spike', () => {
        (0, globals_1.it)('should inject latency into graph queries', async () => {
            const chaosDriver = new ChaosGraphDriver_js_1.ChaosGraphDriver(mockDriver, 'graph-db');
            // Enable Chaos: 100ms latency
            harness_js_1.ChaosHarness.getInstance().setConfig('graph-db', {
                mode: 'latency',
                latencyMs: 100
            });
            // Use any to avoid TS2345 strict mocking issues in test
            mockRun.mockResolvedValue({ records: [], summary: {} });
            const start = Date.now();
            const session = chaosDriver.session();
            await session.run('MATCH (n) RETURN n');
            const duration = Date.now() - start;
            (0, globals_1.expect)(duration).toBeGreaterThanOrEqual(100);
            (0, globals_1.expect)(mockRun).toHaveBeenCalled();
        });
        (0, globals_1.it)('should inject errors into graph queries', async () => {
            const chaosDriver = new ChaosGraphDriver_js_1.ChaosGraphDriver(mockDriver, 'graph-db');
            // Enable Chaos: Error
            harness_js_1.ChaosHarness.getInstance().setConfig('graph-db', {
                mode: 'error',
                errorRate: 1.0,
                errorType: 'TransientError'
            });
            const session = chaosDriver.session();
            await (0, globals_1.expect)(session.run('MATCH (n) RETURN n')).rejects.toThrow('Chaos injected Neo4j error: TransientError');
        });
    });
    (0, globals_1.describe)('Scenario 3: Job Worker Failure', () => {
        (0, globals_1.it)('should inject failure into job processing', async () => {
            const middleware = new ChaosJobMiddleware_js_1.ChaosJobMiddleware('job-worker-1');
            // Enable Chaos
            harness_js_1.ChaosHarness.getInstance().setConfig('job-worker-1', {
                mode: 'error',
                errorRate: 1.0
            });
            await (0, globals_1.expect)(middleware.checkChaos()).rejects.toThrow('Chaos injected Job failure');
            // Disable Chaos
            harness_js_1.ChaosHarness.getInstance().setConfig('job-worker-1', { mode: 'none' });
            await (0, globals_1.expect)(middleware.checkChaos()).resolves.not.toThrow();
        });
    });
});
