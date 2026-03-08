"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const rlsContext_js_1 = require("../../security/rlsContext.js");
const rls_session_js_1 = require("../rls-session.js");
(0, globals_1.describe)('rlsSessionMiddleware', () => {
    const originalNodeEnv = process.env.NODE_ENV;
    (0, globals_1.beforeEach)(() => {
        globals_1.jest.clearAllMocks();
        process.env.RLS_V1 = '1';
        process.env.NODE_ENV = 'staging';
    });
    (0, globals_1.afterEach)(() => {
        delete process.env.RLS_V1;
        process.env.NODE_ENV = originalNodeEnv;
    });
    (0, globals_1.it)('binds tenant and case context for tracked paths', async () => {
        const middleware = (0, rls_session_js_1.rlsSessionMiddleware)({ trackedPrefixes: ['/api/cases'] });
        const req = {
            path: '/api/cases/123',
            method: 'GET',
            headers: { 'x-tenant-id': 'tenant-a' },
            params: { id: 'case-123' },
        };
        const res = {
            once: globals_1.jest.fn((event, handler) => {
                if (event === 'finish') {
                    handler();
                }
            }),
        };
        await new Promise((resolve) => {
            middleware(req, res, () => {
                const ctx = (0, rlsContext_js_1.getRlsContext)();
                (0, globals_1.expect)(ctx).toBeDefined();
                (0, globals_1.expect)(ctx?.tenantId).toBe('tenant-a');
                (0, globals_1.expect)(ctx?.caseId).toBe('case-123');
                (0, globals_1.expect)(ctx?.enabled).toBe(true);
                resolve();
            });
        });
        (0, globals_1.expect)(res.once).toHaveBeenCalledWith('finish', globals_1.expect.any(Function));
    });
    (0, globals_1.it)('skips binding when feature flag is off', () => {
        process.env.RLS_V1 = '0';
        const middleware = (0, rls_session_js_1.rlsSessionMiddleware)({ trackedPrefixes: ['/api/cases'] });
        const req = { path: '/api/cases/abc', headers: {} };
        const res = { once: globals_1.jest.fn() };
        let nextCalled = false;
        middleware(req, res, () => {
            nextCalled = true;
            (0, globals_1.expect)((0, rlsContext_js_1.getRlsContext)()).toBeUndefined();
        });
        (0, globals_1.expect)(nextCalled).toBe(true);
        (0, globals_1.expect)(res.once).not.toHaveBeenCalled();
    });
});
