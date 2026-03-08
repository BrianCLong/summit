"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const express_1 = __importDefault(require("express"));
const supertest_1 = __importDefault(require("supertest"));
const conductor_routes_js_1 = require("../conductor-routes.js");
const pricing_refresh_js_1 = require("../../scheduling/pricing-refresh.js");
globals_1.jest.mock('../../scheduling/pricing-refresh.js', () => ({
    refreshPricing: globals_1.jest.fn(),
}));
const buildApp = () => {
    const app = (0, express_1.default)();
    app.use(express_1.default.json());
    app.use('/api/conductor', conductor_routes_js_1.conductorRoutes);
    return app;
};
(0, globals_1.describe)('POST /api/conductor/pricing/refresh', () => {
    const originalBypass = process.env.AUTH_BYPASS;
    (0, globals_1.afterEach)(() => {
        pricing_refresh_js_1.refreshPricing.mockReset();
        if (originalBypass === undefined) {
            delete process.env.AUTH_BYPASS;
        }
        else {
            process.env.AUTH_BYPASS = originalBypass;
        }
    });
    test('rejects unauthorized requests', async () => {
        delete process.env.AUTH_BYPASS;
        const app = buildApp();
        const res = await (0, supertest_1.default)(app)
            .post('/api/conductor/pricing/refresh')
            .send({});
        (0, globals_1.expect)(res.status).toBe(401);
    });
    test('returns refresh result when authorized', async () => {
        process.env.AUTH_BYPASS = 'true';
        const app = buildApp();
        pricing_refresh_js_1.refreshPricing.mockResolvedValue({
            updatedPools: 2,
            skippedPools: 1,
            effectiveAt: new Date('2024-02-01T00:00:00.000Z'),
        });
        const res = await (0, supertest_1.default)(app)
            .post('/api/conductor/pricing/refresh')
            .send({});
        (0, globals_1.expect)(res.status).toBe(200);
        (0, globals_1.expect)(res.body).toMatchObject({
            updatedPools: 2,
            skippedPools: 1,
            effectiveAt: '2024-02-01T00:00:00.000Z',
        });
        (0, globals_1.expect)(pricing_refresh_js_1.refreshPricing).toHaveBeenCalledTimes(1);
    });
});
