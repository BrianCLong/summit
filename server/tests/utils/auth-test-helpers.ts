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

import { Request, Response } from 'express';

/**
 * User Fixtures
 */
export const mockUsers = {
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
export const mockDatabaseUsers = {
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
export const mockTokens = {
  valid: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.valid',
  expired: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.expired',
  malformed: 'not.a.valid.jwt.token',
  blacklisted: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.blacklisted',
};

/**
 * JWT Payload Fixtures
 */
export const mockTokenPayloads = {
  admin: {
    userId: mockUsers.admin.id,
    email: mockUsers.admin.email,
    role: mockUsers.admin.role,
  },
  analyst: {
    userId: mockUsers.analyst.id,
    email: mockUsers.analyst.email,
    role: mockUsers.analyst.role,
  },
  viewer: {
    userId: mockUsers.viewer.id,
    email: mockUsers.viewer.email,
    role: mockUsers.viewer.role,
  },
};

/**
 * Create mock Express Request with auth headers
 */
export function createMockRequest(options: {
  user?: any;
  token?: string;
  headers?: Record<string, string>;
  method?: string;
  path?: string;
  body?: any;
  query?: any;
  params?: any;
}): Partial<Request> {
  const req: Partial<Request> = {
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
export function createMockResponse(): {
  res: Partial<Response>;
  spies: {
    status: jest.Mock;
    json: jest.Mock;
    send: jest.Mock;
    sendStatus: jest.Mock;
    end: jest.Mock;
  };
} {
  const spies = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    sendStatus: jest.fn().mockReturnThis(),
    end: jest.fn().mockReturnThis(),
  };

  return {
    res: spies,
    spies,
  };
}

/**
 * Create mock database client
 */
export function createMockDatabaseClient() {
  const mockClient = {
    query: jest.fn(),
    release: jest.fn(),
  };

  const mockPool = {
    connect: jest.fn().mockResolvedValue(mockClient),
    query: jest.fn(),
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
export function setupRegistrationMocks(mockClient: any, user: any = mockDatabaseUsers.analyst) {
  mockClient.query
    .mockResolvedValueOnce({}) // BEGIN
    .mockResolvedValueOnce({ rows: [] }) // Check existing user
    .mockResolvedValueOnce({ rows: [user] }) // Insert user
    .mockResolvedValueOnce({}) // Insert session
    .mockResolvedValueOnce({}); // COMMIT

  const argon2 = require('argon2');
  argon2.hash = jest.fn().mockResolvedValue('hashed-password');

  const jwt = require('jsonwebtoken');
  jwt.sign = jest.fn().mockReturnValue('mock-access-token');
}

/**
 * Setup successful login flow mocks
 */
export function setupLoginMocks(mockClient: any, user: any = mockDatabaseUsers.analyst) {
  mockClient.query
    .mockResolvedValueOnce({ rows: [user] }) // Find user
    .mockResolvedValueOnce({}) // Update last_login
    .mockResolvedValueOnce({}); // Insert session

  const argon2 = require('argon2');
  argon2.verify = jest.fn().mockResolvedValue(true);

  const jwt = require('jsonwebtoken');
  jwt.sign = jest.fn().mockReturnValue('mock-access-token');
}

/**
 * Setup successful token verification mocks
 */
export function setupTokenVerificationMocks(
  mockPool: any,
  mockClient: any,
  user: any = mockDatabaseUsers.analyst,
  isBlacklisted: boolean = false,
) {
  const jwt = require('jsonwebtoken');
  jwt.verify = jest.fn().mockReturnValue({
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
export function setupRefreshTokenMocks(
  mockClient: any,
  user: any = mockDatabaseUsers.analyst,
  isRevoked: boolean = false,
) {
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
  jwt.sign = jest.fn().mockReturnValue('new-access-token');
}

/**
 * Assert authentication success
 */
export function assertAuthenticationSuccess(req: any, mockNext: jest.Mock, mockResponse: any) {
  expect(req.user).toBeDefined();
  expect(mockNext).toHaveBeenCalled();
  expect(mockResponse.status).not.toHaveBeenCalled();
}

/**
 * Assert authentication failure with 401
 */
export function assertAuthenticationFailure(mockNext: jest.Mock, mockResponse: any) {
  expect(mockNext).not.toHaveBeenCalled();
  expect(mockResponse.status).toHaveBeenCalledWith(401);
  expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
}

/**
 * Assert authorization failure with 403
 */
export function assertAuthorizationFailure(mockNext: jest.Mock, mockResponse: any) {
  expect(mockNext).not.toHaveBeenCalled();
  expect(mockResponse.status).toHaveBeenCalledWith(403);
  expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Forbidden' });
}

/**
 * Assert permission check passed
 */
export function assertPermissionGranted(mockNext: jest.Mock, mockResponse: any) {
  expect(mockNext).toHaveBeenCalled();
  expect(mockResponse.status).not.toHaveBeenCalled();
}

/**
 * Generate random user data for testing
 */
export function generateRandomUser(role: 'ADMIN' | 'ANALYST' | 'VIEWER' = 'ANALYST') {
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
export function generateRandomDatabaseUser(role: 'ADMIN' | 'ANALYST' | 'VIEWER' = 'ANALYST') {
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
export const permissionTestCases = {
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
export function waitFor(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Create multiple concurrent requests for load testing
 */
export function createConcurrentRequests(count: number, tokenPrefix: string = 'token') {
  return Array.from({ length: count }, (_, i) => ({
    req: createMockRequest({ token: `${tokenPrefix}-${i}` }),
    ...createMockResponse(),
    next: jest.fn(),
  }));
}

/**
 * Verify database transaction pattern
 */
export function assertTransactionPattern(mockClient: any) {
  const calls = mockClient.query.mock.calls;
  const beginCall = calls.find((call: any) => call[0] === 'BEGIN');
  const commitCall = calls.find((call: any) => call[0] === 'COMMIT');

  expect(beginCall).toBeDefined();
  expect(commitCall).toBeDefined();
  expect(mockClient.release).toHaveBeenCalled();
}

/**
 * Verify rollback pattern on error
 */
export function assertRollbackPattern(mockClient: any) {
  const calls = mockClient.query.mock.calls;
  const beginCall = calls.find((call: any) => call[0] === 'BEGIN');
  const rollbackCall = calls.find((call: any) => call[0] === 'ROLLBACK');

  expect(beginCall).toBeDefined();
  expect(rollbackCall).toBeDefined();
  expect(mockClient.release).toHaveBeenCalled();
}

/**
 * Mock JWT with custom payload
 */
export function mockJWT(payload: any, options?: { valid?: boolean; expired?: boolean }) {
  const jwt = require('jsonwebtoken');

  if (options?.valid === false || options?.expired) {
    jwt.verify = jest.fn().mockImplementation(() => {
      throw new Error(options.expired ? 'jwt expired' : 'invalid signature');
    });
  } else {
    jwt.verify = jest.fn().mockReturnValue(payload);
  }

  jwt.sign = jest.fn().mockReturnValue('mock-jwt-token');

  return jwt;
}

/**
 * Security test vectors (for vulnerability testing)
 */
export const securityTestVectors = {
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
export default {
  mockUsers,
  mockDatabaseUsers,
  mockTokens,
  mockTokenPayloads,
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
  permissionTestCases,
  waitFor,
  createConcurrentRequests,
  assertTransactionPattern,
  assertRollbackPattern,
  mockJWT,
  securityTestVectors,
};
