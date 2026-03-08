"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const express_1 = __importDefault(require("express"));
const supertest_1 = __importDefault(require("supertest"));
const rbac_middleware_js_1 = require("../../src/conductor/auth/rbac-middleware.js");
const describeIf = process.env.NO_NETWORK_LISTEN === 'true' ? globals_1.describe.skip : globals_1.describe;
function buildUser(role) {
    return {
        userId: `${role}-user`,
        sub: `${role}-user`,
        email: `${role}@example.com`,
        roles: [role],
    };
}
function invokePermission(permission, role) {
    const req = {
        user: buildUser(role),
        headers: {},
    };
    const res = {
        status: globals_1.jest.fn().mockReturnThis(),
        json: globals_1.jest.fn(),
    };
    const next = globals_1.jest.fn();
    (0, rbac_middleware_js_1.requirePermission)(permission)(req, res, next);
    return { res, next };
}
function buildTestApp() {
    const app = (0, express_1.default)();
    app.use(express_1.default.json());
    app.use((req, _res, next) => {
        const role = req.headers['x-test-role'] || 'viewer';
        const authReq = req;
        authReq.user = buildUser(role);
        next();
    });
    app.post('/api/conductor/pricing/refresh', (0, rbac_middleware_js_1.requirePermission)('pricing:refresh'), (req, res) => res.json({ refreshed: true }));
    app.get('/api/conductor/flags', (0, rbac_middleware_js_1.requirePermission)('flags:read'), (req, res) => res.json({ flags: [] }));
    return app;
}
describeIf('Conductor RBAC middleware', () => {
    (0, globals_1.describe)('default role permissions', () => {
        (0, globals_1.it)('grants operator pricing, capacity, and flags access', () => {
            const permissions = rbac_middleware_js_1.rbacManager.getUserPermissions(buildUser('operator'));
            (0, globals_1.expect)(permissions.has('pricing:refresh')).toBe(true);
            (0, globals_1.expect)(permissions.has('pricing:read')).toBe(true);
            (0, globals_1.expect)(permissions.has('capacity:reserve')).toBe(true);
            (0, globals_1.expect)(permissions.has('capacity:release')).toBe(true);
            (0, globals_1.expect)(permissions.has('capacity:read')).toBe(true);
            (0, globals_1.expect)(permissions.has('flags:read')).toBe(true);
        });
        (0, globals_1.it)('restricts analyst to read-only pricing and capacity visibility', () => {
            const permissions = rbac_middleware_js_1.rbacManager.getUserPermissions(buildUser('analyst'));
            (0, globals_1.expect)(permissions.has('pricing:read')).toBe(true);
            (0, globals_1.expect)(permissions.has('capacity:read')).toBe(true);
            (0, globals_1.expect)(permissions.has('pricing:refresh')).toBe(false);
            (0, globals_1.expect)(permissions.has('capacity:reserve')).toBe(false);
            (0, globals_1.expect)(permissions.has('flags:read')).toBe(false);
        });
        (0, globals_1.it)('only allows viewer to read pricing', () => {
            const permissions = rbac_middleware_js_1.rbacManager.getUserPermissions(buildUser('viewer'));
            (0, globals_1.expect)(permissions.has('pricing:read')).toBe(true);
            (0, globals_1.expect)(permissions.has('pricing:refresh')).toBe(false);
            (0, globals_1.expect)(permissions.has('capacity:read')).toBe(false);
        });
    });
    (0, globals_1.describe)('requirePermission enforcement', () => {
        (0, globals_1.it)('allows operator to refresh pricing and reserve capacity', () => {
            const pricingResult = invokePermission('pricing:refresh', 'operator');
            const capacityResult = invokePermission('capacity:reserve', 'operator');
            const flagsResult = invokePermission('flags:read', 'operator');
            (0, globals_1.expect)(pricingResult.next).toHaveBeenCalled();
            (0, globals_1.expect)(capacityResult.next).toHaveBeenCalled();
            (0, globals_1.expect)(flagsResult.next).toHaveBeenCalled();
        });
        (0, globals_1.it)('allows analyst to read pricing and capacity but blocks mutations and flags', () => {
            const pricingRead = invokePermission('pricing:read', 'analyst');
            const capacityRead = invokePermission('capacity:read', 'analyst');
            const pricingRefresh = invokePermission('pricing:refresh', 'analyst');
            const capacityReserve = invokePermission('capacity:reserve', 'analyst');
            const flagsRead = invokePermission('flags:read', 'analyst');
            (0, globals_1.expect)(pricingRead.next).toHaveBeenCalled();
            (0, globals_1.expect)(capacityRead.next).toHaveBeenCalled();
            (0, globals_1.expect)(pricingRefresh.res.status).toHaveBeenCalledWith(403);
            (0, globals_1.expect)(capacityReserve.res.status).toHaveBeenCalledWith(403);
            (0, globals_1.expect)(flagsRead.res.status).toHaveBeenCalledWith(403);
        });
        (0, globals_1.it)('limits viewer to pricing read and denies other pricing/capacity/flag scopes', () => {
            const pricingRead = invokePermission('pricing:read', 'viewer');
            const pricingRefresh = invokePermission('pricing:refresh', 'viewer');
            const capacityRead = invokePermission('capacity:read', 'viewer');
            const capacityReserve = invokePermission('capacity:reserve', 'viewer');
            const flagsRead = invokePermission('flags:read', 'viewer');
            (0, globals_1.expect)(pricingRead.next).toHaveBeenCalled();
            (0, globals_1.expect)(pricingRefresh.res.status).toHaveBeenCalledWith(403);
            (0, globals_1.expect)(capacityRead.res.status).toHaveBeenCalledWith(403);
            (0, globals_1.expect)(capacityReserve.res.status).toHaveBeenCalledWith(403);
            (0, globals_1.expect)(flagsRead.res.status).toHaveBeenCalledWith(403);
        });
    });
    (0, globals_1.describe)('route-level enforcement', () => {
        const app = buildTestApp();
        (0, globals_1.it)('allows operator to call pricing refresh endpoint', async () => {
            await (0, supertest_1.default)(app)
                .post('/api/conductor/pricing/refresh')
                .set('x-test-role', 'operator')
                .expect(200);
        });
        (0, globals_1.it)('blocks viewer from pricing refresh and flags', async () => {
            await (0, supertest_1.default)(app)
                .post('/api/conductor/pricing/refresh')
                .set('x-test-role', 'viewer')
                .expect(403);
            await (0, supertest_1.default)(app)
                .get('/api/conductor/flags')
                .set('x-test-role', 'viewer')
                .expect(403);
        });
    });
});
