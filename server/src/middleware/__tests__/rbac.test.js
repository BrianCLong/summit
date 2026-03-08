"use strict";
/**
 * Tests for RBAC middleware
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const AuthService_js_1 = __importDefault(require("../../services/AuthService.js"));
const rbac_js_1 = require("../rbac.js");
// Mock function declared before mock
const mockHasPermission = globals_1.jest.fn();
(0, globals_1.describe)('RBAC Middleware', () => {
    const requestFactory = (overrides = {}) => ({
        user: undefined,
        ...overrides,
    });
    const responseFactory = () => ({
        status: globals_1.jest.fn().mockReturnThis(),
        json: globals_1.jest.fn(),
    });
    const nextFactory = () => globals_1.jest.fn();
    const userFactory = (overrides = {}) => ({
        id: 'user-1',
        email: 'user@example.com',
        role: 'viewer',
        permissions: [],
        scopes: [],
        isActive: true,
        ...overrides,
    });
    (0, globals_1.beforeEach)(() => {
        globals_1.jest.clearAllMocks();
        globals_1.jest
            .spyOn(AuthService_js_1.default.prototype, 'hasPermission')
            .mockImplementation(mockHasPermission);
    });
    (0, globals_1.describe)('requirePermission', () => {
        (0, globals_1.it)('should allow user with required permission', () => {
            const user = userFactory({ role: 'analyst', permissions: ['read', 'write'] });
            const req = requestFactory({ user });
            const res = responseFactory();
            const next = nextFactory();
            mockHasPermission.mockReturnValue(true);
            const middleware = (0, rbac_js_1.requirePermission)('write');
            middleware(req, res, next);
            (0, globals_1.expect)(mockHasPermission).toHaveBeenCalledWith(user, 'write');
            (0, globals_1.expect)(next).toHaveBeenCalled();
            (0, globals_1.expect)(res.status).not.toHaveBeenCalled();
        });
        (0, globals_1.it)('should reject user without required permission', () => {
            const user = userFactory({ role: 'viewer', permissions: ['read'] });
            const req = requestFactory({ user });
            const res = responseFactory();
            const next = nextFactory();
            mockHasPermission.mockReturnValue(false);
            const middleware = (0, rbac_js_1.requirePermission)('write');
            middleware(req, res, next);
            (0, globals_1.expect)(res.status).toHaveBeenCalledWith(403);
            (0, globals_1.expect)(res.json).toHaveBeenCalledWith(globals_1.expect.objectContaining({
                error: 'Insufficient permissions',
                required: 'write',
            }));
            (0, globals_1.expect)(next).not.toHaveBeenCalled();
        });
        (0, globals_1.it)('should reject unauthenticated user', () => {
            const req = requestFactory();
            const res = responseFactory();
            const next = nextFactory();
            const middleware = (0, rbac_js_1.requirePermission)('read');
            middleware(req, res, next);
            (0, globals_1.expect)(res.status).toHaveBeenCalledWith(401);
            (0, globals_1.expect)(res.json).toHaveBeenCalledWith({ error: 'Authentication required' });
            (0, globals_1.expect)(next).not.toHaveBeenCalled();
        });
    });
    (0, globals_1.describe)('requireAnyPermission', () => {
        (0, globals_1.it)('should allow user with any of the required permissions', () => {
            const user = userFactory({
                role: 'analyst',
                permissions: ['read', 'export'],
            });
            const req = requestFactory({ user });
            const res = responseFactory();
            const next = nextFactory();
            const middleware = (0, rbac_js_1.requireAnyPermission)(['write', 'export', 'delete']);
            middleware(req, res, next);
            (0, globals_1.expect)(next).toHaveBeenCalled();
            (0, globals_1.expect)(res.status).not.toHaveBeenCalled();
        });
        (0, globals_1.it)('should allow admin regardless of permissions', () => {
            const user = userFactory({ role: 'admin', permissions: [] });
            const req = requestFactory({ user });
            const res = responseFactory();
            const next = nextFactory();
            const middleware = (0, rbac_js_1.requireAnyPermission)(['superpower']);
            middleware(req, res, next);
            (0, globals_1.expect)(next).toHaveBeenCalled();
        });
        (0, globals_1.it)('should reject user without any required permissions', () => {
            const user = userFactory({ role: 'viewer', permissions: ['read'] });
            const req = requestFactory({ user });
            const res = responseFactory();
            const next = nextFactory();
            const middleware = (0, rbac_js_1.requireAnyPermission)(['write', 'delete']);
            middleware(req, res, next);
            (0, globals_1.expect)(res.status).toHaveBeenCalledWith(403);
            (0, globals_1.expect)(res.json).toHaveBeenCalledWith(globals_1.expect.objectContaining({
                error: 'Insufficient permissions',
                required: 'Any of: write, delete',
            }));
            (0, globals_1.expect)(next).not.toHaveBeenCalled();
        });
        (0, globals_1.it)('should reject unauthenticated user', () => {
            const req = requestFactory();
            const res = responseFactory();
            const next = nextFactory();
            const middleware = (0, rbac_js_1.requireAnyPermission)(['read']);
            middleware(req, res, next);
            (0, globals_1.expect)(res.status).toHaveBeenCalledWith(401);
            (0, globals_1.expect)(next).not.toHaveBeenCalled();
        });
    });
    (0, globals_1.describe)('requireAllPermissions', () => {
        (0, globals_1.it)('should allow user with all required permissions', () => {
            const user = userFactory({
                role: 'analyst',
                permissions: ['read', 'write', 'export'],
            });
            const req = requestFactory({ user });
            const res = responseFactory();
            const next = nextFactory();
            const middleware = (0, rbac_js_1.requireAllPermissions)(['read', 'write']);
            middleware(req, res, next);
            (0, globals_1.expect)(next).toHaveBeenCalled();
            (0, globals_1.expect)(res.status).not.toHaveBeenCalled();
        });
        (0, globals_1.it)('should allow admin regardless of permissions', () => {
            const user = userFactory({ role: 'admin', permissions: [] });
            const req = requestFactory({ user });
            const res = responseFactory();
            const next = nextFactory();
            const middleware = (0, rbac_js_1.requireAllPermissions)(['read', 'write', 'delete']);
            middleware(req, res, next);
            (0, globals_1.expect)(next).toHaveBeenCalled();
        });
        (0, globals_1.it)('should reject user missing some required permissions', () => {
            const user = userFactory({ role: 'analyst', permissions: ['read'] });
            const req = requestFactory({ user });
            const res = responseFactory();
            const next = nextFactory();
            const middleware = (0, rbac_js_1.requireAllPermissions)(['read', 'write']);
            middleware(req, res, next);
            (0, globals_1.expect)(res.status).toHaveBeenCalledWith(403);
            (0, globals_1.expect)(res.json).toHaveBeenCalledWith(globals_1.expect.objectContaining({
                error: 'Insufficient permissions',
                required: 'All of: read, write',
            }));
            (0, globals_1.expect)(next).not.toHaveBeenCalled();
        });
        (0, globals_1.it)('should reject unauthenticated user', () => {
            const req = requestFactory();
            const res = responseFactory();
            const next = nextFactory();
            const middleware = (0, rbac_js_1.requireAllPermissions)(['read']);
            middleware(req, res, next);
            (0, globals_1.expect)(res.status).toHaveBeenCalledWith(401);
            (0, globals_1.expect)(next).not.toHaveBeenCalled();
        });
    });
    (0, globals_1.describe)('requireRole', () => {
        (0, globals_1.it)('should allow user with exact role', () => {
            const user = userFactory({ role: 'analyst' });
            const req = requestFactory({ user });
            const res = responseFactory();
            const next = nextFactory();
            const middleware = (0, rbac_js_1.requireRole)('analyst');
            middleware(req, res, next);
            (0, globals_1.expect)(next).toHaveBeenCalled();
            (0, globals_1.expect)(res.status).not.toHaveBeenCalled();
        });
        (0, globals_1.it)('should allow admin for any role requirement', () => {
            const user = userFactory({ role: 'admin' });
            const req = requestFactory({ user });
            const res = responseFactory();
            const next = nextFactory();
            const middleware = (0, rbac_js_1.requireRole)('superuser');
            middleware(req, res, next);
            (0, globals_1.expect)(next).toHaveBeenCalled();
        });
        (0, globals_1.it)('should be case insensitive', () => {
            const user = userFactory({ role: 'ANALYST' });
            const req = requestFactory({ user });
            const res = responseFactory();
            const next = nextFactory();
            const middleware = (0, rbac_js_1.requireRole)('analyst');
            middleware(req, res, next);
            (0, globals_1.expect)(next).toHaveBeenCalled();
        });
        (0, globals_1.it)('should reject user with different role', () => {
            const user = userFactory({ role: 'viewer' });
            const req = requestFactory({ user });
            const res = responseFactory();
            const next = nextFactory();
            const middleware = (0, rbac_js_1.requireRole)('analyst');
            middleware(req, res, next);
            (0, globals_1.expect)(res.status).toHaveBeenCalledWith(403);
            (0, globals_1.expect)(res.json).toHaveBeenCalledWith(globals_1.expect.objectContaining({
                error: 'Insufficient role',
                required: 'analyst',
                userRole: 'viewer',
            }));
            (0, globals_1.expect)(next).not.toHaveBeenCalled();
        });
        (0, globals_1.it)('should reject unauthenticated user', () => {
            const req = requestFactory();
            const res = responseFactory();
            const next = nextFactory();
            const middleware = (0, rbac_js_1.requireRole)('analyst');
            middleware(req, res, next);
            (0, globals_1.expect)(res.status).toHaveBeenCalledWith(401);
            (0, globals_1.expect)(next).not.toHaveBeenCalled();
        });
    });
});
