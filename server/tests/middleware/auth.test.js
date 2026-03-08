"use strict";
/**
 * Comprehensive Auth Middleware Tests
 *
 * Tests for Express authentication and authorization middleware
 * - Token extraction (Bearer, x-access-token header)
 * - User verification
 * - Permission checking
 * - Error handling
 * - Edge cases and security scenarios
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
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
// Mock variables (declared before mocks)
const mockVerifyToken = globals_1.jest.fn();
const mockHasPermission = globals_1.jest.fn();
// ESM-compatible mocking using unstable_mockModule
globals_1.jest.unstable_mockModule('../../src/services/AuthService', () => ({
    __esModule: true,
    default: globals_1.jest.fn(() => ({
        verifyToken: mockVerifyToken,
        hasPermission: mockHasPermission,
    })),
}));
globals_1.jest.unstable_mockModule('argon2', () => ({
    __esModule: true,
    default: {
        hash: globals_1.jest.fn(),
        verify: globals_1.jest.fn(),
    },
    hash: globals_1.jest.fn(),
    verify: globals_1.jest.fn(),
}));
globals_1.jest.unstable_mockModule('../../src/config/database', () => ({
    getPostgresPool: globals_1.jest.fn(() => ({
        connect: globals_1.jest.fn(),
        query: globals_1.jest.fn(),
        end: globals_1.jest.fn(),
    })),
    getRedisClient: globals_1.jest.fn(() => ({
        get: globals_1.jest.fn(),
        set: globals_1.jest.fn(),
        on: globals_1.jest.fn(),
        quit: globals_1.jest.fn(),
        subscribe: globals_1.jest.fn(),
    })),
}));
// Dynamic imports AFTER mocks are set up
const { ensureAuthenticated, requirePermission, authMiddleware, auth } = await Promise.resolve().then(() => __importStar(require('../../src/middleware/auth')));
(0, globals_1.describe)('Auth Middleware', () => {
    let mockRequest;
    let mockResponse;
    let nextFunction;
    (0, globals_1.beforeEach)(() => {
        // Reset request and response mocks
        mockRequest = {
            headers: {},
            user: undefined,
        };
        mockResponse = {
            status: globals_1.jest.fn().mockReturnThis(),
            json: globals_1.jest.fn().mockReturnThis(),
        };
        nextFunction = globals_1.jest.fn();
        // Reset mock implementations
        mockVerifyToken.mockReset();
        mockHasPermission.mockReset();
        // Clear all mocks
        globals_1.jest.clearAllMocks();
    });
    (0, globals_1.describe)('ensureAuthenticated', () => {
        (0, globals_1.describe)('Bearer token authentication', () => {
            (0, globals_1.it)('should authenticate valid Bearer token', async () => {
                const mockUser = {
                    id: 'user123',
                    email: 'test@example.com',
                    role: 'ANALYST',
                    isActive: true,
                    createdAt: new Date(),
                    scopes: [],
                };
                mockRequest.headers = { authorization: 'Bearer valid-token' };
                mockVerifyToken.mockResolvedValue(mockUser);
                await ensureAuthenticated(mockRequest, mockResponse, nextFunction);
                (0, globals_1.expect)(mockVerifyToken).toHaveBeenCalledWith('valid-token');
                (0, globals_1.expect)(mockRequest.user).toEqual(mockUser);
                (0, globals_1.expect)(nextFunction).toHaveBeenCalled();
                (0, globals_1.expect)(mockResponse.status).not.toHaveBeenCalled();
            });
            (0, globals_1.it)('should handle Bearer token with extra spaces', async () => {
                const mockUser = {
                    id: 'user123',
                    email: 'test@example.com',
                    role: 'ANALYST',
                    isActive: true,
                    createdAt: new Date(),
                    scopes: [],
                };
                mockRequest.headers = { authorization: 'Bearer   valid-token-with-spaces' };
                mockVerifyToken.mockResolvedValue(mockUser);
                await ensureAuthenticated(mockRequest, mockResponse, nextFunction);
                (0, globals_1.expect)(mockVerifyToken).toHaveBeenCalledWith('  valid-token-with-spaces');
                (0, globals_1.expect)(mockRequest.user).toEqual(mockUser);
                (0, globals_1.expect)(nextFunction).toHaveBeenCalled();
            });
            (0, globals_1.it)('should reject invalid Bearer token', async () => {
                mockRequest.headers = { authorization: 'Bearer invalid-token' };
                mockVerifyToken.mockResolvedValue(null);
                await ensureAuthenticated(mockRequest, mockResponse, nextFunction);
                (0, globals_1.expect)(mockResponse.status).toHaveBeenCalledWith(401);
                (0, globals_1.expect)(mockResponse.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
                (0, globals_1.expect)(nextFunction).not.toHaveBeenCalled();
            });
            (0, globals_1.it)('should reject malformed Bearer token format', async () => {
                mockRequest.headers = { authorization: 'Bearertoken-without-space' };
                await ensureAuthenticated(mockRequest, mockResponse, nextFunction);
                (0, globals_1.expect)(mockResponse.status).toHaveBeenCalledWith(401);
                (0, globals_1.expect)(mockResponse.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
                (0, globals_1.expect)(nextFunction).not.toHaveBeenCalled();
            });
        });
        (0, globals_1.describe)('x-access-token header authentication', () => {
            (0, globals_1.it)('should authenticate valid x-access-token', async () => {
                const mockUser = {
                    id: 'user456',
                    email: 'user@example.com',
                    role: 'ADMIN',
                    isActive: true,
                    createdAt: new Date(),
                    scopes: [],
                };
                mockRequest.headers = { 'x-access-token': 'valid-token' };
                mockVerifyToken.mockResolvedValue(mockUser);
                await ensureAuthenticated(mockRequest, mockResponse, nextFunction);
                (0, globals_1.expect)(mockVerifyToken).toHaveBeenCalledWith('valid-token');
                (0, globals_1.expect)(mockRequest.user).toEqual(mockUser);
                (0, globals_1.expect)(nextFunction).toHaveBeenCalled();
            });
            (0, globals_1.it)('should prefer Bearer token over x-access-token', async () => {
                const mockUser = {
                    id: 'user789',
                    email: 'admin@example.com',
                    role: 'ADMIN',
                    isActive: true,
                    createdAt: new Date(),
                    scopes: [],
                };
                mockRequest.headers = {
                    authorization: 'Bearer bearer-token',
                    'x-access-token': 'header-token',
                };
                mockVerifyToken.mockResolvedValue(mockUser);
                await ensureAuthenticated(mockRequest, mockResponse, nextFunction);
                (0, globals_1.expect)(mockVerifyToken).toHaveBeenCalledWith('bearer-token');
                (0, globals_1.expect)(nextFunction).toHaveBeenCalled();
            });
            (0, globals_1.it)('should reject invalid x-access-token', async () => {
                mockRequest.headers = { 'x-access-token': 'invalid-token' };
                mockVerifyToken.mockResolvedValue(null);
                await ensureAuthenticated(mockRequest, mockResponse, nextFunction);
                (0, globals_1.expect)(mockResponse.status).toHaveBeenCalledWith(401);
                (0, globals_1.expect)(mockResponse.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
                (0, globals_1.expect)(nextFunction).not.toHaveBeenCalled();
            });
        });
        (0, globals_1.describe)('Missing authentication', () => {
            (0, globals_1.it)('should reject request with no authorization header', async () => {
                mockRequest.headers = {};
                await ensureAuthenticated(mockRequest, mockResponse, nextFunction);
                (0, globals_1.expect)(mockResponse.status).toHaveBeenCalledWith(401);
                (0, globals_1.expect)(mockResponse.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
                (0, globals_1.expect)(nextFunction).not.toHaveBeenCalled();
                (0, globals_1.expect)(mockVerifyToken).not.toHaveBeenCalled();
            });
            (0, globals_1.it)('should reject request with empty authorization header', async () => {
                mockRequest.headers = { authorization: '' };
                await ensureAuthenticated(mockRequest, mockResponse, nextFunction);
                (0, globals_1.expect)(mockResponse.status).toHaveBeenCalledWith(401);
                (0, globals_1.expect)(mockResponse.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
                (0, globals_1.expect)(nextFunction).not.toHaveBeenCalled();
            });
            (0, globals_1.it)('should reject request with only "Bearer" without token', async () => {
                mockRequest.headers = { authorization: 'Bearer ' };
                await ensureAuthenticated(mockRequest, mockResponse, nextFunction);
                (0, globals_1.expect)(mockResponse.status).toHaveBeenCalledWith(401);
                (0, globals_1.expect)(mockResponse.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
                (0, globals_1.expect)(nextFunction).not.toHaveBeenCalled();
            });
        });
        (0, globals_1.describe)('Error handling', () => {
            (0, globals_1.it)('should handle token verification errors', async () => {
                mockRequest.headers = { authorization: 'Bearer error-token' };
                mockVerifyToken.mockRejectedValue(new Error('Database error'));
                await ensureAuthenticated(mockRequest, mockResponse, nextFunction);
                (0, globals_1.expect)(mockResponse.status).toHaveBeenCalledWith(401);
                (0, globals_1.expect)(mockResponse.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
                (0, globals_1.expect)(nextFunction).not.toHaveBeenCalled();
            });
            (0, globals_1.it)('should handle AuthService exceptions gracefully', async () => {
                mockRequest.headers = { authorization: 'Bearer exception-token' };
                mockVerifyToken.mockRejectedValue(new Error('Unexpected error'));
                await ensureAuthenticated(mockRequest, mockResponse, nextFunction);
                (0, globals_1.expect)(mockResponse.status).toHaveBeenCalledWith(401);
                (0, globals_1.expect)(mockResponse.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
            });
            (0, globals_1.it)('should handle undefined user from verifyToken', async () => {
                mockRequest.headers = { authorization: 'Bearer undefined-token' };
                mockVerifyToken.mockResolvedValue(undefined);
                await ensureAuthenticated(mockRequest, mockResponse, nextFunction);
                (0, globals_1.expect)(mockResponse.status).toHaveBeenCalledWith(401);
                (0, globals_1.expect)(mockResponse.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
                (0, globals_1.expect)(nextFunction).not.toHaveBeenCalled();
            });
        });
        (0, globals_1.describe)('Security edge cases', () => {
            (0, globals_1.it)('should reject tokens with SQL injection attempts', async () => {
                mockRequest.headers = { authorization: "Bearer '; DROP TABLE users; --" };
                mockVerifyToken.mockResolvedValue(null);
                await ensureAuthenticated(mockRequest, mockResponse, nextFunction);
                (0, globals_1.expect)(mockResponse.status).toHaveBeenCalledWith(401);
                (0, globals_1.expect)(mockResponse.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
            });
            (0, globals_1.it)('should handle extremely long tokens', async () => {
                const longToken = 'a'.repeat(10000);
                mockRequest.headers = { authorization: `Bearer ${longToken}` };
                mockVerifyToken.mockResolvedValue(null);
                await ensureAuthenticated(mockRequest, mockResponse, nextFunction);
                (0, globals_1.expect)(mockResponse.status).toHaveBeenCalledWith(401);
            });
            (0, globals_1.it)('should handle special characters in tokens', async () => {
                const specialToken = 'token-with-!@#$%^&*()_+={}[]|\\:";\'<>?,./';
                mockRequest.headers = { authorization: `Bearer ${specialToken}` };
                mockVerifyToken.mockResolvedValue(null);
                await ensureAuthenticated(mockRequest, mockResponse, nextFunction);
                (0, globals_1.expect)(mockVerifyToken).toHaveBeenCalledWith(specialToken);
                (0, globals_1.expect)(mockResponse.status).toHaveBeenCalledWith(401);
            });
        });
    });
    (0, globals_1.describe)('requirePermission', () => {
        (0, globals_1.describe)('Permission validation', () => {
            (0, globals_1.it)('should allow request with valid permission', () => {
                const middleware = requirePermission('entity:create');
                mockRequest.user = {
                    id: 'user123',
                    tenantId: 'tenant-test',
                    role: 'ANALYST',
                };
                mockHasPermission.mockReturnValue(true);
                middleware(mockRequest, mockResponse, nextFunction);
                (0, globals_1.expect)(mockHasPermission).toHaveBeenCalledWith(mockRequest.user, 'entity:create');
                (0, globals_1.expect)(nextFunction).toHaveBeenCalled();
                (0, globals_1.expect)(mockResponse.status).not.toHaveBeenCalled();
            });
            (0, globals_1.it)('should deny request without required permission', () => {
                const middleware = requirePermission('user:delete');
                mockRequest.user = { id: 'user123', tenantId: 'tenant-test', role: 'VIEWER' };
                mockHasPermission.mockReturnValue(false);
                middleware(mockRequest, mockResponse, nextFunction);
                (0, globals_1.expect)(mockResponse.status).toHaveBeenCalledWith(403);
                (0, globals_1.expect)(mockResponse.json).toHaveBeenCalledWith({ error: 'Forbidden' });
                (0, globals_1.expect)(nextFunction).not.toHaveBeenCalled();
            });
            (0, globals_1.it)('should validate multiple permission checks', () => {
                const middleware1 = requirePermission('investigation:read');
                const middleware2 = requirePermission('entity:update');
                mockRequest.user = { id: 'user123', tenantId: 'tenant-test', role: 'ANALYST' };
                mockHasPermission.mockReturnValueOnce(true).mockReturnValueOnce(true);
                middleware1(mockRequest, mockResponse, nextFunction);
                (0, globals_1.expect)(nextFunction).toHaveBeenCalledTimes(1);
                middleware2(mockRequest, mockResponse, nextFunction);
                (0, globals_1.expect)(nextFunction).toHaveBeenCalledTimes(2);
            });
        });
        (0, globals_1.describe)('Missing user authentication', () => {
            (0, globals_1.it)('should deny request when user is not authenticated', () => {
                const middleware = requirePermission('entity:read');
                mockRequest.user = undefined;
                middleware(mockRequest, mockResponse, nextFunction);
                (0, globals_1.expect)(mockResponse.status).toHaveBeenCalledWith(401);
                (0, globals_1.expect)(mockResponse.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
                (0, globals_1.expect)(nextFunction).not.toHaveBeenCalled();
                (0, globals_1.expect)(mockHasPermission).not.toHaveBeenCalled();
            });
            (0, globals_1.it)('should deny request when user is null', () => {
                const middleware = requirePermission('entity:read');
                mockRequest.user = null;
                middleware(mockRequest, mockResponse, nextFunction);
                (0, globals_1.expect)(mockResponse.status).toHaveBeenCalledWith(401);
                (0, globals_1.expect)(mockResponse.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
            });
        });
        (0, globals_1.describe)('Admin wildcard permissions', () => {
            (0, globals_1.it)('should allow admin access to any permission', () => {
                const middleware = requirePermission('anything:anywhere');
                mockRequest.user = { id: 'admin123', tenantId: 'tenant-test', role: 'ADMIN' };
                mockHasPermission.mockReturnValue(true);
                middleware(mockRequest, mockResponse, nextFunction);
                (0, globals_1.expect)(nextFunction).toHaveBeenCalled();
                (0, globals_1.expect)(mockResponse.status).not.toHaveBeenCalled();
            });
        });
        (0, globals_1.describe)('Role-specific permissions', () => {
            (0, globals_1.it)('should allow ANALYST to create entities', () => {
                const middleware = requirePermission('entity:create');
                mockRequest.user = { id: 'analyst123', tenantId: 'tenant-test', role: 'ANALYST' };
                mockHasPermission.mockReturnValue(true);
                middleware(mockRequest, mockResponse, nextFunction);
                (0, globals_1.expect)(nextFunction).toHaveBeenCalled();
            });
            (0, globals_1.it)('should deny VIEWER from creating entities', () => {
                const middleware = requirePermission('entity:create');
                mockRequest.user = { id: 'viewer123', tenantId: 'tenant-test', role: 'VIEWER' };
                mockHasPermission.mockReturnValue(false);
                middleware(mockRequest, mockResponse, nextFunction);
                (0, globals_1.expect)(mockResponse.status).toHaveBeenCalledWith(403);
                (0, globals_1.expect)(mockResponse.json).toHaveBeenCalledWith({ error: 'Forbidden' });
            });
            (0, globals_1.it)('should allow VIEWER to read entities', () => {
                const middleware = requirePermission('entity:read');
                mockRequest.user = { id: 'viewer123', tenantId: 'tenant-test', role: 'VIEWER' };
                mockHasPermission.mockReturnValue(true);
                middleware(mockRequest, mockResponse, nextFunction);
                (0, globals_1.expect)(nextFunction).toHaveBeenCalled();
            });
        });
        (0, globals_1.describe)('Permission string formats', () => {
            (0, globals_1.it)('should handle standard permission format (resource:action)', () => {
                const middleware = requirePermission('investigation:read');
                mockRequest.user = { id: 'user123', tenantId: 'tenant-test', role: 'ANALYST' };
                mockHasPermission.mockReturnValue(true);
                middleware(mockRequest, mockResponse, nextFunction);
                (0, globals_1.expect)(mockHasPermission).toHaveBeenCalledWith(mockRequest.user, 'investigation:read');
            });
            (0, globals_1.it)('should handle custom permission strings', () => {
                const middleware = requirePermission('custom-permission');
                mockRequest.user = { id: 'user123', tenantId: 'tenant-test', role: 'ADMIN' };
                mockHasPermission.mockReturnValue(true);
                middleware(mockRequest, mockResponse, nextFunction);
                (0, globals_1.expect)(mockHasPermission).toHaveBeenCalledWith(mockRequest.user, 'custom-permission');
            });
        });
    });
    (0, globals_1.describe)('Middleware aliases', () => {
        (0, globals_1.it)('should export authMiddleware as alias for ensureAuthenticated', () => {
            (0, globals_1.expect)(authMiddleware).toBe(ensureAuthenticated);
        });
        (0, globals_1.it)('should export auth as alias for ensureAuthenticated', () => {
            (0, globals_1.expect)(auth).toBe(ensureAuthenticated);
        });
    });
    (0, globals_1.describe)('Integration scenarios', () => {
        (0, globals_1.it)('should handle authentication followed by permission check', async () => {
            // First: authenticate
            const mockUser = {
                id: 'user123',
                email: 'test@example.com',
                role: 'ANALYST',
                isActive: true,
                createdAt: new Date(),
                scopes: [],
            };
            mockRequest.headers = { authorization: 'Bearer valid-token' };
            mockVerifyToken.mockResolvedValue(mockUser);
            await ensureAuthenticated(mockRequest, mockResponse, nextFunction);
            (0, globals_1.expect)(mockRequest.user).toEqual(mockUser);
            (0, globals_1.expect)(nextFunction).toHaveBeenCalledTimes(1);
            // Second: check permission
            const permissionMiddleware = requirePermission('entity:create');
            mockHasPermission.mockReturnValue(true);
            nextFunction.mockClear();
            permissionMiddleware(mockRequest, mockResponse, nextFunction);
            (0, globals_1.expect)(nextFunction).toHaveBeenCalledTimes(1);
        });
        (0, globals_1.it)('should prevent access when authentication passes but permission fails', async () => {
            // First: authenticate
            const mockUser = {
                id: 'viewer123',
                email: 'viewer@example.com',
                role: 'VIEWER',
                isActive: true,
                createdAt: new Date(),
                scopes: [],
            };
            mockRequest.headers = { authorization: 'Bearer valid-token' };
            mockVerifyToken.mockResolvedValue(mockUser);
            await ensureAuthenticated(mockRequest, mockResponse, nextFunction);
            (0, globals_1.expect)(mockRequest.user).toEqual(mockUser);
            (0, globals_1.expect)(nextFunction).toHaveBeenCalled();
            // Second: check permission (should fail)
            const permissionMiddleware = requirePermission('entity:delete');
            mockHasPermission.mockReturnValue(false);
            permissionMiddleware(mockRequest, mockResponse, nextFunction);
            (0, globals_1.expect)(mockResponse.status).toHaveBeenCalledWith(403);
            (0, globals_1.expect)(mockResponse.json).toHaveBeenCalledWith({ error: 'Forbidden' });
        });
    });
    (0, globals_1.describe)('Type safety and TypeScript', () => {
        (0, globals_1.it)('should properly extend Request with user property', async () => {
            const mockUser = {
                id: 'user123',
                email: 'test@example.com',
                role: 'ANALYST',
                isActive: true,
                createdAt: new Date(),
                scopes: [],
            };
            mockRequest.headers = { authorization: 'Bearer valid-token' };
            mockVerifyToken.mockResolvedValue(mockUser);
            await ensureAuthenticated(mockRequest, mockResponse, nextFunction);
            // TypeScript should allow accessing user property
            (0, globals_1.expect)(mockRequest.user).toBeDefined();
            (0, globals_1.expect)(mockRequest.user?.id).toBe('user123');
        });
    });
    (0, globals_1.describe)('Concurrency and race conditions', () => {
        (0, globals_1.it)('should handle multiple concurrent authentication requests', async () => {
            const mockUser1 = {
                id: 'user1',
                email: 'user1@example.com',
                role: 'ANALYST',
                isActive: true,
                createdAt: new Date(),
                scopes: [],
            };
            const mockUser2 = {
                id: 'user2',
                email: 'user2@example.com',
                role: 'VIEWER',
                isActive: true,
                createdAt: new Date(),
                scopes: [],
            };
            const req1 = { headers: { authorization: 'Bearer token1' }, user: undefined };
            const req2 = { headers: { authorization: 'Bearer token2' }, user: undefined };
            const res1 = { status: globals_1.jest.fn().mockReturnThis(), json: globals_1.jest.fn() };
            const res2 = { status: globals_1.jest.fn().mockReturnThis(), json: globals_1.jest.fn() };
            const next1 = globals_1.jest.fn();
            const next2 = globals_1.jest.fn();
            mockVerifyToken
                .mockResolvedValueOnce(mockUser1)
                .mockResolvedValueOnce(mockUser2);
            await Promise.all([
                ensureAuthenticated(req1, res1, next1),
                ensureAuthenticated(req2, res2, next2),
            ]);
            (0, globals_1.expect)(req1.user).toEqual(mockUser1);
            (0, globals_1.expect)(req2.user).toEqual(mockUser2);
            (0, globals_1.expect)(next1).toHaveBeenCalled();
            (0, globals_1.expect)(next2).toHaveBeenCalled();
        });
    });
});
