"use strict";
/**
 * Tests for authentication middleware
 */
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
const crypto_1 = require("crypto");
const globals_1 = require("@jest/globals");
const AuthService_js_1 = __importDefault(require("../../services/AuthService.js"));
let ensureAuthenticated;
let requirePermission;
const verifyTokenMock = globals_1.jest.fn();
const hasPermissionMock = globals_1.jest.fn();
const requestFactory = (options = {}) => {
    const requestId = (0, crypto_1.randomUUID)();
    return {
        id: requestId,
        headers: {
            'content-type': 'application/json',
            'user-agent': 'IntelGraph-Test/1.0',
            'x-request-id': requestId,
            ...(options.headers || {}),
        },
        body: options.body || {},
        query: options.query || {},
        params: options.params || {},
        user: options.user,
        tenant: options.tenant,
        cookies: options.cookies || {},
        ip: options.ip || '127.0.0.1',
        method: options.method || 'GET',
        url: options.url || '/',
        path: options.path || '/',
        get(name) {
            return this.headers[name.toLowerCase()];
        },
    };
};
const responseFactory = () => {
    const res = {
        statusCode: 200,
        headers: {},
        body: null,
    };
    res.status = globals_1.jest.fn().mockReturnValue(res);
    res.json = globals_1.jest.fn().mockReturnValue(res);
    res.send = globals_1.jest.fn().mockReturnValue(res);
    res.set = globals_1.jest.fn().mockReturnValue(res);
    res.setHeader = globals_1.jest.fn((name, value) => {
        res.headers[name] = value;
        return res;
    });
    res.getHeader = globals_1.jest.fn((name) => res.headers[name]);
    res.end = globals_1.jest.fn();
    return res;
};
const nextFactory = () => globals_1.jest.fn();
const userFactory = (overrides = {}) => {
    const id = (0, crypto_1.randomUUID)();
    const role = overrides.role || 'analyst';
    const tenantId = overrides.tenantId || 'test-tenant-1';
    return {
        id,
        email: overrides.email || `testuser_${id.slice(0, 8)}@test.intelgraph.local`,
        username: overrides.username || `testuser_${id.slice(0, 8)}`,
        role,
        tenantId,
        defaultTenantId: overrides.defaultTenantId || tenantId,
        permissions: overrides.permissions || [],
        isActive: overrides.isActive ?? true,
        scopes: overrides.scopes || [],
        createdAt: overrides.createdAt || new Date(),
        updatedAt: overrides.updatedAt || new Date(),
    };
};
(0, globals_1.describe)('Authentication Middleware', () => {
    (0, globals_1.beforeAll)(async () => {
        ({ ensureAuthenticated, requirePermission } = await Promise.resolve().then(() => __importStar(require('../auth.js'))));
    });
    (0, globals_1.beforeEach)(() => {
        globals_1.jest.clearAllMocks();
        verifyTokenMock.mockReset();
        hasPermissionMock.mockReset();
        AuthService_js_1.default.prototype.verifyToken = verifyTokenMock;
        AuthService_js_1.default.prototype.hasPermission = hasPermissionMock;
    });
    (0, globals_1.describe)('ensureAuthenticated', () => {
        (0, globals_1.it)('should authenticate a valid bearer token', async () => {
            const user = userFactory({ role: 'analyst' });
            const req = requestFactory({
                headers: { authorization: 'Bearer valid-token' },
            });
            const res = responseFactory();
            const next = nextFactory();
            verifyTokenMock.mockResolvedValue(user);
            await ensureAuthenticated(req, res, next);
            (0, globals_1.expect)(verifyTokenMock).toHaveBeenCalledWith('valid-token');
            (0, globals_1.expect)(req.user).toEqual(user);
            (0, globals_1.expect)(next).toHaveBeenCalled();
            (0, globals_1.expect)(res.status).not.toHaveBeenCalled();
        });
        (0, globals_1.it)('should authenticate with x-access-token header', async () => {
            const user = userFactory({ role: 'analyst' });
            const req = requestFactory({
                headers: { 'x-access-token': 'valid-token' },
            });
            const res = responseFactory();
            const next = nextFactory();
            verifyTokenMock.mockResolvedValue(user);
            await ensureAuthenticated(req, res, next);
            (0, globals_1.expect)(verifyTokenMock).toHaveBeenCalledWith('valid-token');
            (0, globals_1.expect)(req.user).toEqual(user);
            (0, globals_1.expect)(next).toHaveBeenCalled();
        });
        (0, globals_1.it)('should reject request without token', async () => {
            const req = requestFactory({
                headers: {},
            });
            const res = responseFactory();
            const next = nextFactory();
            await ensureAuthenticated(req, res, next);
            (0, globals_1.expect)(res.status).toHaveBeenCalledWith(401);
            (0, globals_1.expect)(res.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
            (0, globals_1.expect)(next).not.toHaveBeenCalled();
        });
        (0, globals_1.it)('should reject invalid token', async () => {
            const req = requestFactory({
                headers: { authorization: 'Bearer invalid-token' },
            });
            const res = responseFactory();
            const next = nextFactory();
            verifyTokenMock.mockResolvedValue(null);
            await ensureAuthenticated(req, res, next);
            (0, globals_1.expect)(res.status).toHaveBeenCalledWith(401);
            (0, globals_1.expect)(res.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
            (0, globals_1.expect)(next).not.toHaveBeenCalled();
        });
        (0, globals_1.it)('should handle token verification errors', async () => {
            const req = requestFactory({
                headers: { authorization: 'Bearer error-token' },
            });
            const res = responseFactory();
            const next = nextFactory();
            verifyTokenMock.mockRejectedValue(new Error('Token verification failed'));
            await ensureAuthenticated(req, res, next);
            (0, globals_1.expect)(res.status).toHaveBeenCalledWith(401);
            (0, globals_1.expect)(res.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
            (0, globals_1.expect)(next).not.toHaveBeenCalled();
        });
        (0, globals_1.it)('should handle malformed authorization header', async () => {
            const req = requestFactory({
                headers: { authorization: 'InvalidFormat' },
            });
            const res = responseFactory();
            const next = nextFactory();
            await ensureAuthenticated(req, res, next);
            (0, globals_1.expect)(res.status).toHaveBeenCalledWith(401);
            (0, globals_1.expect)(res.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
            (0, globals_1.expect)(next).not.toHaveBeenCalled();
        });
    });
    (0, globals_1.describe)('requirePermission', () => {
        (0, globals_1.it)('should allow user with required permission', () => {
            const user = userFactory({ role: 'admin', permissions: ['read', 'write', 'delete'] });
            const req = requestFactory({ user });
            const res = responseFactory();
            const next = nextFactory();
            hasPermissionMock.mockReturnValue(true);
            const middleware = requirePermission('write');
            middleware(req, res, next);
            (0, globals_1.expect)(hasPermissionMock).toHaveBeenCalledWith(user, 'write');
            (0, globals_1.expect)(next).toHaveBeenCalled();
            (0, globals_1.expect)(res.status).not.toHaveBeenCalled();
        });
        (0, globals_1.it)('should reject user without required permission', () => {
            const user = userFactory({ role: 'viewer', permissions: ['read'] });
            const req = requestFactory({ user });
            const res = responseFactory();
            const next = nextFactory();
            hasPermissionMock.mockReturnValue(false);
            const middleware = requirePermission('write');
            middleware(req, res, next);
            (0, globals_1.expect)(hasPermissionMock).toHaveBeenCalledWith(user, 'write');
            (0, globals_1.expect)(res.status).toHaveBeenCalledWith(403);
            (0, globals_1.expect)(res.json).toHaveBeenCalledWith({ error: 'Forbidden' });
            (0, globals_1.expect)(next).not.toHaveBeenCalled();
        });
        (0, globals_1.it)('should reject unauthenticated request', () => {
            const req = requestFactory();
            const res = responseFactory();
            const next = nextFactory();
            const middleware = requirePermission('write');
            middleware(req, res, next);
            (0, globals_1.expect)(res.status).toHaveBeenCalledWith(401);
            (0, globals_1.expect)(res.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
            (0, globals_1.expect)(next).not.toHaveBeenCalled();
        });
        (0, globals_1.it)('should work with different permission levels', () => {
            const adminUser = userFactory({ role: 'admin' });
            const req = requestFactory({ user: adminUser });
            const res = responseFactory();
            const next = nextFactory();
            hasPermissionMock.mockReturnValue(true);
            const middleware = requirePermission('admin');
            middleware(req, res, next);
            (0, globals_1.expect)(hasPermissionMock).toHaveBeenCalledWith(adminUser, 'admin');
            (0, globals_1.expect)(next).toHaveBeenCalled();
        });
    });
});
