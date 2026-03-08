"use strict";
/**
 * Tests for OPA ABAC Middleware
 *
 * P0 - Critical for MVP-4-GA
 * Target coverage: 80%
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const axios_1 = __importDefault(require("axios"));
const request_factory_js_1 = require("../../../tests/mocks/request-factory.js");
const user_factory_js_1 = require("../../../tests/mocks/user-factory.js");
const opa_abac_js_1 = require("../opa-abac.js");
// Mock function declared before tests
const mockAxiosPost = globals_1.jest.fn();
(0, globals_1.describe)('OPAClient', () => {
    let opaClient;
    const baseUrl = 'http://localhost:8181';
    (0, globals_1.beforeEach)(() => {
        globals_1.jest.clearAllMocks();
        globals_1.jest.spyOn(axios_1.default, 'post').mockImplementation(mockAxiosPost);
        opaClient = new opa_abac_js_1.OPAClient(baseUrl, 5000);
    });
    (0, globals_1.describe)('evaluate', () => {
        (0, globals_1.it)('should return allow=true when OPA policy permits action', async () => {
            // Arrange
            const input = {
                subject: {
                    id: 'user-123',
                    tenantId: 'tenant-abc',
                    roles: ['analyst'],
                    residency: 'US',
                    clearance: 'SECRET',
                },
                resource: {
                    type: 'investigation',
                    id: 'inv-456',
                    tenantId: 'tenant-abc',
                },
                action: 'read',
                context: {
                    ip: '192.168.1.1',
                    time: Date.now(),
                },
            };
            mockAxiosPost.mockResolvedValue({
                data: {
                    result: {
                        allow: true,
                        reason: 'User has analyst role with read permission',
                        obligations: [],
                    },
                },
                status: 200,
            });
            // Act
            const result = await opaClient.evaluate('summit.authz.allow', input);
            // Assert
            (0, globals_1.expect)(result).toEqual({
                allow: true,
                reason: 'User has analyst role with read permission',
                obligations: [],
            });
            (0, globals_1.expect)(mockAxiosPost).toHaveBeenCalledWith(`${baseUrl}/v1/data/summit/authz/allow`, { input }, globals_1.expect.objectContaining({ timeout: 5000 }));
        });
        (0, globals_1.it)('should return allow=false when OPA policy denies action', async () => {
            // Arrange
            const input = {
                subject: {
                    id: 'user-123',
                    tenantId: 'tenant-abc',
                    roles: ['viewer'],
                    residency: 'US',
                    clearance: 'UNCLASSIFIED',
                },
                resource: {
                    type: 'investigation',
                    id: 'inv-456',
                    classification: 'SECRET',
                },
                action: 'read',
                context: {
                    ip: '192.168.1.1',
                    time: Date.now(),
                },
            };
            mockAxiosPost.mockResolvedValue({
                data: {
                    result: {
                        allow: false,
                        reason: 'Insufficient clearance for SECRET resource',
                        obligations: [],
                    },
                },
                status: 200,
            });
            // Act
            const result = await opaClient.evaluate('summit.authz.allow', input);
            // Assert
            (0, globals_1.expect)(result).toEqual({
                allow: false,
                reason: 'Insufficient clearance for SECRET resource',
                obligations: [],
            });
        });
        (0, globals_1.it)('should return obligations when step-up auth required', async () => {
            // Arrange
            const input = {
                subject: {
                    id: 'user-123',
                    tenantId: 'tenant-abc',
                    roles: ['analyst'],
                    residency: 'US',
                    clearance: 'SECRET',
                },
                resource: {
                    type: 'investigation',
                    id: 'inv-456',
                },
                action: 'delete',
                context: {
                    ip: '192.168.1.1',
                    time: Date.now(),
                    protectedActions: ['delete'],
                },
            };
            mockAxiosPost.mockResolvedValue({
                data: {
                    result: {
                        allow: false,
                        reason: 'Step-up authentication required',
                        obligations: [
                            {
                                type: 'step_up_auth',
                                mechanism: 'webauthn',
                                required_acr: 'urn:mace:incommon:iap:silver',
                            },
                        ],
                    },
                },
                status: 200,
            });
            // Act
            const result = await opaClient.evaluate('summit.authz.allow', input);
            // Assert
            (0, globals_1.expect)(result).toEqual({
                allow: false,
                reason: 'Step-up authentication required',
                obligations: [
                    {
                        type: 'step_up_auth',
                        mechanism: 'webauthn',
                        required_acr: 'urn:mace:incommon:iap:silver',
                    },
                ],
            });
        });
        (0, globals_1.it)('should handle OPA server timeout gracefully', async () => {
            // Arrange
            const input = {
                subject: { id: 'user-123', tenantId: 'tenant-abc', roles: ['analyst'] },
                resource: { type: 'investigation' },
                action: 'read',
                context: { ip: '192.168.1.1', time: Date.now() },
            };
            mockAxiosPost.mockRejectedValue({
                code: 'ECONNABORTED',
                message: 'timeout of 5000ms exceeded',
            });
            const result = await opaClient.evaluate('summit.authz.allow', input);
            (0, globals_1.expect)(result).toEqual(globals_1.expect.objectContaining({ allow: false, reason: 'opa_unavailable' }));
        });
        (0, globals_1.it)('should handle OPA server connection errors', async () => {
            // Arrange
            const input = {
                subject: { id: 'user-123', tenantId: 'tenant-abc', roles: ['analyst'] },
                resource: { type: 'investigation' },
                action: 'read',
                context: { ip: '192.168.1.1', time: Date.now() },
            };
            mockAxiosPost.mockRejectedValue({
                code: 'ECONNREFUSED',
                message: 'connect ECONNREFUSED 127.0.0.1:8181',
            });
            const result = await opaClient.evaluate('summit.authz.allow', input);
            (0, globals_1.expect)(result).toEqual(globals_1.expect.objectContaining({ allow: false, reason: 'opa_unavailable' }));
        });
        (0, globals_1.it)('should handle boolean result from simple policy', async () => {
            // Arrange
            const input = { userId: 'user-123', action: 'read' };
            mockAxiosPost.mockResolvedValue({
                data: { result: true },
                status: 200,
            });
            // Act
            const result = await opaClient.evaluate('simple.allow', input);
            // Assert
            (0, globals_1.expect)(result).toBe(true);
        });
    });
});
(0, globals_1.describe)('createABACMiddleware', () => {
    let opaClient;
    let abacMiddleware;
    (0, globals_1.beforeEach)(() => {
        globals_1.jest.clearAllMocks();
        globals_1.jest.spyOn(axios_1.default, 'post').mockImplementation(mockAxiosPost);
        opaClient = new opa_abac_js_1.OPAClient('http://localhost:8181', 5000);
        abacMiddleware = (0, opa_abac_js_1.createABACMiddleware)(opaClient);
    });
    (0, globals_1.describe)('enforce', () => {
        (0, globals_1.it)('should allow request when OPA returns allow=true', async () => {
            // Arrange
            const user = (0, user_factory_js_1.userFactory)({
                id: 'user-123',
                tenantId: 'tenant-abc',
                role: 'analyst',
            });
            const req = (0, request_factory_js_1.requestFactory)({
                user,
                params: { investigationId: 'inv-456' },
            });
            const res = (0, request_factory_js_1.responseFactory)();
            const next = (0, request_factory_js_1.nextFactory)();
            mockAxiosPost.mockResolvedValue({
                data: {
                    result: { allow: true, reason: 'Authorized', obligations: [] },
                },
                status: 200,
            });
            const enforcer = abacMiddleware.enforce('investigation', 'read');
            // Act
            await enforcer(req, res, next);
            // Assert
            (0, globals_1.expect)(next).toHaveBeenCalled();
            (0, globals_1.expect)(res.status).not.toHaveBeenCalled();
        });
        (0, globals_1.it)('should return 403 when OPA returns allow=false', async () => {
            // Arrange
            const user = (0, user_factory_js_1.userFactory)({
                id: 'user-123',
                tenantId: 'tenant-abc',
                role: 'viewer',
            });
            const req = (0, request_factory_js_1.requestFactory)({
                user,
                params: { investigationId: 'inv-456' },
            });
            const res = (0, request_factory_js_1.responseFactory)();
            const next = (0, request_factory_js_1.nextFactory)();
            mockAxiosPost.mockResolvedValue({
                data: {
                    result: { allow: false, reason: 'Insufficient permissions', obligations: [] },
                },
                status: 200,
            });
            const enforcer = abacMiddleware.enforce('investigation', 'delete');
            // Act
            await enforcer(req, res, next);
            // Assert
            (0, globals_1.expect)(res.status).toHaveBeenCalledWith(403);
            (0, globals_1.expect)(res.json).toHaveBeenCalledWith({
                error: 'Forbidden',
                reason: 'Insufficient permissions',
            });
            (0, globals_1.expect)(next).not.toHaveBeenCalled();
        });
        (0, globals_1.it)('should return 401 when request has no authenticated user', async () => {
            // Arrange
            const req = (0, request_factory_js_1.requestFactory)({
                user: null,
                params: { investigationId: 'inv-456' },
            });
            const res = (0, request_factory_js_1.responseFactory)();
            const next = (0, request_factory_js_1.nextFactory)();
            const enforcer = abacMiddleware.enforce('investigation', 'read');
            // Act
            await enforcer(req, res, next);
            // Assert
            (0, globals_1.expect)(res.status).toHaveBeenCalledWith(401);
            (0, globals_1.expect)(res.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
            (0, globals_1.expect)(next).not.toHaveBeenCalled();
        });
        (0, globals_1.it)('should handle step-up auth obligation', async () => {
            // Arrange
            const user = (0, user_factory_js_1.userFactory)({
                id: 'user-123',
                tenantId: 'tenant-abc',
                role: 'analyst',
            });
            const req = (0, request_factory_js_1.requestFactory)({
                user,
                params: { investigationId: 'inv-456' },
            });
            const res = (0, request_factory_js_1.responseFactory)();
            const next = (0, request_factory_js_1.nextFactory)();
            mockAxiosPost.mockResolvedValue({
                data: {
                    result: {
                        allow: false,
                        reason: 'Step-up required',
                        obligations: [
                            {
                                type: 'step_up_auth',
                                mechanism: 'webauthn',
                                required_acr: 'urn:mace:incommon:iap:silver',
                            },
                        ],
                    },
                },
                status: 200,
            });
            const enforcer = abacMiddleware.enforce('investigation', 'delete');
            // Act
            await enforcer(req, res, next);
            // Assert
            (0, globals_1.expect)(res.status).toHaveBeenCalledWith(403);
            (0, globals_1.expect)(res.json).toHaveBeenCalledWith({
                error: 'StepUpRequired',
                reason: 'Step-up required',
                obligation: {
                    type: 'step_up_auth',
                    mechanism: 'webauthn',
                    required_acr: 'urn:mace:incommon:iap:silver',
                },
            });
        });
        (0, globals_1.it)('should handle dual control approval obligation', async () => {
            // Arrange
            const user = (0, user_factory_js_1.userFactory)({
                id: 'user-123',
                tenantId: 'tenant-abc',
                role: 'admin',
            });
            const req = (0, request_factory_js_1.requestFactory)({
                user,
                params: { investigationId: 'inv-456' },
            });
            const res = (0, request_factory_js_1.responseFactory)();
            const next = (0, request_factory_js_1.nextFactory)();
            mockAxiosPost.mockResolvedValue({
                data: {
                    result: {
                        allow: false,
                        reason: 'Dual control approval required',
                        obligations: [
                            {
                                type: 'dual_control',
                                required_approvals: 2,
                            },
                        ],
                    },
                },
                status: 200,
            });
            const enforcer = abacMiddleware.enforce('investigation', 'purge');
            // Act
            await enforcer(req, res, next);
            // Assert
            (0, globals_1.expect)(res.status).toHaveBeenCalledWith(403);
            (0, globals_1.expect)(res.json).toHaveBeenCalledWith(globals_1.expect.objectContaining({
                error: 'DualControlRequired',
            }));
        });
        (0, globals_1.it)('should include tenant isolation in policy input', async () => {
            // Arrange
            const user = (0, user_factory_js_1.userFactory)({
                id: 'user-123',
                tenantId: 'tenant-abc',
                role: 'analyst',
            });
            const req = (0, request_factory_js_1.requestFactory)({
                user,
                params: { investigationId: 'inv-456' },
                headers: { 'x-tenant-id': 'tenant-abc' },
            });
            const res = (0, request_factory_js_1.responseFactory)();
            const next = (0, request_factory_js_1.nextFactory)();
            mockAxiosPost.mockResolvedValue({
                data: {
                    result: { allow: true, reason: 'Authorized', obligations: [] },
                },
                status: 200,
            });
            const enforcer = abacMiddleware.enforce('investigation', 'read');
            // Act
            await enforcer(req, res, next);
            // Assert
            (0, globals_1.expect)(mockAxiosPost).toHaveBeenCalledWith(globals_1.expect.any(String), globals_1.expect.objectContaining({
                input: globals_1.expect.objectContaining({
                    subject: globals_1.expect.objectContaining({
                        tenantId: 'tenant-abc',
                    }),
                }),
            }), globals_1.expect.any(Object));
        });
        (0, globals_1.it)('should fail-closed on OPA server error', async () => {
            // Arrange
            const user = (0, user_factory_js_1.userFactory)({
                id: 'user-123',
                tenantId: 'tenant-abc',
                role: 'analyst',
            });
            const req = (0, request_factory_js_1.requestFactory)({
                user,
                params: { investigationId: 'inv-456' },
            });
            const res = (0, request_factory_js_1.responseFactory)();
            const next = (0, request_factory_js_1.nextFactory)();
            mockAxiosPost.mockRejectedValue(new Error('OPA server unavailable'));
            const enforcer = abacMiddleware.enforce('investigation', 'read');
            // Act
            await enforcer(req, res, next);
            // Assert - Should deny access on error (fail-closed)
            (0, globals_1.expect)(res.status).toHaveBeenCalledWith(503);
            (0, globals_1.expect)(res.json).toHaveBeenCalledWith({
                error: 'ServiceUnavailable',
                message: 'Authorization service temporarily unavailable',
            });
            (0, globals_1.expect)(next).not.toHaveBeenCalled();
        });
    });
});
(0, globals_1.describe)('ABACContext extraction', () => {
    (0, globals_1.it)('should extract IP from x-forwarded-for header', () => {
        const req = (0, request_factory_js_1.requestFactory)({
            headers: { 'x-forwarded-for': '203.0.113.195, 70.41.3.18, 150.172.238.178' },
            ip: '127.0.0.1',
        });
        const context = opa_abac_js_1.ABACContext.fromRequest(req);
        (0, globals_1.expect)(context.ip).toBe('203.0.113.195');
    });
    (0, globals_1.it)('should fallback to req.ip when x-forwarded-for not present', () => {
        const req = (0, request_factory_js_1.requestFactory)({
            headers: {},
            ip: '192.168.1.100',
        });
        const context = opa_abac_js_1.ABACContext.fromRequest(req);
        (0, globals_1.expect)(context.ip).toBe('192.168.1.100');
    });
    (0, globals_1.it)('should extract user agent', () => {
        const req = (0, request_factory_js_1.requestFactory)({
            headers: { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
        });
        const context = opa_abac_js_1.ABACContext.fromRequest(req);
        (0, globals_1.expect)(context.userAgent).toBe('Mozilla/5.0 (Windows NT 10.0; Win64; x64)');
    });
    (0, globals_1.it)('should include current timestamp', () => {
        const before = Date.now();
        const req = (0, request_factory_js_1.requestFactory)({});
        const context = opa_abac_js_1.ABACContext.fromRequest(req);
        const after = Date.now();
        (0, globals_1.expect)(context.time).toBeGreaterThanOrEqual(before);
        (0, globals_1.expect)(context.time).toBeLessThanOrEqual(after);
    });
});
