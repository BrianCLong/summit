"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const supertest_1 = __importDefault(require("supertest"));
const globals_1 = require("@jest/globals");
// Mock functions declared before mocks
const mockQuery = globals_1.jest.fn();
const mockRelease = globals_1.jest.fn();
const mockConnect = globals_1.jest.fn(async () => ({
    query: mockQuery,
    release: mockRelease,
}));
const mockGetEffectivePlan = globals_1.jest.fn();
let currentUser = {
    id: 'user-1',
    tenantId: 'tenant-1',
};
// ESM-compatible mocking using unstable_mockModule
globals_1.jest.unstable_mockModule('../../config/database.js', () => ({
    getPostgresPool: () => ({
        connect: mockConnect,
    }),
}));
globals_1.jest.unstable_mockModule('../../middleware/auth.js', () => ({
    ensureAuthenticated: (req, _res, next) => {
        req.user = currentUser;
        return next();
    },
}));
globals_1.jest.unstable_mockModule('../../middleware/request-schema-validator.js', () => ({
    buildRequestValidator: () => (_req, _res, next) => next(),
}));
globals_1.jest.unstable_mockModule('../../services/PricingEngine.js', () => ({
    __esModule: true,
    default: {
        getEffectivePlan: mockGetEffectivePlan,
    },
}));
// Dynamic imports AFTER mocks are set up
const tenantUsageRouter = (await Promise.resolve().then(() => __importStar(require('../tenants/usage.js')))).default;
const run = process.env.NO_NETWORK_LISTEN !== 'true';
const describeIf = run ? globals_1.describe : globals_1.describe.skip;
describeIf('tenant usage routes', () => {
    const app = (0, express_1.default)();
    app.use(express_1.default.json());
    app.use('/api/tenants/:tenantId/usage', tenantUsageRouter);
    (0, globals_1.beforeEach)(() => {
        globals_1.jest.clearAllMocks();
        currentUser = { id: 'user-1', tenantId: 'tenant-1' };
        mockConnect.mockResolvedValue({
            query: mockQuery,
            release: mockRelease,
        });
        mockQuery.mockResolvedValue({
            rows: [
                {
                    period_start: new Date('2025-01-01T00:00:00Z'),
                    period_end: new Date('2025-01-02T00:00:00Z'),
                    kind: 'api_calls',
                    total_quantity: 10,
                    unit: 'calls',
                    breakdown: {},
                },
            ],
        });
        mockGetEffectivePlan.mockResolvedValue({
            plan: {
                limits: {
                    api_calls: { unitPrice: 0.25 },
                },
            },
        });
    });
    (0, globals_1.it)('returns usage rollups with estimated costs', async () => {
        const res = await (0, supertest_1.default)(app).get('/api/tenants/tenant-1/usage');
        (0, globals_1.expect)(res.status).toBe(200);
        (0, globals_1.expect)(res.body.rollups).toHaveLength(1);
        (0, globals_1.expect)(res.body.rollups[0]).toMatchObject({
            dimension: 'api_calls',
            totalQuantity: 10,
            unit: 'calls',
            estimatedCost: 2.5,
        });
        (0, globals_1.expect)(res.body.totalEstimatedCost).toBe(2.5);
    });
    (0, globals_1.it)('exports usage rollups as JSON', async () => {
        const res = await (0, supertest_1.default)(app).get('/api/tenants/tenant-1/usage/export.json');
        (0, globals_1.expect)(res.status).toBe(200);
        (0, globals_1.expect)(res.headers['content-type']).toContain('application/json');
        const payload = JSON.parse(res.text);
        (0, globals_1.expect)(payload.rollups[0]).toMatchObject({
            dimension: 'api_calls',
            totalQuantity: 10,
            unit: 'calls',
            estimatedCost: 2.5,
        });
    });
    (0, globals_1.it)('exports usage rollups as CSV', async () => {
        const res = await (0, supertest_1.default)(app).get('/api/tenants/tenant-1/usage/export.csv');
        (0, globals_1.expect)(res.status).toBe(200);
        (0, globals_1.expect)(res.headers['content-type']).toContain('text/csv');
        const lines = res.text.trim().split('\n');
        (0, globals_1.expect)(lines[0]).toBe('period_start,period_end,dimension,total_quantity,unit,estimated_cost');
        (0, globals_1.expect)(lines[1]).toContain('api_calls');
    });
    (0, globals_1.it)('blocks cross-tenant export access', async () => {
        currentUser = { id: 'user-2', tenantId: 'other-tenant' };
        const res = await (0, supertest_1.default)(app).get('/api/tenants/tenant-1/usage/export.json');
        (0, globals_1.expect)(res.status).toBe(403);
    });
});
