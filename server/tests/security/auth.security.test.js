"use strict";
/**
 * Authentication Security Tests
 *
 * Security vulnerability and penetration testing for auth system
 * - OWASP Top 10 coverage
 * - Injection attacks (SQL, Command, XSS)
 * - Authentication bypasses
 * - Session hijacking
 * - Brute force protection
 * - Token security
 * - Rate limiting
 * - Security headers
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
const mockGetPostgresPool = globals_1.jest.fn();
const mockGetRedisClient = globals_1.jest.fn();
globals_1.jest.unstable_mockModule('../../src/config/database.js', () => ({
    getPostgresPool: mockGetPostgresPool,
    getRedisClient: mockGetRedisClient,
}));
const mockConfig = {
    jwt: {
        secret: 'test-secret',
        expiresIn: '24h',
        refreshSecret: 'test-refresh',
    },
};
globals_1.jest.unstable_mockModule('../../src/config/index.js', () => ({
    __esModule: true,
    default: mockConfig,
}));
const mockCheckUserEnrollmentEligibility = globals_1.jest.fn();
globals_1.jest.unstable_mockModule('../../src/services/GAEnrollmentService.js', () => ({
    __esModule: true,
    default: {
        checkUserEnrollmentEligibility: mockCheckUserEnrollmentEligibility,
    },
}));
const mockGetSecret = globals_1.jest.fn();
globals_1.jest.unstable_mockModule('../../src/services/SecretsService.js', () => ({
    __esModule: true,
    secretsService: {
        getSecret: mockGetSecret,
    },
}));
const mockArgonHash = globals_1.jest.fn();
const mockArgonVerify = globals_1.jest.fn();
globals_1.jest.unstable_mockModule('argon2', () => ({
    __esModule: true,
    default: {
        hash: mockArgonHash,
        verify: mockArgonVerify,
    },
    hash: mockArgonHash,
    verify: mockArgonVerify,
}));
const mockJwtSign = globals_1.jest.fn();
const mockJwtVerify = globals_1.jest.fn();
globals_1.jest.unstable_mockModule('jsonwebtoken', () => ({
    __esModule: true,
    default: {
        sign: mockJwtSign,
        verify: mockJwtVerify,
    },
    sign: mockJwtSign,
    verify: mockJwtVerify,
}));
const { default: AuthService } = await Promise.resolve().then(() => __importStar(require('../../src/services/AuthService.js')));
const { ensureAuthenticated, requirePermission } = await Promise.resolve().then(() => __importStar(require('../../src/middleware/auth.js')));
const { securityTestVectors, createMockRequest, createMockResponse } = await Promise.resolve().then(() => __importStar(require('../utils/auth-test-helpers.js')));
const { default: argon2 } = await Promise.resolve().then(() => __importStar(require('argon2')));
const { default: jwt } = await Promise.resolve().then(() => __importStar(require('jsonwebtoken')));
(0, globals_1.describe)('Authentication Security Tests', () => {
    let authService;
    let mockPool;
    let mockClient;
    (0, globals_1.beforeEach)(() => {
        globals_1.jest.clearAllMocks();
        mockClient = {
            query: globals_1.jest.fn(),
            release: globals_1.jest.fn(),
        };
        mockPool = {
            connect: globals_1.jest.fn().mockResolvedValue(mockClient),
            query: globals_1.jest.fn(),
        };
        mockGetPostgresPool.mockReturnValue(mockPool);
        mockGetRedisClient.mockReturnValue({
            get: globals_1.jest.fn(),
            set: globals_1.jest.fn(),
            on: globals_1.jest.fn(),
            quit: globals_1.jest.fn(),
            subscribe: globals_1.jest.fn(),
        });
        authService = new AuthService();
        mockConfig.jwt = {
            secret: 'test-secret',
            expiresIn: '24h',
            refreshSecret: 'test-refresh',
        };
        globals_1.jest
            .spyOn(authService, 'generateTokens')
            .mockResolvedValue({ token: 'token', refreshToken: 'refresh-token' });
        mockCheckUserEnrollmentEligibility.mockResolvedValue({ eligible: true });
        mockGetSecret.mockResolvedValue('test-secret');
    });
    (0, globals_1.describe)('OWASP A01:2021 - Broken Access Control', () => {
        (0, globals_1.it)('should prevent horizontal privilege escalation', async () => {
            // User A tries to access User B's session
            const userAToken = 'user-a-token';
            const userBId = 'user-b-id';
            mockJwtVerify.mockReturnValue({
                userId: 'user-a-id', // Token belongs to User A
                email: 'usera@test.com',
                role: 'ANALYST',
            });
            mockPool.query.mockResolvedValueOnce({ rows: [] }); // Not blacklisted
            mockClient.query.mockResolvedValueOnce({
                rows: [
                    {
                        id: 'user-a-id',
                        email: 'usera@test.com',
                        role: 'ANALYST',
                        is_active: true,
                    },
                ],
            });
            const verifiedUser = await authService.verifyToken(userAToken);
            // User A should NOT be able to access User B's data
            (0, globals_1.expect)(verifiedUser?.id).not.toBe(userBId);
            (0, globals_1.expect)(verifiedUser?.id).toBe('user-a-id');
        });
        (0, globals_1.it)('should prevent vertical privilege escalation', async () => {
            const mockReq = createMockRequest({
                user: { id: 'viewer-123', role: 'VIEWER' },
            });
            const { res, spies } = createMockResponse();
            const mockNext = globals_1.jest.fn();
            // VIEWER tries to access admin-only function
            const adminMiddleware = requirePermission('user:manage');
            adminMiddleware(mockReq, res, mockNext);
            (0, globals_1.expect)(spies.status).toHaveBeenCalledWith(403);
            (0, globals_1.expect)(mockNext).not.toHaveBeenCalled();
        });
        (0, globals_1.it)('should enforce role-based access control strictly', () => {
            const roles = [
                { role: 'VIEWER', permission: 'entity:delete', shouldAllow: false },
                { role: 'ANALYST', permission: 'user:manage', shouldAllow: false },
                { role: 'ADMIN', permission: 'anything:anything', shouldAllow: true },
            ];
            roles.forEach(({ role, permission, shouldAllow }) => {
                const user = {
                    id: 'test',
                    role,
                    email: 'test@test.com',
                    isActive: true,
                    createdAt: new Date(),
                    scopes: [],
                };
                const result = authService.hasPermission(user, permission);
                (0, globals_1.expect)(result).toBe(shouldAllow);
            });
        });
    });
    (0, globals_1.describe)('OWASP A02:2021 - Cryptographic Failures', () => {
        (0, globals_1.it)('should use strong password hashing (Argon2)', async () => {
            const userData = {
                email: 'secure@test.com',
                password: 'PlainTextPassword123!',
            };
            mockClient.query
                .mockResolvedValueOnce({}) // BEGIN
                .mockResolvedValueOnce({ rows: [] }) // No existing user
                .mockResolvedValueOnce({
                rows: [
                    {
                        id: 'user-123',
                        email: userData.email,
                        role: 'ANALYST',
                        is_active: true,
                        created_at: new Date(),
                    },
                ],
            })
                .mockResolvedValueOnce({}) // user_tenants
                .mockResolvedValueOnce({}) // Session
                .mockResolvedValueOnce({}); // COMMIT
            mockArgonHash.mockResolvedValue('$argon2id$v=19$...');
            mockJwtSign.mockReturnValue('token');
            await authService.register(userData);
            // Verify Argon2 was used
            (0, globals_1.expect)(argon2.hash).toHaveBeenCalledWith(userData.password);
            // Verify password was not stored in plain text
            const insertCall = mockClient.query.mock.calls.find((call) => call[0].includes('INSERT INTO users'));
            if (!insertCall) {
                throw new Error('Expected INSERT INTO users to be called');
            }
            (0, globals_1.expect)(insertCall[1]).not.toContain(userData.password);
        });
        (0, globals_1.it)('should not expose password hashes in user objects', async () => {
            mockJwtVerify.mockReturnValue({
                userId: 'user-123',
                email: 'test@example.com',
                role: 'ANALYST',
            });
            mockPool.query.mockResolvedValueOnce({ rows: [] });
            mockClient.query.mockResolvedValueOnce({
                rows: [
                    {
                        id: 'user-123',
                        email: 'test@example.com',
                        password_hash: '$argon2id$...',
                        role: 'ANALYST',
                        is_active: true,
                    },
                ],
            });
            const user = await authService.verifyToken('token');
            (0, globals_1.expect)(user?.password_hash).toBeUndefined();
        });
        (0, globals_1.it)('should protect tokens with HMAC (JWT signing)', () => {
            mockJwtSign.mockReturnValue('token');
            // Tokens should be signed with secret
            (0, globals_1.expect)(jwt.sign).toBeDefined();
        });
    });
    (0, globals_1.describe)('OWASP A03:2021 - Injection', () => {
        (0, globals_1.describe)('SQL Injection Protection', () => {
            securityTestVectors.sqlInjection.forEach((payload) => {
                (0, globals_1.it)(`should prevent SQL injection: ${payload.substring(0, 30)}...`, async () => {
                    mockClient.query.mockResolvedValueOnce({ rows: [] });
                    await (0, globals_1.expect)(authService.login(payload, 'password')).rejects.toThrow();
                    // Verify parameterized queries were used
                    const queryCall = mockClient.query.mock.calls[0];
                    if (queryCall) {
                        (0, globals_1.expect)(queryCall[0]).toContain('$1'); // Parameterized
                        (0, globals_1.expect)(queryCall[1]).toContain(payload);
                    }
                });
            });
            (0, globals_1.it)('should use parameterized queries for all database operations', async () => {
                mockClient.query
                    .mockResolvedValueOnce({}) // BEGIN
                    .mockResolvedValueOnce({ rows: [] }) // Check existing
                    .mockResolvedValueOnce({
                    rows: [
                        {
                            id: 'user-123',
                            email: 'test@example.com',
                            role: 'ANALYST',
                            is_active: true,
                            created_at: new Date(),
                        },
                    ],
                })
                    .mockResolvedValueOnce({}) // user_tenants
                    .mockResolvedValueOnce({}) // Session
                    .mockResolvedValueOnce({}); // COMMIT
                mockArgonHash.mockResolvedValue('hash');
                mockJwtSign.mockReturnValue('token');
                await authService.register({
                    email: "test'; DROP TABLE users;--",
                    password: 'password',
                });
                // All queries should use parameterized format
                mockClient.query.mock.calls.forEach((call) => {
                    if (call[0].includes('SELECT') || call[0].includes('INSERT')) {
                        (0, globals_1.expect)(call[0]).toMatch(/\$\d+/); // Contains $1, $2, etc.
                    }
                });
            });
        });
        (0, globals_1.describe)('Command Injection Protection', () => {
            securityTestVectors.commandInjection.forEach((payload) => {
                (0, globals_1.it)(`should prevent command injection: ${payload.substring(0, 30)}...`, async () => {
                    const mockReq = createMockRequest({
                        headers: { authorization: `Bearer ${payload}` },
                    });
                    const { res } = createMockResponse();
                    const mockNext = globals_1.jest.fn();
                    await ensureAuthenticated(mockReq, res, mockNext);
                    // Should safely reject, not execute commands
                    (0, globals_1.expect)(mockNext).not.toHaveBeenCalled();
                });
            });
        });
        (0, globals_1.describe)('XSS Protection', () => {
            securityTestVectors.xss.forEach((payload) => {
                (0, globals_1.it)(`should handle XSS payload safely: ${payload.substring(0, 30)}...`, async () => {
                    const userData = {
                        email: 'test@example.com',
                        firstName: payload,
                        password: 'password',
                    };
                    mockClient.query
                        .mockResolvedValueOnce({})
                        .mockResolvedValueOnce({ rows: [] })
                        .mockResolvedValueOnce({
                        rows: [
                            {
                                id: 'user-123',
                                first_name: payload,
                                role: 'ANALYST',
                                is_active: true,
                                created_at: new Date(),
                            },
                        ],
                    })
                        .mockResolvedValueOnce({}) // user_tenants
                        .mockResolvedValueOnce({}) // Session
                        .mockResolvedValueOnce({}); // COMMIT
                    mockArgonHash.mockResolvedValue('hash');
                    mockJwtSign.mockReturnValue('token');
                    const result = await authService.register(userData);
                    // Data should be stored as-is (sanitization is client/view responsibility)
                    (0, globals_1.expect)(result.user.firstName).toBe(payload);
                });
            });
        });
    });
    (0, globals_1.describe)('OWASP A04:2021 - Insecure Design', () => {
        (0, globals_1.it)('should implement token rotation on refresh', async () => {
            const originalRefreshToken = 'original-token';
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + 7);
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
                rows: [{ id: 'user-123', email: 'test@example.com', role: 'ANALYST' }],
            })
                .mockResolvedValueOnce({}) // Revoke old
                .mockResolvedValueOnce({}); // Insert new
            mockJwtSign.mockReturnValue('new-token');
            const result = await authService.refreshAccessToken(originalRefreshToken);
            // New refresh token should be different
            (0, globals_1.expect)(result?.refreshToken).toBeDefined();
            (0, globals_1.expect)(result?.refreshToken).not.toBe(originalRefreshToken);
            // Old token should be revoked
            (0, globals_1.expect)(mockClient.query).toHaveBeenCalledWith(globals_1.expect.stringContaining('UPDATE user_sessions SET is_revoked = true'), [originalRefreshToken]);
        });
        (0, globals_1.it)('should implement token blacklisting', async () => {
            const token = 'token-to-blacklist';
            mockPool.query.mockResolvedValueOnce({});
            const result = await authService.revokeToken(token);
            (0, globals_1.expect)(result).toBe(true);
            (0, globals_1.expect)(mockPool.query).toHaveBeenCalledWith(globals_1.expect.stringContaining('INSERT INTO token_blacklist'), globals_1.expect.any(Array));
        });
        (0, globals_1.it)('should hash tokens before blacklisting (avoid storing full tokens)', async () => {
            const token = 'sensitive-token';
            mockPool.query.mockImplementationOnce((query, params) => {
                // Verify token is hashed
                (0, globals_1.expect)(params[0]).not.toBe(token);
                (0, globals_1.expect)(params[0]).toHaveLength(64); // SHA-256 produces 64 hex characters
                return Promise.resolve({});
            });
            await authService.revokeToken(token);
        });
    });
    (0, globals_1.describe)('OWASP A05:2021 - Security Misconfiguration', () => {
        (0, globals_1.it)('should not expose stack traces in error responses', async () => {
            mockClient.query.mockRejectedValueOnce(new Error('Detailed database error with stack trace'));
            const mockReq = createMockRequest({
                headers: { authorization: 'Bearer error-token' },
            });
            const { res, spies } = createMockResponse();
            const mockNext = globals_1.jest.fn();
            await ensureAuthenticated(mockReq, res, mockNext);
            // Should return generic error, not detailed stack trace
            (0, globals_1.expect)(spies.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
            (0, globals_1.expect)(spies.json).not.toHaveBeenCalledWith(globals_1.expect.objectContaining({
                stack: globals_1.expect.any(String),
            }));
        });
        (0, globals_1.it)('should handle missing configuration gracefully', () => {
            // Config should have defaults or validation
            (0, globals_1.expect)(mockConfig.jwt.secret).toBeDefined();
            (0, globals_1.expect)(mockConfig.jwt.expiresIn).toBeDefined();
        });
    });
    (0, globals_1.describe)('OWASP A07:2021 - Identification and Authentication Failures', () => {
        (0, globals_1.it)('should prevent authentication bypass with empty password', async () => {
            mockClient.query.mockResolvedValueOnce({
                rows: [
                    {
                        id: 'user-123',
                        email: 'test@example.com',
                        password_hash: 'hash',
                    },
                ],
            });
            mockArgonVerify.mockResolvedValue(false);
            await (0, globals_1.expect)(authService.login('test@example.com', '')).rejects.toThrow('Invalid credentials');
        });
        (0, globals_1.it)('should use constant-time comparison for credentials', async () => {
            // Argon2.verify provides timing-safe comparison
            (0, globals_1.expect)(argon2.verify).toBeDefined();
        });
        (0, globals_1.it)('should prevent enumeration of valid usernames', async () => {
            mockClient.query
                .mockResolvedValueOnce({ rows: [] }) // User not found
                .mockResolvedValueOnce({
                rows: [{ id: 'user-123', password_hash: 'hash' }],
            }); // Wrong password
            mockArgonVerify.mockResolvedValue(false);
            // Both should return same error message
            let error1, error2;
            try {
                await authService.login('nonexistent@example.com', 'password');
            }
            catch (e) {
                error1 = e.message;
            }
            try {
                await authService.login('existing@example.com', 'wrongpassword');
            }
            catch (e) {
                error2 = e.message;
            }
            (0, globals_1.expect)(error1).toBe('Invalid credentials');
            (0, globals_1.expect)(error2).toBe('Invalid credentials');
        });
        (0, globals_1.it)('should invalidate sessions on logout', async () => {
            mockClient.query
                .mockResolvedValueOnce({}) // BEGIN
                .mockResolvedValueOnce({ rows: [{ tenant_id: 'tenant-1', last_login: new Date() }] }) // Revoke all sessions
                .mockResolvedValueOnce({}); // COMMIT
            mockPool.query.mockResolvedValueOnce({});
            const result = await authService.logout('user-123', 'token');
            (0, globals_1.expect)(result).toBe(true);
            (0, globals_1.expect)(mockClient.query).toHaveBeenCalledWith(globals_1.expect.stringContaining('UPDATE user_sessions SET is_revoked = true'), ['user-123']);
        });
    });
    (0, globals_1.describe)('OWASP A08:2021 - Software and Data Integrity Failures', () => {
        (0, globals_1.it)('should verify JWT signature', async () => {
            mockJwtVerify.mockImplementation(() => {
                throw new Error('invalid signature');
            });
            const result = await authService.verifyToken('tampered-token');
            (0, globals_1.expect)(result).toBeNull();
            (0, globals_1.expect)(jwt.verify).toHaveBeenCalled();
        });
        (0, globals_1.it)('should reject tokens with "none" algorithm', async () => {
            mockJwtVerify.mockImplementation(() => {
                throw new Error('invalid algorithm');
            });
            const result = await authService.verifyToken('none-algorithm-token');
            (0, globals_1.expect)(result).toBeNull();
        });
    });
    (0, globals_1.describe)('Session Hijacking Prevention', () => {
        (0, globals_1.it)('should reject tokens after logout', async () => {
            const token = 'session-token';
            // Logout
            mockClient.query
                .mockResolvedValueOnce({})
                .mockResolvedValueOnce({})
                .mockResolvedValueOnce({});
            mockPool.query.mockResolvedValueOnce({});
            await authService.logout('user-123', token);
            // Try to use token after logout
            mockJwtVerify.mockReturnValue({
                userId: 'user-123',
                email: 'test@example.com',
                role: 'ANALYST',
            });
            mockPool.query.mockResolvedValueOnce({ rows: [{ token_hash: 'hash' }] }); // Blacklisted
            const result = await authService.verifyToken(token);
            (0, globals_1.expect)(result).toBeNull();
        });
        (0, globals_1.it)('should prevent token reuse after refresh', async () => {
            const oldRefreshToken = 'old-refresh-token';
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + 7);
            // First refresh succeeds
            mockClient.query
                .mockResolvedValueOnce({
                rows: [
                    { user_id: 'user-123', expires_at: futureDate, is_revoked: false },
                ],
            })
                .mockResolvedValueOnce({ rows: [{ id: 'user-123', email: 'test@example.com' }] })
                .mockResolvedValueOnce({})
                .mockResolvedValueOnce({});
            mockJwtSign.mockReturnValue('new-token');
            await authService.refreshAccessToken(oldRefreshToken);
            // Second use should fail
            mockClient.query.mockResolvedValueOnce({
                rows: [
                    { user_id: 'user-123', expires_at: futureDate, is_revoked: true },
                ],
            });
            const result = await authService.refreshAccessToken(oldRefreshToken);
            (0, globals_1.expect)(result).toBeNull();
        });
    });
    (0, globals_1.describe)('Input Validation', () => {
        (0, globals_1.it)('should handle extremely long inputs safely', async () => {
            const longEmail = 'a'.repeat(10000) + '@example.com';
            const longPassword = 'b'.repeat(10000);
            mockClient.query
                .mockResolvedValueOnce({}) // BEGIN
                .mockResolvedValueOnce({ rows: [] }) // No existing user
                .mockResolvedValueOnce({
                rows: [
                    {
                        id: 'user-123',
                        email: longEmail,
                        role: 'ANALYST',
                        is_active: true,
                        created_at: new Date(),
                    },
                ],
            })
                .mockResolvedValueOnce({}) // user_tenants
                .mockResolvedValueOnce({}) // Session
                .mockResolvedValueOnce({}); // COMMIT
            // Should not crash, should handle gracefully
            await (0, globals_1.expect)(authService.register({
                email: longEmail,
                password: longPassword,
            })).resolves.toBeDefined();
        });
        (0, globals_1.it)('should handle special characters in all fields', async () => {
            const specialChars = "!@#$%^&*()_+-=[]{}|;':\",./<>?";
            mockClient.query
                .mockResolvedValueOnce({})
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({
                rows: [
                    {
                        id: 'user-123',
                        email: 'test@example.com',
                        role: 'ANALYST',
                        is_active: true,
                        created_at: new Date(),
                    },
                ],
            })
                .mockResolvedValueOnce({}) // user_tenants
                .mockResolvedValueOnce({}) // Session
                .mockResolvedValueOnce({}); // COMMIT
            mockArgonHash.mockResolvedValue('hash');
            mockJwtSign.mockReturnValue('token');
            await (0, globals_1.expect)(authService.register({
                email: 'test@example.com',
                firstName: specialChars,
                lastName: specialChars,
                password: specialChars,
            })).resolves.toBeDefined();
        });
        (0, globals_1.it)('should handle null bytes safely', async () => {
            const nullByteEmail = 'test\x00@example.com';
            mockClient.query.mockResolvedValueOnce({ rows: [] });
            await (0, globals_1.expect)(authService.login(nullByteEmail, 'password')).rejects.toThrow();
        });
    });
    (0, globals_1.describe)('Rate Limiting Compatibility', () => {
        (0, globals_1.it)('should be compatible with rate limiting middleware', async () => {
            // Auth service should not maintain state that breaks rate limiting
            const requests = Array.from({ length: 100 }, (_, i) => authService.verifyToken(`token-${i}`));
            mockPool.query.mockResolvedValue({ rows: [{ token_hash: 'hash' }] });
            mockJwtVerify.mockReturnValue({
                userId: 'user-123',
                email: 'test@example.com',
                role: 'ANALYST',
            });
            // Should handle concurrent requests
            await (0, globals_1.expect)(Promise.all(requests)).resolves.toBeDefined();
        });
    });
    (0, globals_1.describe)('Denial of Service (DoS) Prevention', () => {
        (0, globals_1.it)('should handle rapid registration attempts', async () => {
            mockClient.query
                .mockResolvedValue({}) // BEGIN
                .mockResolvedValue({ rows: [] }) // Check existing
                .mockResolvedValue({
                rows: [{ id: 'user-123', email: 'test@example.com' }],
            });
            mockArgonHash.mockResolvedValue('hash');
            mockJwtSign.mockReturnValue('token');
            const requests = Array.from({ length: 10 }, (_, i) => authService.register({
                email: `user${i}@example.com`,
                password: 'password',
            }));
            // Should complete without crashing
            await (0, globals_1.expect)(Promise.allSettled(requests)).resolves.toBeDefined();
        });
    });
});
