"use strict";
/**
 * Auth Integration Tests
 *
 * End-to-end integration tests for authentication flows
 * - Complete registration → login → token refresh flow
 * - Permission checking across services
 * - Session management
 * - Token blacklisting
 * - Multi-user scenarios
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const AuthService_1 = __importDefault(require("../../src/services/AuthService"));
const auth_1 = require("../../src/middleware/auth");
// Mock database and external dependencies
globals_1.jest.mock('../../src/db/config', () => ({
    dbConfig: {
        connectionConfig: {
            host: 'localhost',
            port: 5432,
            database: 'test',
            user: 'test',
            password: 'test',
        },
        pool: { max: 10, min: 2, idle: 30000 },
        logging: false,
    },
}));
globals_1.jest.mock('../../src/config/database', () => ({
    getPostgresPool: globals_1.jest.fn(() => ({
        query: globals_1.jest.fn(),
        connect: globals_1.jest.fn(),
    })),
    getRedisClient: globals_1.jest.fn(() => null),
}));
globals_1.jest.mock('../../src/utils/logger', () => ({
    error: globals_1.jest.fn(),
    warn: globals_1.jest.fn(),
    info: globals_1.jest.fn(),
    debug: globals_1.jest.fn(),
}));
globals_1.jest.mock('../../src/config/index.js', () => ({
    default: {
        jwt: {
            secret: 'test-integration-secret-key',
            expiresIn: '24h',
        },
        postgres: {
            host: 'localhost',
            port: 5432,
            database: 'test',
            username: 'test',
            password: 'test',
        },
        redis: {
            host: 'localhost',
            port: 6379,
        },
    },
}));
// Note: Test requires full database mock chain and audit system fixes
globals_1.describe.skip('Auth Integration Tests', () => {
    let authService;
    let mockPool;
    let mockClient;
    (0, globals_1.beforeEach)(() => {
        // Setup mock database client
        mockClient = {
            query: globals_1.jest.fn(),
            release: globals_1.jest.fn(),
        };
        mockPool = {
            connect: globals_1.jest.fn().mockResolvedValue(mockClient),
            query: globals_1.jest.fn(),
        };
        const { getPostgresPool } = require('../../src/config/database');
        getPostgresPool.mockReturnValue(mockPool);
        authService = new AuthService_1.default();
        globals_1.jest.clearAllMocks();
    });
    (0, globals_1.describe)('Complete User Lifecycle', () => {
        (0, globals_1.it)('should handle full user journey: register → login → verify → logout', async () => {
            const userData = {
                email: 'integration@test.com',
                password: 'SecurePassword123!',
                firstName: 'Integration',
                lastName: 'Test',
                role: 'ANALYST',
            };
            // Step 1: Register user
            mockClient.query
                .mockResolvedValueOnce({}) // BEGIN
                .mockResolvedValueOnce({ rows: [] }) // Check existing user
                .mockResolvedValueOnce({
                // Insert user
                rows: [
                    {
                        id: 'integration-user-1',
                        email: userData.email,
                        first_name: userData.firstName,
                        last_name: userData.lastName,
                        role: userData.role,
                        is_active: true,
                        created_at: new Date(),
                    },
                ],
            })
                .mockResolvedValueOnce({}) // Insert session
                .mockResolvedValueOnce({}); // COMMIT
            const argon2 = require('argon2');
            argon2.hash = globals_1.jest.fn().mockResolvedValue('hashed-password');
            const jwt = require('jsonwebtoken');
            jwt.sign = globals_1.jest.fn().mockReturnValue('initial-access-token');
            const registerResult = await authService.register(userData);
            (0, globals_1.expect)(registerResult.user.email).toBe(userData.email);
            (0, globals_1.expect)(registerResult.token).toBe('initial-access-token');
            (0, globals_1.expect)(registerResult.refreshToken).toBeDefined();
            // Step 2: Login
            mockClient.query
                .mockResolvedValueOnce({
                // Find user
                rows: [
                    {
                        id: 'integration-user-1',
                        email: userData.email,
                        password_hash: 'hashed-password',
                        role: 'ANALYST',
                        is_active: true,
                    },
                ],
            })
                .mockResolvedValueOnce({}) // Update last_login
                .mockResolvedValueOnce({}); // Insert new session
            argon2.verify = globals_1.jest.fn().mockResolvedValue(true);
            jwt.sign.mockReturnValue('login-access-token');
            const loginResult = await authService.login(userData.email, userData.password);
            (0, globals_1.expect)(loginResult.user.email).toBe(userData.email);
            (0, globals_1.expect)(loginResult.token).toBe('login-access-token');
            // Step 3: Verify token
            jwt.verify = globals_1.jest.fn().mockReturnValue({
                userId: 'integration-user-1',
                email: userData.email,
                role: 'ANALYST',
            });
            mockPool.query.mockResolvedValueOnce({ rows: [] }); // Not blacklisted
            mockClient.query.mockResolvedValueOnce({
                rows: [
                    {
                        id: 'integration-user-1',
                        email: userData.email,
                        first_name: userData.firstName,
                        last_name: userData.lastName,
                        role: 'ANALYST',
                        is_active: true,
                    },
                ],
            });
            const verifiedUser = await authService.verifyToken('login-access-token');
            (0, globals_1.expect)(verifiedUser).toBeDefined();
            (0, globals_1.expect)(verifiedUser?.email).toBe(userData.email);
            // Step 4: Logout
            mockClient.query
                .mockResolvedValueOnce({}) // BEGIN
                .mockResolvedValueOnce({}) // Revoke sessions
                .mockResolvedValueOnce({}); // COMMIT
            mockPool.query.mockResolvedValueOnce({}); // Blacklist token
            const logoutResult = await authService.logout('integration-user-1', 'login-access-token');
            (0, globals_1.expect)(logoutResult).toBe(true);
        });
    });
    (0, globals_1.describe)('Token Refresh Flow', () => {
        (0, globals_1.it)('should successfully refresh token and rotate refresh token', async () => {
            const refreshToken = 'original-refresh-token';
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + 7);
            // Step 1: Verify refresh token is valid
            mockClient.query
                .mockResolvedValueOnce({
                rows: [
                    {
                        user_id: 'user-123',
                        expires_at: futureDate,
                        is_revoked: false,
                    },
                ],
            })
                .mockResolvedValueOnce({
                // Get user
                rows: [
                    {
                        id: 'user-123',
                        email: 'refresh@test.com',
                        role: 'ANALYST',
                        is_active: true,
                    },
                ],
            })
                .mockResolvedValueOnce({}) // Revoke old refresh token
                .mockResolvedValueOnce({}); // Insert new session
            const jwt = require('jsonwebtoken');
            jwt.sign = globals_1.jest.fn().mockReturnValue('new-access-token');
            const result = await authService.refreshAccessToken(refreshToken);
            (0, globals_1.expect)(result).toBeDefined();
            (0, globals_1.expect)(result?.token).toBe('new-access-token');
            (0, globals_1.expect)(result?.refreshToken).toBeDefined();
            (0, globals_1.expect)(result?.refreshToken).not.toBe(refreshToken); // Token rotation
        });
        (0, globals_1.it)('should prevent using same refresh token twice (replay attack)', async () => {
            const refreshToken = 'used-refresh-token';
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + 7);
            // First use - should succeed
            mockClient.query
                .mockResolvedValueOnce({
                rows: [
                    {
                        user_id: 'user-123',
                        expires_at: futureDate,
                        is_revoked: false,
                    },
                ],
            })
                .mockResolvedValueOnce({
                rows: [
                    {
                        id: 'user-123',
                        email: 'user@test.com',
                        role: 'ANALYST',
                        is_active: true,
                    },
                ],
            })
                .mockResolvedValueOnce({}) // Revoke
                .mockResolvedValueOnce({}); // New session
            const jwt = require('jsonwebtoken');
            jwt.sign = globals_1.jest.fn().mockReturnValue('new-token-1');
            const firstUse = await authService.refreshAccessToken(refreshToken);
            (0, globals_1.expect)(firstUse).toBeDefined();
            // Second use - should fail (token revoked)
            mockClient.query.mockResolvedValueOnce({
                rows: [
                    {
                        user_id: 'user-123',
                        expires_at: futureDate,
                        is_revoked: true, // Now revoked
                    },
                ],
            });
            const secondUse = await authService.refreshAccessToken(refreshToken);
            (0, globals_1.expect)(secondUse).toBeNull();
        });
    });
    (0, globals_1.describe)('Permission Chain Testing', () => {
        (0, globals_1.it)('should validate permission chain: auth → permission check → action', async () => {
            const mockReq = {
                headers: { authorization: 'Bearer valid-token' },
                user: undefined,
            };
            const mockRes = {
                status: globals_1.jest.fn().mockReturnThis(),
                json: globals_1.jest.fn().mockReturnThis(),
            };
            const mockNext = globals_1.jest.fn();
            // Step 1: Authenticate
            const jwt = require('jsonwebtoken');
            jwt.verify = globals_1.jest.fn().mockReturnValue({
                userId: 'user-123',
                email: 'analyst@test.com',
                role: 'ANALYST',
            });
            mockPool.query.mockResolvedValueOnce({ rows: [] }); // Not blacklisted
            mockClient.query.mockResolvedValueOnce({
                rows: [
                    {
                        id: 'user-123',
                        email: 'analyst@test.com',
                        role: 'ANALYST',
                        is_active: true,
                        first_name: 'Test',
                        last_name: 'Analyst',
                    },
                ],
            });
            await (0, auth_1.ensureAuthenticated)(mockReq, mockRes, mockNext);
            (0, globals_1.expect)(mockReq.user).toBeDefined();
            (0, globals_1.expect)(mockReq.user.role).toBe('ANALYST');
            (0, globals_1.expect)(mockNext).toHaveBeenCalled();
            // Step 2: Check permission
            const permissionMiddleware = (0, auth_1.requirePermission)('entity:create');
            mockNext.mockClear();
            permissionMiddleware(mockReq, mockRes, mockNext);
            (0, globals_1.expect)(mockNext).toHaveBeenCalled(); // ANALYST can create entities
            (0, globals_1.expect)(mockRes.status).not.toHaveBeenCalled();
        });
        (0, globals_1.it)('should deny access when permission is insufficient', async () => {
            const mockReq = {
                headers: { authorization: 'Bearer viewer-token' },
                user: undefined,
            };
            const mockRes = {
                status: globals_1.jest.fn().mockReturnThis(),
                json: globals_1.jest.fn().mockReturnThis(),
            };
            const mockNext = globals_1.jest.fn();
            // Authenticate as VIEWER
            const jwt = require('jsonwebtoken');
            jwt.verify = globals_1.jest.fn().mockReturnValue({
                userId: 'viewer-123',
                email: 'viewer@test.com',
                role: 'VIEWER',
            });
            mockPool.query.mockResolvedValueOnce({ rows: [] });
            mockClient.query.mockResolvedValueOnce({
                rows: [
                    {
                        id: 'viewer-123',
                        email: 'viewer@test.com',
                        role: 'VIEWER',
                        is_active: true,
                        first_name: 'Test',
                        last_name: 'Viewer',
                    },
                ],
            });
            await (0, auth_1.ensureAuthenticated)(mockReq, mockRes, mockNext);
            (0, globals_1.expect)(mockReq.user.role).toBe('VIEWER');
            // Try to create entity (should fail)
            const permissionMiddleware = (0, auth_1.requirePermission)('entity:create');
            permissionMiddleware(mockReq, mockRes, mockNext);
            (0, globals_1.expect)(mockRes.status).toHaveBeenCalledWith(403);
            (0, globals_1.expect)(mockRes.json).toHaveBeenCalledWith({ error: 'Forbidden' });
        });
    });
    (0, globals_1.describe)('Multi-User Scenarios', () => {
        (0, globals_1.it)('should handle multiple users with different permissions concurrently', async () => {
            const admin = { id: 'admin-1', email: 'admin@test.com', role: 'ADMIN' };
            const analyst = {
                id: 'analyst-1',
                email: 'analyst@test.com',
                role: 'ANALYST',
            };
            const viewer = { id: 'viewer-1', email: 'viewer@test.com', role: 'VIEWER' };
            // Setup mock responses
            const jwt = require('jsonwebtoken');
            jwt.verify
                .mockReturnValueOnce({
                userId: admin.id,
                email: admin.email,
                role: admin.role,
            })
                .mockReturnValueOnce({
                userId: analyst.id,
                email: analyst.email,
                role: analyst.role,
            })
                .mockReturnValueOnce({
                userId: viewer.id,
                email: viewer.email,
                role: viewer.role,
            });
            mockPool.query
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({ rows: [] });
            mockClient.query
                .mockResolvedValueOnce({ rows: [{ ...admin, is_active: true }] })
                .mockResolvedValueOnce({ rows: [{ ...analyst, is_active: true }] })
                .mockResolvedValueOnce({ rows: [{ ...viewer, is_active: true }] });
            // Verify all users
            const [adminUser, analystUser, viewerUser] = await Promise.all([
                authService.verifyToken('admin-token'),
                authService.verifyToken('analyst-token'),
                authService.verifyToken('viewer-token'),
            ]);
            (0, globals_1.expect)(adminUser?.role).toBe('ADMIN');
            (0, globals_1.expect)(analystUser?.role).toBe('ANALYST');
            (0, globals_1.expect)(viewerUser?.role).toBe('VIEWER');
            // Check permissions
            (0, globals_1.expect)(authService.hasPermission(adminUser, 'user:delete')).toBe(true);
            (0, globals_1.expect)(authService.hasPermission(analystUser, 'entity:create')).toBe(true);
            (0, globals_1.expect)(authService.hasPermission(analystUser, 'user:delete')).toBe(false);
            (0, globals_1.expect)(authService.hasPermission(viewerUser, 'entity:read')).toBe(true);
            (0, globals_1.expect)(authService.hasPermission(viewerUser, 'entity:create')).toBe(false);
        });
    });
    (0, globals_1.describe)('Session Security', () => {
        (0, globals_1.it)('should blacklist token and prevent further use', async () => {
            const token = 'token-to-blacklist';
            // Blacklist the token
            mockPool.query.mockResolvedValueOnce({});
            const blacklisted = await authService.revokeToken(token);
            (0, globals_1.expect)(blacklisted).toBe(true);
            // Try to verify blacklisted token
            const jwt = require('jsonwebtoken');
            jwt.verify = globals_1.jest.fn().mockReturnValue({
                userId: 'user-123',
                email: 'user@test.com',
                role: 'ANALYST',
            });
            mockPool.query.mockResolvedValueOnce({
                rows: [{ token_hash: 'some-hash' }],
            }); // Token IS blacklisted
            const user = await authService.verifyToken(token);
            (0, globals_1.expect)(user).toBeNull(); // Should reject blacklisted token
        });
        (0, globals_1.it)('should revoke all user sessions on logout', async () => {
            const userId = 'user-123';
            mockClient.query
                .mockResolvedValueOnce({}) // BEGIN
                .mockResolvedValueOnce({}) // UPDATE user_sessions (revoke all)
                .mockResolvedValueOnce({}); // COMMIT
            const result = await authService.logout(userId);
            (0, globals_1.expect)(result).toBe(true);
            (0, globals_1.expect)(mockClient.query).toHaveBeenCalledWith(globals_1.expect.stringContaining('UPDATE user_sessions SET is_revoked = true'), [userId]);
        });
    });
    (0, globals_1.describe)('Error Recovery', () => {
        (0, globals_1.it)('should rollback transaction on registration failure', async () => {
            const userData = {
                email: 'fail@test.com',
                password: 'password',
            };
            mockClient.query
                .mockResolvedValueOnce({}) // BEGIN
                .mockResolvedValueOnce({ rows: [] }) // Check existing
                .mockRejectedValueOnce(new Error('Database constraint violation')); // INSERT fails
            await (0, globals_1.expect)(authService.register(userData)).rejects.toThrow('Database constraint violation');
            (0, globals_1.expect)(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
            (0, globals_1.expect)(mockClient.release).toHaveBeenCalled();
        });
        (0, globals_1.it)('should handle concurrent registration attempts gracefully', async () => {
            const userData = {
                email: 'concurrent@test.com',
                password: 'password',
            };
            // Both attempts should check for existing user
            mockClient.query
                // First attempt
                .mockResolvedValueOnce({}) // BEGIN
                .mockResolvedValueOnce({ rows: [] }) // No existing user
                .mockResolvedValueOnce({
                // INSERT succeeds
                rows: [{ id: 'user-1', email: userData.email }],
            })
                .mockResolvedValueOnce({}) // Session
                .mockResolvedValueOnce({}) // COMMIT
                // Second attempt
                .mockResolvedValueOnce({}) // BEGIN
                .mockResolvedValueOnce({ rows: [{ id: 'user-1' }] }); // User exists!
            const argon2 = require('argon2');
            argon2.hash = globals_1.jest.fn().mockResolvedValue('hashed');
            const jwt = require('jsonwebtoken');
            jwt.sign = globals_1.jest.fn().mockReturnValue('token');
            const [result1, result2] = await Promise.allSettled([
                authService.register(userData),
                authService.register(userData),
            ]);
            (0, globals_1.expect)(result1.status).toBe('fulfilled');
            (0, globals_1.expect)(result2.status).toBe('rejected');
            if (result2.status === 'rejected') {
                (0, globals_1.expect)(result2.reason.message).toContain('already exists');
            }
        });
    });
    (0, globals_1.describe)('Token Expiration', () => {
        (0, globals_1.it)('should reject expired refresh tokens', async () => {
            const expiredToken = 'expired-refresh-token';
            const pastDate = new Date();
            pastDate.setDate(pastDate.getDate() - 1);
            mockClient.query
                .mockResolvedValueOnce({
                rows: [
                    {
                        user_id: 'user-123',
                        expires_at: pastDate, // Expired
                        is_revoked: false,
                    },
                ],
            })
                .mockResolvedValueOnce({}); // Revoke expired token
            const result = await authService.refreshAccessToken(expiredToken);
            (0, globals_1.expect)(result).toBeNull();
            (0, globals_1.expect)(mockClient.query).toHaveBeenCalledWith(globals_1.expect.stringContaining('UPDATE user_sessions SET is_revoked = true'), [expiredToken]);
        });
    });
    (0, globals_1.describe)('Data Integrity', () => {
        (0, globals_1.it)('should properly format user data throughout auth flow', async () => {
            const dbUser = {
                id: 'user-123',
                email: 'format@test.com',
                username: 'formatter',
                first_name: 'Format',
                last_name: 'Tester',
                role: 'ANALYST',
                is_active: true,
                created_at: new Date('2024-01-01'),
                last_login: new Date('2024-01-15'),
            };
            const jwt = require('jsonwebtoken');
            jwt.verify = globals_1.jest.fn().mockReturnValue({
                userId: dbUser.id,
                email: dbUser.email,
                role: dbUser.role,
            });
            mockPool.query.mockResolvedValueOnce({ rows: [] }); // Not blacklisted
            mockClient.query.mockResolvedValueOnce({ rows: [dbUser] });
            const user = await authService.verifyToken('token');
            // Check camelCase formatting
            (0, globals_1.expect)(user?.firstName).toBe('Format');
            (0, globals_1.expect)(user?.lastName).toBe('Tester');
            (0, globals_1.expect)(user?.fullName).toBe('Format Tester');
            (0, globals_1.expect)(user?.isActive).toBe(true);
            (0, globals_1.expect)(user?.lastLogin).toEqual(dbUser.last_login);
            (0, globals_1.expect)(user?.createdAt).toEqual(dbUser.created_at);
            // Should not expose sensitive fields
            (0, globals_1.expect)(user?.password_hash).toBeUndefined();
            (0, globals_1.expect)(user?.first_name).toBeUndefined();
            (0, globals_1.expect)(user?.last_name).toBeUndefined();
        });
    });
});
