"use strict";
/**
 * Authentication Test Utilities
 *
 * Shared helpers and fixtures for authentication testing
 * - Mock user factories
 * - Token generators
 * - Request/response mocks
 * - Database mock helpers
 * - Common assertions
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.securityTestVectors = exports.permissionTestCases = exports.mockTokenPayloads = exports.mockTokens = exports.mockDatabaseUsers = exports.mockUsers = void 0;
exports.createMockRequest = createMockRequest;
exports.createMockResponse = createMockResponse;
exports.createMockDatabaseClient = createMockDatabaseClient;
exports.setupRegistrationMocks = setupRegistrationMocks;
exports.setupLoginMocks = setupLoginMocks;
exports.setupTokenVerificationMocks = setupTokenVerificationMocks;
exports.setupRefreshTokenMocks = setupRefreshTokenMocks;
exports.assertAuthenticationSuccess = assertAuthenticationSuccess;
exports.assertAuthenticationFailure = assertAuthenticationFailure;
exports.assertAuthorizationFailure = assertAuthorizationFailure;
exports.assertPermissionGranted = assertPermissionGranted;
exports.generateRandomUser = generateRandomUser;
exports.generateRandomDatabaseUser = generateRandomDatabaseUser;
exports.waitFor = waitFor;
exports.createConcurrentRequests = createConcurrentRequests;
exports.assertTransactionPattern = assertTransactionPattern;
exports.assertRollbackPattern = assertRollbackPattern;
exports.mockJWT = mockJWT;
const globals_1 = require("@jest/globals");
const module_1 = require("module");
const require = (0, module_1.createRequire)(import.meta.url);
/**
 * User Fixtures
 */
exports.mockUsers = {
    admin: {
        id: 'admin-test-123',
        email: 'admin@test.com',
        username: 'admin',
        firstName: 'Admin',
        lastName: 'User',
        fullName: 'Admin User',
        role: 'ADMIN',
        isActive: true,
        createdAt: new Date('2024-01-01'),
    },
    analyst: {
        id: 'analyst-test-456',
        email: 'analyst@test.com',
        username: 'analyst',
        firstName: 'Analyst',
        lastName: 'User',
        fullName: 'Analyst User',
        role: 'ANALYST',
        isActive: true,
        createdAt: new Date('2024-01-01'),
    },
    viewer: {
        id: 'viewer-test-789',
        email: 'viewer@test.com',
        username: 'viewer',
        firstName: 'Viewer',
        lastName: 'User',
        fullName: 'Viewer User',
        role: 'VIEWER',
        isActive: true,
        createdAt: new Date('2024-01-01'),
    },
    inactive: {
        id: 'inactive-test-000',
        email: 'inactive@test.com',
        username: 'inactive',
        firstName: 'Inactive',
        lastName: 'User',
        fullName: 'Inactive User',
        role: 'VIEWER',
        isActive: false,
        createdAt: new Date('2024-01-01'),
    },
};
/**
 * Database User Fixtures (snake_case for DB layer)
 */
exports.mockDatabaseUsers = {
    admin: {
        id: 'admin-test-123',
        email: 'admin@test.com',
        username: 'admin',
        first_name: 'Admin',
        last_name: 'User',
        role: 'ADMIN',
        password_hash: '$argon2id$v=19$m=65536,t=3,p=4$hash',
        is_active: true,
        created_at: new Date('2024-01-01'),
        updated_at: new Date('2024-01-01'),
        last_login: null,
    },
    analyst: {
        id: 'analyst-test-456',
        email: 'analyst@test.com',
        username: 'analyst',
        first_name: 'Analyst',
        last_name: 'User',
        role: 'ANALYST',
        password_hash: '$argon2id$v=19$m=65536,t=3,p=4$hash',
        is_active: true,
        created_at: new Date('2024-01-01'),
        updated_at: new Date('2024-01-01'),
        last_login: null,
    },
    viewer: {
        id: 'viewer-test-789',
        email: 'viewer@test.com',
        username: 'viewer',
        first_name: 'Viewer',
        last_name: 'User',
        role: 'VIEWER',
        password_hash: '$argon2id$v=19$m=65536,t=3,p=4$hash',
        is_active: true,
        created_at: new Date('2024-01-01'),
        updated_at: new Date('2024-01-01'),
        last_login: null,
    },
};
/**
 * Token Fixtures
 */
exports.mockTokens = {
    valid: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.valid',
    expired: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.expired',
    malformed: 'not.a.valid.jwt.token',
    blacklisted: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.blacklisted',
};
/**
 * JWT Payload Fixtures
 */
exports.mockTokenPayloads = {
    admin: {
        userId: exports.mockUsers.admin.id,
        email: exports.mockUsers.admin.email,
        role: exports.mockUsers.admin.role,
    },
    analyst: {
        userId: exports.mockUsers.analyst.id,
        email: exports.mockUsers.analyst.email,
        role: exports.mockUsers.analyst.role,
    },
    viewer: {
        userId: exports.mockUsers.viewer.id,
        email: exports.mockUsers.viewer.email,
        role: exports.mockUsers.viewer.role,
    },
};
/**
 * Create mock Express Request with auth headers
 */
function createMockRequest(options) {
    const req = {
        headers: options.headers || {},
        user: options.user,
        method: options.method || 'GET',
        path: options.path || '/',
        body: options.body || {},
        query: options.query || {},
        params: options.params || {},
    };
    if (options.token) {
        req.headers = {
            ...req.headers,
            authorization: `Bearer ${options.token}`,
        };
    }
    return req;
}
/**
 * Create mock Express Response with spies
 */
function createMockResponse() {
    const spies = {
        status: globals_1.jest.fn().mockReturnThis(),
        json: globals_1.jest.fn().mockReturnThis(),
        send: globals_1.jest.fn().mockReturnThis(),
        sendStatus: globals_1.jest.fn().mockReturnThis(),
        end: globals_1.jest.fn().mockReturnThis(),
    };
    return {
        res: spies,
        spies,
    };
}
/**
 * Create mock database client
 */
function createMockDatabaseClient() {
    const mockClient = {
        query: globals_1.jest.fn(),
        release: globals_1.jest.fn(),
    };
    const mockPool = {
        connect: globals_1.jest.fn().mockResolvedValue(mockClient),
        query: globals_1.jest.fn(),
    };
    return {
        mockClient,
        mockPool,
        setupGetPostgresPool: () => {
            const { getPostgresPool } = require('../../src/config/database');
            getPostgresPool.mockReturnValue(mockPool);
        },
    };
}
/**
 * Setup successful registration flow mocks
 */
function setupRegistrationMocks(mockClient, user = exports.mockDatabaseUsers.analyst) {
    mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [] }) // Check existing user
        .mockResolvedValueOnce({ rows: [user] }) // Insert user
        .mockResolvedValueOnce({}) // Insert session
        .mockResolvedValueOnce({}); // COMMIT
    const argon2 = require('argon2');
    argon2.hash = globals_1.jest.fn().mockResolvedValue('hashed-password');
    const jwt = require('jsonwebtoken');
    jwt.sign = globals_1.jest.fn().mockReturnValue('mock-access-token');
}
/**
 * Setup successful login flow mocks
 */
function setupLoginMocks(mockClient, user = exports.mockDatabaseUsers.analyst) {
    mockClient.query
        .mockResolvedValueOnce({ rows: [user] }) // Find user
        .mockResolvedValueOnce({}) // Update last_login
        .mockResolvedValueOnce({}); // Insert session
    const argon2 = require('argon2');
    argon2.verify = globals_1.jest.fn().mockResolvedValue(true);
    const jwt = require('jsonwebtoken');
    jwt.sign = globals_1.jest.fn().mockReturnValue('mock-access-token');
}
/**
 * Setup successful token verification mocks
 */
function setupTokenVerificationMocks(mockPool, mockClient, user = exports.mockDatabaseUsers.analyst, isBlacklisted = false) {
    const jwt = require('jsonwebtoken');
    jwt.verify = globals_1.jest.fn().mockReturnValue({
        userId: user.id,
        email: user.email,
        role: user.role,
    });
    mockPool.query.mockResolvedValueOnce({
        rows: isBlacklisted ? [{ token_hash: 'hash' }] : [],
    });
    mockClient.query.mockResolvedValueOnce({ rows: [user] });
}
/**
 * Setup refresh token flow mocks
 */
function setupRefreshTokenMocks(mockClient, user = exports.mockDatabaseUsers.analyst, isRevoked = false) {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7);
    mockClient.query
        .mockResolvedValueOnce({
        rows: [
            {
                user_id: user.id,
                expires_at: futureDate,
                is_revoked: isRevoked,
            },
        ],
    })
        .mockResolvedValueOnce({ rows: [user] }) // Get user
        .mockResolvedValueOnce({}) // Revoke old token
        .mockResolvedValueOnce({}); // Insert new session
    const jwt = require('jsonwebtoken');
    jwt.sign = globals_1.jest.fn().mockReturnValue('new-access-token');
}
/**
 * Assert authentication success
 */
function assertAuthenticationSuccess(req, mockNext, mockResponse) {
    expect(req.user).toBeDefined();
    expect(mockNext).toHaveBeenCalled();
    expect(mockResponse.status).not.toHaveBeenCalled();
}
/**
 * Assert authentication failure with 401
 */
function assertAuthenticationFailure(mockNext, mockResponse) {
    expect(mockNext).not.toHaveBeenCalled();
    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
}
/**
 * Assert authorization failure with 403
 */
function assertAuthorizationFailure(mockNext, mockResponse) {
    expect(mockNext).not.toHaveBeenCalled();
    expect(mockResponse.status).toHaveBeenCalledWith(403);
    expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Forbidden' });
}
/**
 * Assert permission check passed
 */
function assertPermissionGranted(mockNext, mockResponse) {
    expect(mockNext).toHaveBeenCalled();
    expect(mockResponse.status).not.toHaveBeenCalled();
}
/**
 * Generate random user data for testing
 */
function generateRandomUser(role = 'ANALYST') {
    const id = `test-${Math.random().toString(36).substr(2, 9)}`;
    const username = `user_${id}`;
    return {
        id,
        email: `${username}@test.com`,
        username,
        firstName: 'Test',
        lastName: 'User',
        fullName: 'Test User',
        role,
        isActive: true,
        createdAt: new Date(),
    };
}
/**
 * Generate random database user (snake_case)
 */
function generateRandomDatabaseUser(role = 'ANALYST') {
    const id = `test-${Math.random().toString(36).substr(2, 9)}`;
    const username = `user_${id}`;
    return {
        id,
        email: `${username}@test.com`,
        username,
        first_name: 'Test',
        last_name: 'User',
        role,
        password_hash: '$argon2id$v=19$m=65536,t=3,p=4$hash',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
        last_login: null,
    };
}
/**
 * Permission test cases
 */
exports.permissionTestCases = {
    admin: [
        'entity:create',
        'entity:read',
        'entity:update',
        'entity:delete',
        'investigation:create',
        'investigation:read',
        'investigation:update',
        'investigation:delete',
        'user:manage',
        'system:configure',
        'anything:whatever',
    ],
    analyst: {
        allowed: [
            'investigation:create',
            'investigation:read',
            'investigation:update',
            'entity:create',
            'entity:read',
            'entity:update',
            'entity:delete',
            'relationship:create',
            'relationship:read',
            'relationship:update',
            'relationship:delete',
            'tag:create',
            'tag:read',
            'tag:delete',
            'graph:read',
            'graph:export',
            'ai:request',
        ],
        denied: ['user:manage', 'system:configure', 'investigation:delete'],
    },
    viewer: {
        allowed: [
            'investigation:read',
            'entity:read',
            'relationship:read',
            'tag:read',
            'graph:read',
            'graph:export',
        ],
        denied: [
            'entity:create',
            'entity:update',
            'entity:delete',
            'investigation:create',
            'investigation:update',
            'investigation:delete',
            'user:manage',
            'ai:request',
        ],
    },
};
/**
 * Wait for async operations (useful for testing)
 */
function waitFor(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
/**
 * Create multiple concurrent requests for load testing
 */
function createConcurrentRequests(count, tokenPrefix = 'token') {
    return Array.from({ length: count }, (_, i) => ({
        req: createMockRequest({ token: `${tokenPrefix}-${i}` }),
        ...createMockResponse(),
        next: globals_1.jest.fn(),
    }));
}
/**
 * Verify database transaction pattern
 */
function assertTransactionPattern(mockClient) {
    const calls = mockClient.query.mock.calls;
    const beginCall = calls.find((call) => call[0] === 'BEGIN');
    const commitCall = calls.find((call) => call[0] === 'COMMIT');
    expect(beginCall).toBeDefined();
    expect(commitCall).toBeDefined();
    expect(mockClient.release).toHaveBeenCalled();
}
/**
 * Verify rollback pattern on error
 */
function assertRollbackPattern(mockClient) {
    const calls = mockClient.query.mock.calls;
    const beginCall = calls.find((call) => call[0] === 'BEGIN');
    const rollbackCall = calls.find((call) => call[0] === 'ROLLBACK');
    expect(beginCall).toBeDefined();
    expect(rollbackCall).toBeDefined();
    expect(mockClient.release).toHaveBeenCalled();
}
/**
 * Mock JWT with custom payload
 */
function mockJWT(payload, options) {
    const jwt = require('jsonwebtoken');
    if (options?.valid === false || options?.expired) {
        jwt.verify = globals_1.jest.fn().mockImplementation(() => {
            throw new Error(options.expired ? 'jwt expired' : 'invalid signature');
        });
    }
    else {
        jwt.verify = globals_1.jest.fn().mockReturnValue(payload);
    }
    jwt.sign = globals_1.jest.fn().mockReturnValue('mock-jwt-token');
    return jwt;
}
/**
 * Security test vectors (for vulnerability testing)
 */
exports.securityTestVectors = {
    sqlInjection: [
        "'; DROP TABLE users; --",
        "1' OR '1'='1",
        "admin'--",
        "' OR 1=1--",
    ],
    xss: [
        '<script>alert("XSS")</script>',
        '"><script>alert(String.fromCharCode(88,83,83))</script>',
        "<img src=x onerror=alert('XSS')>",
    ],
    commandInjection: [
        '; rm -rf /',
        '| cat /etc/passwd',
        '$(whoami)',
        '`ls -la`',
    ],
    pathTraversal: [
        '../../../etc/passwd',
        '..\\..\\..\\windows\\system32',
        '/etc/passwd',
    ],
    longInputs: {
        veryLong: 'a'.repeat(10000),
        extremelyLong: 'b'.repeat(100000),
    },
};
/**
 * Export all utilities as default
 */
exports.default = {
    mockUsers: exports.mockUsers,
    mockDatabaseUsers: exports.mockDatabaseUsers,
    mockTokens: exports.mockTokens,
    mockTokenPayloads: exports.mockTokenPayloads,
    createMockRequest,
    createMockResponse,
    createMockDatabaseClient,
    setupRegistrationMocks,
    setupLoginMocks,
    setupTokenVerificationMocks,
    setupRefreshTokenMocks,
    assertAuthenticationSuccess,
    assertAuthenticationFailure,
    assertAuthorizationFailure,
    assertPermissionGranted,
    generateRandomUser,
    generateRandomDatabaseUser,
    permissionTestCases: exports.permissionTestCases,
    waitFor,
    createConcurrentRequests,
    assertTransactionPattern,
    assertRollbackPattern,
    mockJWT,
    securityTestVectors: exports.securityTestVectors,
};
