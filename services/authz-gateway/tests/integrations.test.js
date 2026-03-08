"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const graphqlPlugin_1 = require("../src/integrations/graphqlPlugin");
const expressAdapter_1 = require("../src/integrations/expressAdapter");
const audit_1 = require("../src/audit");
const config_1 = require("../src/config");
function mockExpressResponse() {
    const res = {
        status: jest.fn(),
        json: jest.fn(),
        setHeader: jest.fn(),
    };
    res.status.mockReturnValue(res);
    res.json.mockReturnValue(res);
    return res;
}
describe('integration adapters', () => {
    beforeEach(() => {
        (0, audit_1.resetAuditLog)();
        jest.clearAllMocks();
    });
    it('graphql plugin surfaces deny errors', async () => {
        const plugin = (0, graphqlPlugin_1.createPolicyPlugin)();
        const hooks = await plugin.requestDidStart?.();
        const ctx = {
            request: {
                http: {
                    headers: new Map(),
                    url: '/protected/resource',
                },
            },
            contextValue: {
                user: {
                    sub: 'alice',
                    tenantId: 'tenantA',
                    roles: ['reader'],
                    clearance: 'confidential',
                    status: 'active',
                },
            },
        };
        await hooks?.didResolveOperation?.(ctx);
        expect(ctx.errors?.[0]?.message).toContain('Access denied');
        expect(ctx.errors?.[0]?.extensions?.policyId).toBe('policy.require-purpose');
        expect(ctx.contextValue.policyAuditId).toBeDefined();
    });
    it('graphql plugin allows when purpose and authority are present', async () => {
        const plugin = (0, graphqlPlugin_1.createPolicyPlugin)();
        const hooks = await plugin.requestDidStart?.();
        const headers = new Map([
            ['x-purpose', 'treatment'],
            ['x-authority', 'hipaa'],
        ]);
        const ctx = {
            request: { http: { headers, url: '/protected/resource' } },
            contextValue: {
                user: {
                    sub: 'alice',
                    tenantId: 'tenantA',
                    roles: ['reader'],
                    clearance: 'confidential',
                    status: 'active',
                },
            },
        };
        await hooks?.didResolveOperation?.(ctx);
        expect(ctx.errors).toBeUndefined();
        expect(ctx.contextValue.policyDecision.allowed).toBe(true);
    });
    it('express adapter enforces policy decisions', async () => {
        const middleware = (0, expressAdapter_1.createPolicyMiddleware)({ action: 'read' });
        const req = {
            originalUrl: '/protected/resource',
            headers: {
                'x-tenant-id': 'tenantB',
                'x-purpose': 'treatment',
                'x-authority': 'hipaa',
            },
            user: {
                sub: 'alice',
                tenantId: 'tenantA',
                roles: ['reader'],
                clearance: 'confidential',
                status: 'active',
            },
        };
        const res = mockExpressResponse();
        const next = jest.fn();
        await middleware(req, res, next);
        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ policy: 'policy.tenant-isolation' }));
        expect(next).not.toHaveBeenCalled();
    });
    it('express adapter allows compliant requests and forwards audit id', async () => {
        const middleware = (0, expressAdapter_1.createPolicyMiddleware)({ action: 'read' });
        const req = {
            originalUrl: '/protected/resource',
            headers: {
                'x-tenant-id': 'tenantA',
                'x-needtoknow': 'reader',
                'x-purpose': 'treatment',
                'x-authority': 'hipaa',
            },
            user: {
                sub: 'alice',
                tenantId: 'tenantA',
                roles: ['reader'],
                clearance: 'confidential',
                status: 'active',
            },
        };
        const res = mockExpressResponse();
        const next = jest.fn();
        await middleware(req, res, next);
        expect(res.setHeader).toHaveBeenCalledWith('X-Audit-Id', expect.any(String));
        expect(next).toHaveBeenCalled();
        expect(req.policyDecision.allowed).toBe(true);
    });
    it('express adapter bypasses enforcement when the feature flag is disabled', async () => {
        (0, config_1.setFeatureOverrides)({ policyReasoner: false });
        const middleware = (0, expressAdapter_1.createPolicyMiddleware)({ action: 'read' });
        const req = {
            originalUrl: '/protected/resource',
            headers: {},
            user: { sub: 'anonymous' },
        };
        const res = mockExpressResponse();
        const next = jest.fn();
        await middleware(req, res, next);
        expect(next).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
        expect(res.setHeader).not.toHaveBeenCalled();
        (0, config_1.setFeatureOverrides)({ policyReasoner: true });
    });
});
