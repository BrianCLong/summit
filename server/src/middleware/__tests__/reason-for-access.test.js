"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const reason_for_access_js_1 = require("../reason-for-access.js");
const requestFactory = (overrides = {}) => {
    const headers = overrides.headers ?? {};
    return {
        headers,
        path: '/',
        get: (name) => headers[name.toLowerCase()],
        ...overrides,
    };
};
const responseFactory = () => ({
    status: globals_1.jest.fn().mockReturnThis(),
    json: globals_1.jest.fn().mockReturnThis(),
    set: globals_1.jest.fn().mockReturnThis(),
});
const nextFactory = () => globals_1.jest.fn();
(0, globals_1.describe)('reason-for-access middleware', () => {
    const baseConfig = {
        enabled: true,
        minLength: 10,
        sensitiveRoutes: ['/api/provenance', '/graphql'],
    };
    let next;
    (0, globals_1.beforeEach)(() => {
        next = nextFactory();
    });
    (0, globals_1.it)('skips when feature flag disabled', async () => {
        const middleware = (0, reason_for_access_js_1.createReasonForAccessMiddleware)({ ...baseConfig, enabled: false });
        const req = requestFactory({ path: '/api/provenance/data' });
        const res = responseFactory();
        await middleware(req, res, next);
        (0, globals_1.expect)(next).toHaveBeenCalledWith();
    });
    (0, globals_1.it)('allows non-sensitive routes', async () => {
        const middleware = (0, reason_for_access_js_1.createReasonForAccessMiddleware)(baseConfig);
        const req = requestFactory({ path: '/api/health' });
        const res = responseFactory();
        await middleware(req, res, next);
        (0, globals_1.expect)(next).toHaveBeenCalledWith();
    });
    (0, globals_1.it)('rejects missing header on sensitive routes', async () => {
        const middleware = (0, reason_for_access_js_1.createReasonForAccessMiddleware)(baseConfig);
        const req = requestFactory({ path: '/api/provenance/query' });
        const res = responseFactory();
        await middleware(req, res, next);
        (0, globals_1.expect)(next).toHaveBeenCalledTimes(1);
        const err = next.mock.calls[0][0];
        (0, globals_1.expect)(err.message).toMatch(/required/);
    });
    (0, globals_1.it)('rejects too-short reasons', async () => {
        const middleware = (0, reason_for_access_js_1.createReasonForAccessMiddleware)(baseConfig);
        const req = requestFactory({
            path: '/graphql',
            headers: { 'x-reason-for-access': 'short' },
        });
        const res = responseFactory();
        await middleware(req, res, next);
        const err = next.mock.calls[0][0];
        (0, globals_1.expect)(err.message).toMatch(/at least/);
    });
    (0, globals_1.it)('allows valid header and attaches to request', async () => {
        const middleware = (0, reason_for_access_js_1.createReasonForAccessMiddleware)(baseConfig);
        const req = requestFactory({
            path: '/graphql',
            headers: { 'x-reason-for-access': 'Investigating case 12345' },
        });
        const res = responseFactory();
        await middleware(req, res, next);
        (0, globals_1.expect)(req.reasonForAccess).toBe('Investigating case 12345');
        (0, globals_1.expect)(next).toHaveBeenCalledWith();
    });
});
