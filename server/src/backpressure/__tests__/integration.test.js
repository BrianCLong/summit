"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const supertest_1 = __importDefault(require("supertest"));
const express_1 = __importDefault(require("express"));
const ingestion_js_1 = __importDefault(require("../../routes/ingestion.js"));
const guard_js_1 = require("../guard.js");
// Mock dependencies
globals_1.jest.mock('../../middleware/auth', () => ({
    ensureAuthenticated: (req, res, next) => {
        req.user = { tenantId: 'test-tenant' };
        next();
    },
}));
globals_1.jest.mock('../../ingestion/QueueService', () => {
    return {
        QueueService: globals_1.jest.fn().mockImplementation(() => ({
            enqueueIngestion: globals_1.jest.fn().mockResolvedValue('job-123'),
            getJobStatus: globals_1.jest.fn(),
        })),
    };
});
// Mock database pool
globals_1.jest.mock('pg', () => {
    return {
        Pool: globals_1.jest.fn().mockImplementation(() => ({
            connect: globals_1.jest.fn(),
            query: globals_1.jest.fn(),
        })),
    };
});
(0, globals_1.describe)('Ingestion Route Backpressure', () => {
    let app;
    let guard;
    (0, globals_1.beforeAll)(() => {
        app = (0, express_1.default)();
        app.use(express_1.default.json());
        app.use('/', ingestion_js_1.default);
    });
    (0, globals_1.beforeEach)(() => {
        guard = guard_js_1.BackpressureGuard.getInstance();
        guard.setEnabledOverride(null);
        guard.setMockQueueDepth(0);
        process.env.BACKPRESSURE_ENABLED = 'false';
    });
    (0, globals_1.afterEach)(() => {
        delete process.env.BACKPRESSURE_ENABLED;
    });
    (0, globals_1.it)('should return 503 when backpressure is triggered', async () => {
        // Enable backpressure
        guard.setEnabledOverride(true);
        guard.setMockQueueDepth(200); // Above threshold
        const response = await (0, supertest_1.default)(app)
            .post('/start')
            .send({
            tenantId: 'test-tenant',
            source: 'test-source',
            config: {}
        });
        (0, globals_1.expect)(response.status).toBe(503);
        (0, globals_1.expect)(response.body).toEqual({
            error: 'Service Unavailable: Backpressure applied'
        });
    });
    (0, globals_1.it)('should return 200 when backpressure is not triggered', async () => {
        // Disable backpressure
        guard.setEnabledOverride(false);
        const response = await (0, supertest_1.default)(app)
            .post('/start')
            .send({
            tenantId: 'test-tenant',
            source: 'test-source',
            config: {}
        });
        (0, globals_1.expect)(response.status).toBe(200);
        (0, globals_1.expect)(response.body).toEqual({
            jobId: 'job-123',
            status: 'queued'
        });
    });
});
