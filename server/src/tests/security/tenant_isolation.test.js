"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const opa_js_1 = require("../../middleware/opa.js");
// Mock axios
const mockPost = globals_1.jest.fn();
globals_1.jest.mock('axios', () => ({
    __esModule: true,
    default: {
        post: (...args) => mockPost(...args),
        get: globals_1.jest.fn(),
    },
}));
// Mock database config to avoid import errors
globals_1.jest.mock('../../config/database.js', () => ({
    getPostgresPool: globals_1.jest.fn(),
}));
// Mock logger
globals_1.jest.mock('../../utils/logger.js', () => ({
    __esModule: true,
    default: { error: globals_1.jest.fn(), warn: globals_1.jest.fn(), info: globals_1.jest.fn() },
}));
// Mock audit
globals_1.jest.mock('../../utils/audit.js', () => ({
    writeAudit: globals_1.jest.fn()
}));
(0, globals_1.describe)('Tenant Isolation via OPAMiddleware', () => {
    let middleware;
    const tenantA = 'tenant-a-uuid';
    const tenantB = 'tenant-b-uuid';
    (0, globals_1.beforeEach)(() => {
        globals_1.jest.clearAllMocks();
        middleware = new opa_js_1.OPAMiddleware({ enabled: true, cacheEnabled: false });
    });
    (0, globals_1.it)('should block access if OPA returns deny', async () => {
        // Mock OPA returning deny
        mockPost.mockResolvedValueOnce({
            data: { result: { allow: false, reason: 'Tenant mismatch' } }
        });
        const user = { id: 'u1', tenantId: tenantA, permissions: ['read'] };
        const context = { user };
        const info = {
            operation: { operation: 'query' },
            fieldName: 'getData',
            parentType: { name: 'Query' }
        };
        const args = { tenantId: tenantB }; // User A accessing Tenant B data
        const resolver = globals_1.jest.fn();
        const wrapped = middleware.createGraphQLMiddleware();
        await (0, globals_1.expect)(wrapped(resolver, {}, args, context, info))
            .rejects.toThrow('Access denied: Tenant mismatch');
        // Verify OPA was called with correct context
        (0, globals_1.expect)(mockPost).toHaveBeenCalledWith(globals_1.expect.stringContaining('/v1/data/intelgraph/allow'), globals_1.expect.objectContaining({
            input: globals_1.expect.objectContaining({
                context: globals_1.expect.objectContaining({
                    tenantId: tenantB // Should use args.tenantId as it takes precedence/is the target
                }),
                user: globals_1.expect.objectContaining({
                    tenantId: tenantA
                })
            })
        }), globals_1.expect.any(Object));
    });
    (0, globals_1.it)('should allow access if OPA returns allow', async () => {
        mockPost.mockResolvedValueOnce({
            data: { result: { allow: true } }
        });
        const user = { id: 'u1', tenantId: tenantA, permissions: ['read'] };
        const context = { user };
        const info = {
            operation: { operation: 'query' },
            fieldName: 'getData',
            parentType: { name: 'Query' }
        };
        const args = { tenantId: tenantA };
        const resolver = globals_1.jest.fn().mockReturnValue('success');
        const wrapped = middleware.createGraphQLMiddleware();
        const result = await wrapped(resolver, {}, args, context, info);
        (0, globals_1.expect)(result).toBe('success');
    });
});
