"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const express_1 = __importDefault(require("express"));
const supertest_1 = __importDefault(require("supertest"));
const operations_routes_js_1 = require("../operations-routes.js");
const feature_flags_js_1 = require("../../config/feature-flags.js");
let allowAuth = true;
globals_1.jest.mock('../../auth/rbac-middleware', () => ({
    authenticateUser: (req, res, next) => {
        if (allowAuth) {
            req.user = {
                userId: 'tester',
                tenantId: 'tenant-1',
                roles: ['admin'],
                permissions: ['*'],
            };
            return next();
        }
        return res.status(401).json({ error: 'Authentication required' });
    },
    requireAnyPermission: () => (_req, _res, next) => next(),
    requirePermission: () => (_req, _res, next) => next(),
}));
const describeIf = process.env.NO_NETWORK_LISTEN === 'true' ? globals_1.describe.skip : globals_1.describe;
describeIf('operations routes', () => {
    const app = (0, express_1.default)();
    app.use(express_1.default.json());
    app.use(operations_routes_js_1.operationsRouter);
    (0, globals_1.afterEach)(() => {
        allowAuth = true;
        (0, feature_flags_js_1.resetFeatureFlags)();
    });
    test('returns feature flag snapshot for authorized users', async () => {
        (0, feature_flags_js_1.resetFeatureFlags)({
            PRICE_AWARE_ENABLED: 'false',
            PRICE_AWARE_FORCE_POOL_ID: 'snapshot-pool',
        });
        const res = await (0, supertest_1.default)(app).get('/flags').expect(200);
        (0, globals_1.expect)(res.body.flags.PRICE_AWARE_ENABLED).toBe(false);
        (0, globals_1.expect)(res.body.flags.PRICE_AWARE_FORCE_POOL_ID).toBe('snapshot-pool');
    });
    test('requires authentication to read flags', async () => {
        allowAuth = false;
        await (0, supertest_1.default)(app).get('/flags').expect(401);
    });
    test('blocks pricing refresh when feature flag is disabled', async () => {
        (0, feature_flags_js_1.resetFeatureFlags)({
            PRICING_REFRESH_ENABLED: 'false',
        });
        const res = await (0, supertest_1.default)(app).post('/pricing/refresh').expect(409);
        (0, globals_1.expect)(res.body.error).toBe('pricing refresh disabled by feature flag');
    });
});
