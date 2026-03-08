"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const express_1 = __importDefault(require("express"));
const supertest_1 = __importDefault(require("supertest"));
const pricing_read_routes_js_1 = require("../pricing-read-routes.js");
const pools_js_1 = require("../../scheduling/pools.js");
globals_1.jest.mock('../../auth/rbac-middleware', () => ({
    requirePermission: () => (_req, _res, next) => next(),
}));
globals_1.jest.mock('../../scheduling/pools', () => ({
    listPools: globals_1.jest.fn(),
    currentPricing: globals_1.jest.fn(),
}));
globals_1.jest.mock('../../config/logger', () => ({
    info: globals_1.jest.fn(),
    error: globals_1.jest.fn(),
    warn: globals_1.jest.fn(),
    debug: globals_1.jest.fn(),
}), { virtual: true });
const mockedListPools = pools_js_1.listPools;
const mockedCurrentPricing = pools_js_1.currentPricing;
const buildApp = () => {
    const app = (0, express_1.default)();
    app.use(express_1.default.json());
    app.use(pricing_read_routes_js_1.pricingReadRoutes);
    return app;
};
const run = process.env.NO_NETWORK_LISTEN !== 'true';
const describeIf = run ? globals_1.describe : globals_1.describe.skip;
describeIf('pricingReadRoutes', () => {
    (0, globals_1.beforeEach)(() => {
        mockedListPools.mockReset();
        mockedCurrentPricing.mockReset();
    });
    (0, globals_1.it)('returns pools via /pools', async () => {
        const pools = [
            { id: 'pool-a', region: 'us-east-1', labels: ['gpu'], capacity: 10 },
        ];
        mockedListPools.mockResolvedValue(pools);
        const res = await (0, supertest_1.default)(buildApp()).get('/pools');
        (0, globals_1.expect)(res.status).toBe(200);
        (0, globals_1.expect)(res.body.success).toBe(true);
        (0, globals_1.expect)(res.body.data.pools).toEqual(pools);
    });
    (0, globals_1.it)('returns current pricing', async () => {
        const pricing = {
            'pool-a': {
                pool_id: 'pool-a',
                cpu_sec_usd: 0.000012,
                gb_sec_usd: 0.000009,
                egress_gb_usd: 0.09,
            },
        };
        mockedCurrentPricing.mockResolvedValue(pricing);
        const res = await (0, supertest_1.default)(buildApp()).get('/pricing/current');
        (0, globals_1.expect)(res.status).toBe(200);
        (0, globals_1.expect)(res.body.success).toBe(true);
        (0, globals_1.expect)(res.body.data.pricing).toEqual(pricing);
    });
    (0, globals_1.it)('simulates selection and explains eligibility', async () => {
        mockedListPools.mockResolvedValue([
            { id: 'us-east-1-a', region: 'us-east-1', labels: [], capacity: 5 },
            { id: 'us-east-1-b', region: 'us-east-1', labels: [], capacity: 5 },
            { id: 'eu-west-1-a', region: 'eu-west-1', labels: [], capacity: 5 },
        ]);
        mockedCurrentPricing.mockResolvedValue({
            'us-east-1-a': {
                pool_id: 'us-east-1-a',
                cpu_sec_usd: 0.00001,
                gb_sec_usd: 0.00002,
                egress_gb_usd: 0.09,
            },
            'eu-west-1-a': {
                pool_id: 'eu-west-1-a',
                cpu_sec_usd: 0.000015,
                gb_sec_usd: 0.000025,
                egress_gb_usd: 0.1,
            },
        });
        const res = await (0, supertest_1.default)(buildApp())
            .post('/pricing/simulate-selection')
            .send({
            est: { cpuSec: 60, gbSec: 1, egressGb: 0.02 },
            residency: 'us-east-1',
            tenantId: 't-123',
        });
        (0, globals_1.expect)(res.status).toBe(200);
        (0, globals_1.expect)(res.body.success).toBe(true);
        const considered = res.body.data.considered;
        const usEastA = considered.find((c) => c.id === 'us-east-1-a');
        const usEastB = considered.find((c) => c.id === 'us-east-1-b');
        const euWest = considered.find((c) => c.id === 'eu-west-1-a');
        (0, globals_1.expect)(usEastA.reason).toBe('ok');
        (0, globals_1.expect)(usEastB.reason).toBe('missing_pricing');
        (0, globals_1.expect)(euWest.reason).toBe('residency_mismatch');
        (0, globals_1.expect)(res.body.data.chosen).toEqual({
            id: 'us-east-1-a',
            price: usEastA.price,
        });
    });
});
