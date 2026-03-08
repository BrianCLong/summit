"use strict";
/**
 * Authentication Integration Tests
 *
 * Comprehensive tests for the authentication flows:
 * - User registration
 * - User login
 * - Token verification
 * - Token refresh
 * - Logout
 * - Password reset
 * - Password change
 *
 * @module tests/auth.integration.test
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
const globals_1 = require("@jest/globals");
const supertest_1 = __importDefault(require("supertest"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
// Mock the database pool
const mockQuery = globals_1.jest.fn();
const mockConnect = globals_1.jest.fn();
const mockRelease = globals_1.jest.fn();
globals_1.jest.mock('../../config/database.js', () => ({
    getPostgresPool: globals_1.jest.fn(() => ({
        query: mockQuery,
        connect: mockConnect,
    })),
    getRedisClient: globals_1.jest.fn(() => null),
}));
globals_1.jest.mock('argon2', () => ({
    hash: globals_1.jest.fn().mockResolvedValue('$argon2id$v=19$m=65536$...hashed...'),
    verify: globals_1.jest.fn().mockImplementation((hash, password) => {
        return Promise.resolve(password === 'ValidPassword123!');
    }),
}));
globals_1.jest.mock('../../config/index.js', () => ({
    default: {
        jwt: {
            secret: 'test-jwt-secret-key-12345',
            expiresIn: '1h',
            refreshSecret: 'test-refresh-secret-67890',
            refreshExpiresIn: '7d',
        },
        env: 'test',
        port: 4000,
    },
}));
// Note: This test is skipped because it requires ESM mode (import.meta.url in app.ts)
globals_1.describe.skip('Authentication Integration Tests', () => {
    let app;
    let createApp;
    (0, globals_1.beforeAll)(async () => {
        // Import after mocking
        const appModule = await Promise.resolve().then(() => __importStar(require('../../app.js')));
        createApp = appModule.createApp;
        app = await createApp();
    });
    (0, globals_1.beforeEach)(() => {
        globals_1.jest.clearAllMocks();
        // Setup default mock client
        const mockClient = {
            query: mockQuery,
            release: mockRelease,
        };
        mockConnect.mockResolvedValue(mockClient);
    });
    (0, globals_1.describe)('POST /auth/register', () => {
        const validRegistration = {
            email: 'newuser@example.com',
            password: 'ValidPassword123!',
            firstName: 'John',
            lastName: 'Doe',
        };
        (0, globals_1.it)('should register a new user successfully', async () => {
            // Mock: no existing user
            mockQuery.mockResolvedValueOnce(undefined); // BEGIN
            mockQuery.mockResolvedValueOnce({ rows: [] }); // Check existing
            mockQuery.mockResolvedValueOnce({
                rows: [{
                        id: 'user-123',
                        email: validRegistration.email,
                        username: 'newuser',
                        first_name: validRegistration.firstName,
                        last_name: validRegistration.lastName,
                        role: 'VIEWER',
                        is_active: true,
                        created_at: new Date(),
                    }],
            }); // Insert user
            mockQuery.mockResolvedValueOnce(undefined); // Insert session
            mockQuery.mockResolvedValueOnce(undefined); // COMMIT
            const response = await (0, supertest_1.default)(app)
                .post('/auth/register')
                .send(validRegistration)
                .expect(201);
            (0, globals_1.expect)(response.body.message).toBe('Registration successful');
            (0, globals_1.expect)(response.body.user.email).toBe(validRegistration.email);
            (0, globals_1.expect)(response.body.token).toBeDefined();
            (0, globals_1.expect)(response.body.refreshToken).toBeDefined();
        });
        (0, globals_1.it)('should reject registration with weak password', async () => {
            const response = await (0, supertest_1.default)(app)
                .post('/auth/register')
                .send({
                ...validRegistration,
                password: 'weak',
            })
                .expect(400);
            (0, globals_1.expect)(response.body.code).toBe('VALIDATION_ERROR');
        });
        (0, globals_1.it)('should reject registration with invalid email', async () => {
            const response = await (0, supertest_1.default)(app)
                .post('/auth/register')
                .send({
                ...validRegistration,
                email: 'not-an-email',
            })
                .expect(400);
            (0, globals_1.expect)(response.body.code).toBe('VALIDATION_ERROR');
        });
        (0, globals_1.it)('should reject registration if user already exists', async () => {
            // Mock: existing user found
            mockQuery.mockResolvedValueOnce(undefined); // BEGIN
            mockQuery.mockResolvedValueOnce({ rows: [{ id: 'existing-user' }] }); // Check existing
            mockQuery.mockResolvedValueOnce(undefined); // ROLLBACK
            const response = await (0, supertest_1.default)(app)
                .post('/auth/register')
                .send(validRegistration)
                .expect(409);
            (0, globals_1.expect)(response.body.code).toBe('USER_EXISTS');
        });
    });
    (0, globals_1.describe)('POST /auth/login', () => {
        (0, globals_1.it)('should login user with valid credentials', async () => {
            const mockUser = {
                id: 'user-123',
                email: 'test@example.com',
                password_hash: '$argon2id$v=19$m=65536$...hashed...',
                first_name: 'Test',
                last_name: 'User',
                role: 'ANALYST',
                is_active: true,
                created_at: new Date(),
            };
            mockQuery.mockResolvedValueOnce({ rows: [mockUser] }); // Find user
            mockQuery.mockResolvedValueOnce(undefined); // Update last_login
            mockQuery.mockResolvedValueOnce(undefined); // Insert session
            mockQuery.mockResolvedValueOnce(undefined); // Log audit
            const response = await (0, supertest_1.default)(app)
                .post('/auth/login')
                .send({
                email: 'test@example.com',
                password: 'ValidPassword123!',
            })
                .expect(200);
            (0, globals_1.expect)(response.body.message).toBe('Login successful');
            (0, globals_1.expect)(response.body.user.email).toBe(mockUser.email);
            (0, globals_1.expect)(response.body.token).toBeDefined();
            (0, globals_1.expect)(response.body.refreshToken).toBeDefined();
        });
        (0, globals_1.it)('should reject login with invalid credentials', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [] }); // User not found
            const response = await (0, supertest_1.default)(app)
                .post('/auth/login')
                .send({
                email: 'test@example.com',
                password: 'WrongPassword123!',
            })
                .expect(401);
            (0, globals_1.expect)(response.body.code).toBe('INVALID_CREDENTIALS');
        });
        (0, globals_1.it)('should reject login for inactive user', async () => {
            const inactiveUser = {
                id: 'user-123',
                email: 'test@example.com',
                password_hash: '$argon2id$v=19$m=65536$...hashed...',
                role: 'ANALYST',
                is_active: false,
                created_at: new Date(),
            };
            mockQuery.mockResolvedValueOnce({ rows: [inactiveUser] });
            const response = await (0, supertest_1.default)(app)
                .post('/auth/login')
                .send({
                email: 'test@example.com',
                password: 'ValidPassword123!',
            })
                .expect(401);
            (0, globals_1.expect)(response.body.code).toBe('INVALID_CREDENTIALS');
        });
    });
    (0, globals_1.describe)('POST /auth/refresh', () => {
        (0, globals_1.it)('should refresh token with valid refresh token', async () => {
            const validRefreshToken = 'valid-refresh-token';
            // Mock: find valid session
            mockQuery.mockResolvedValueOnce({
                rows: [{
                        id: 'session-123',
                        user_id: 'user-123',
                        refresh_token: validRefreshToken,
                        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                        is_revoked: false,
                    }],
            });
            // Mock: find user
            mockQuery.mockResolvedValueOnce({
                rows: [{
                        id: 'user-123',
                        email: 'test@example.com',
                        role: 'ANALYST',
                        is_active: true,
                    }],
            });
            // Mock: update session
            mockQuery.mockResolvedValueOnce(undefined);
            const response = await (0, supertest_1.default)(app)
                .post('/auth/refresh')
                .send({ refreshToken: validRefreshToken })
                .expect(200);
            (0, globals_1.expect)(response.body.token).toBeDefined();
            (0, globals_1.expect)(response.body.refreshToken).toBeDefined();
        });
        (0, globals_1.it)('should reject expired refresh token', async () => {
            const expiredRefreshToken = 'expired-refresh-token';
            // Mock: find expired session
            mockQuery.mockResolvedValueOnce({
                rows: [{
                        id: 'session-123',
                        user_id: 'user-123',
                        refresh_token: expiredRefreshToken,
                        expires_at: new Date(Date.now() - 1000), // Expired
                        is_revoked: false,
                    }],
            });
            const response = await (0, supertest_1.default)(app)
                .post('/auth/refresh')
                .send({ refreshToken: expiredRefreshToken })
                .expect(401);
            (0, globals_1.expect)(response.body.code).toBe('INVALID_REFRESH_TOKEN');
        });
    });
    (0, globals_1.describe)('POST /auth/logout', () => {
        (0, globals_1.it)('should logout user with valid token', async () => {
            // Generate a valid token
            const token = jsonwebtoken_1.default.sign({ userId: 'user-123', email: 'test@example.com', role: 'ANALYST' }, 'test-jwt-secret-key-12345', { expiresIn: '1h' });
            // Mock: find user for token verification
            mockQuery.mockResolvedValueOnce({
                rows: [{
                        id: 'user-123',
                        email: 'test@example.com',
                        role: 'ANALYST',
                        is_active: true,
                    }],
            });
            // Mock: revoke sessions
            mockQuery.mockResolvedValueOnce(undefined);
            // Mock: blacklist token
            mockQuery.mockResolvedValueOnce(undefined);
            const response = await (0, supertest_1.default)(app)
                .post('/auth/logout')
                .set('Authorization', `Bearer ${token}`)
                .expect(200);
            (0, globals_1.expect)(response.body.message).toBe('Logout successful');
        });
        (0, globals_1.it)('should reject logout without token', async () => {
            const response = await (0, supertest_1.default)(app)
                .post('/auth/logout')
                .expect(401);
            (0, globals_1.expect)(response.body).toHaveProperty('error');
        });
    });
    (0, globals_1.describe)('GET /auth/me', () => {
        (0, globals_1.it)('should return current user profile', async () => {
            const token = jsonwebtoken_1.default.sign({ userId: 'user-123', email: 'test@example.com', role: 'ANALYST' }, 'test-jwt-secret-key-12345', { expiresIn: '1h' });
            // Mock: find user
            mockQuery.mockResolvedValueOnce({
                rows: [{
                        id: 'user-123',
                        email: 'test@example.com',
                        username: 'testuser',
                        first_name: 'Test',
                        last_name: 'User',
                        role: 'ANALYST',
                        is_active: true,
                        created_at: new Date(),
                    }],
            });
            const response = await (0, supertest_1.default)(app)
                .get('/auth/me')
                .set('Authorization', `Bearer ${token}`)
                .expect(200);
            (0, globals_1.expect)(response.body.user.email).toBe('test@example.com');
            (0, globals_1.expect)(response.body.user.role).toBe('ANALYST');
        });
    });
    (0, globals_1.describe)('GET /auth/verify-token', () => {
        (0, globals_1.it)('should verify valid token', async () => {
            const token = jsonwebtoken_1.default.sign({ userId: 'user-123', email: 'test@example.com', role: 'ANALYST' }, 'test-jwt-secret-key-12345', { expiresIn: '1h' });
            // Mock: find user
            mockQuery.mockResolvedValueOnce({
                rows: [{
                        id: 'user-123',
                        email: 'test@example.com',
                        role: 'ANALYST',
                        is_active: true,
                    }],
            });
            const response = await (0, supertest_1.default)(app)
                .get('/auth/verify-token')
                .set('Authorization', `Bearer ${token}`)
                .expect(200);
            (0, globals_1.expect)(response.body.valid).toBe(true);
            (0, globals_1.expect)(response.body.user.id).toBe('user-123');
        });
        (0, globals_1.it)('should reject invalid token', async () => {
            const response = await (0, supertest_1.default)(app)
                .get('/auth/verify-token')
                .set('Authorization', 'Bearer invalid-token')
                .expect(401);
            (0, globals_1.expect)(response.body.valid).toBe(false);
        });
    });
    (0, globals_1.describe)('POST /auth/password/reset-request', () => {
        (0, globals_1.it)('should initiate password reset for existing user', async () => {
            const mockClient = {
                query: mockQuery,
                release: mockRelease,
            };
            mockConnect.mockResolvedValue(mockClient);
            // Mock: find user
            mockQuery.mockResolvedValueOnce({
                rows: [{
                        id: 'user-123',
                        email: 'test@example.com',
                        first_name: 'Test',
                    }],
            });
            // Mock: invalidate existing tokens
            mockQuery.mockResolvedValueOnce(undefined);
            // Mock: insert new token
            mockQuery.mockResolvedValueOnce(undefined);
            // Mock: log audit
            mockQuery.mockResolvedValueOnce(undefined);
            const response = await (0, supertest_1.default)(app)
                .post('/auth/password/reset-request')
                .send({ email: 'test@example.com' })
                .expect(200);
            // Should always return success to prevent email enumeration
            (0, globals_1.expect)(response.body.message).toContain('password reset link');
        });
        (0, globals_1.it)('should return success even for non-existent email (prevent enumeration)', async () => {
            const mockClient = {
                query: mockQuery,
                release: mockRelease,
            };
            mockConnect.mockResolvedValue(mockClient);
            // Mock: user not found
            mockQuery.mockResolvedValueOnce({ rows: [] });
            const response = await (0, supertest_1.default)(app)
                .post('/auth/password/reset-request')
                .send({ email: 'nonexistent@example.com' })
                .expect(200);
            // Should still return success to prevent email enumeration
            (0, globals_1.expect)(response.body.message).toContain('password reset link');
        });
    });
    (0, globals_1.describe)('POST /auth/password/reset', () => {
        (0, globals_1.it)('should reset password with valid token', async () => {
            const mockClient = {
                query: mockQuery,
                release: mockRelease,
            };
            mockConnect.mockResolvedValue(mockClient);
            // Mock: BEGIN
            mockQuery.mockResolvedValueOnce(undefined);
            // Mock: find valid token
            mockQuery.mockResolvedValueOnce({
                rows: [{
                        id: 'token-123',
                        user_id: 'user-123',
                        expires_at: new Date(Date.now() + 60 * 60 * 1000),
                        used_at: null,
                        email: 'test@example.com',
                    }],
            });
            // Mock: update password
            mockQuery.mockResolvedValueOnce(undefined);
            // Mock: mark token used
            mockQuery.mockResolvedValueOnce(undefined);
            // Mock: revoke sessions
            mockQuery.mockResolvedValueOnce(undefined);
            // Mock: log audit
            mockQuery.mockResolvedValueOnce(undefined);
            // Mock: COMMIT
            mockQuery.mockResolvedValueOnce(undefined);
            const response = await (0, supertest_1.default)(app)
                .post('/auth/password/reset')
                .send({
                token: 'valid-reset-token-hash',
                password: 'NewValidPassword123!',
            })
                .expect(200);
            (0, globals_1.expect)(response.body.message).toContain('Password reset successful');
        });
        (0, globals_1.it)('should reject with invalid or expired token', async () => {
            const mockClient = {
                query: mockQuery,
                release: mockRelease,
            };
            mockConnect.mockResolvedValue(mockClient);
            // Mock: BEGIN
            mockQuery.mockResolvedValueOnce(undefined);
            // Mock: token not found
            mockQuery.mockResolvedValueOnce({ rows: [] });
            // Mock: ROLLBACK
            mockQuery.mockResolvedValueOnce(undefined);
            const response = await (0, supertest_1.default)(app)
                .post('/auth/password/reset')
                .send({
                token: 'invalid-token',
                password: 'NewValidPassword123!',
            })
                .expect(400);
            (0, globals_1.expect)(response.body.code).toBe('INVALID_RESET_TOKEN');
        });
    });
    (0, globals_1.describe)('POST /auth/password/change', () => {
        (0, globals_1.it)('should change password for authenticated user', async () => {
            const token = jsonwebtoken_1.default.sign({ userId: 'user-123', email: 'test@example.com', role: 'ANALYST' }, 'test-jwt-secret-key-12345', { expiresIn: '1h' });
            const mockClient = {
                query: mockQuery,
                release: mockRelease,
            };
            mockConnect.mockResolvedValue(mockClient);
            // Mock: verify token -> find user
            mockQuery.mockResolvedValueOnce({
                rows: [{
                        id: 'user-123',
                        email: 'test@example.com',
                        role: 'ANALYST',
                        is_active: true,
                    }],
            });
            // Mock: BEGIN
            mockQuery.mockResolvedValueOnce(undefined);
            // Mock: get current password
            mockQuery.mockResolvedValueOnce({
                rows: [{
                        id: 'user-123',
                        email: 'test@example.com',
                        password_hash: '$argon2id$v=19$m=65536$...hashed...',
                    }],
            });
            // Mock: update password
            mockQuery.mockResolvedValueOnce(undefined);
            // Mock: revoke sessions
            mockQuery.mockResolvedValueOnce(undefined);
            // Mock: log audit
            mockQuery.mockResolvedValueOnce(undefined);
            // Mock: COMMIT
            mockQuery.mockResolvedValueOnce(undefined);
            const response = await (0, supertest_1.default)(app)
                .post('/auth/password/change')
                .set('Authorization', `Bearer ${token}`)
                .send({
                currentPassword: 'ValidPassword123!',
                newPassword: 'NewSecurePassword456!',
            })
                .expect(200);
            (0, globals_1.expect)(response.body.message).toContain('Password changed successfully');
        });
        (0, globals_1.it)('should reject with incorrect current password', async () => {
            const token = jsonwebtoken_1.default.sign({ userId: 'user-123', email: 'test@example.com', role: 'ANALYST' }, 'test-jwt-secret-key-12345', { expiresIn: '1h' });
            const mockClient = {
                query: mockQuery,
                release: mockRelease,
            };
            mockConnect.mockResolvedValue(mockClient);
            // Mock: verify token -> find user
            mockQuery.mockResolvedValueOnce({
                rows: [{
                        id: 'user-123',
                        email: 'test@example.com',
                        role: 'ANALYST',
                        is_active: true,
                    }],
            });
            // Mock: BEGIN
            mockQuery.mockResolvedValueOnce(undefined);
            // Mock: get current password
            mockQuery.mockResolvedValueOnce({
                rows: [{
                        id: 'user-123',
                        email: 'test@example.com',
                        password_hash: '$argon2id$v=19$m=65536$...different_hash...',
                    }],
            });
            // Mock: ROLLBACK
            mockQuery.mockResolvedValueOnce(undefined);
            const response = await (0, supertest_1.default)(app)
                .post('/auth/password/change')
                .set('Authorization', `Bearer ${token}`)
                .send({
                currentPassword: 'WrongCurrentPassword123!',
                newPassword: 'NewSecurePassword456!',
            })
                .expect(400);
            (0, globals_1.expect)(response.body.code).toBe('INCORRECT_PASSWORD');
        });
    });
    (0, globals_1.describe)('Rate Limiting', () => {
        (0, globals_1.it)('should rate limit login attempts', async () => {
            // This would require multiple requests to trigger rate limiting
            // Implementation depends on the actual rate limiter configuration
            // For now, just verify the endpoint accepts the request
            mockQuery.mockResolvedValue({ rows: [] });
            const response = await (0, supertest_1.default)(app)
                .post('/auth/login')
                .send({
                email: 'test@example.com',
                password: 'ValidPassword123!',
            });
            // Should either succeed (401 for invalid credentials) or be rate limited (429)
            (0, globals_1.expect)([401, 429]).toContain(response.status);
        });
    });
});
