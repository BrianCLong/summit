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

import AuthService from '../../src/services/AuthService';
import { ensureAuthenticated, requirePermission } from '../../src/middleware/auth';
import { Request, Response } from 'express';

// Mock database and external dependencies
jest.mock('../../src/config/database');
jest.mock('../../src/utils/logger', () => ({
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
}));

jest.mock('../../src/config/index.js', () => ({
  default: {
    jwt: {
      secret: 'test-integration-secret-key',
      expiresIn: '24h',
    },
  },
}));

describe('Auth Integration Tests', () => {
  let authService: AuthService;
  let mockPool: any;
  let mockClient: any;

  beforeEach(() => {
    // Setup mock database client
    mockClient = {
      query: jest.fn(),
      release: jest.fn(),
    };

    mockPool = {
      connect: jest.fn().mockResolvedValue(mockClient),
      query: jest.fn(),
    };

    const { getPostgresPool } = require('../../src/config/database');
    getPostgresPool.mockReturnValue(mockPool);

    authService = new AuthService();
    jest.clearAllMocks();
  });

  describe('Complete User Lifecycle', () => {
    it('should handle full user journey: register → login → verify → logout', async () => {
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
      argon2.hash = jest.fn().mockResolvedValue('hashed-password');

      const jwt = require('jsonwebtoken');
      jwt.sign = jest.fn().mockReturnValue('initial-access-token');

      const registerResult = await authService.register(userData);

      expect(registerResult.user.email).toBe(userData.email);
      expect(registerResult.token).toBe('initial-access-token');
      expect(registerResult.refreshToken).toBeDefined();

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

      argon2.verify = jest.fn().mockResolvedValue(true);
      jwt.sign.mockReturnValue('login-access-token');

      const loginResult = await authService.login(
        userData.email,
        userData.password,
      );

      expect(loginResult.user.email).toBe(userData.email);
      expect(loginResult.token).toBe('login-access-token');

      // Step 3: Verify token
      jwt.verify = jest.fn().mockReturnValue({
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

      expect(verifiedUser).toBeDefined();
      expect(verifiedUser?.email).toBe(userData.email);

      // Step 4: Logout
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({}) // Revoke sessions
        .mockResolvedValueOnce({}); // COMMIT

      mockPool.query.mockResolvedValueOnce({}); // Blacklist token

      const logoutResult = await authService.logout(
        'integration-user-1',
        'login-access-token',
      );

      expect(logoutResult).toBe(true);
    });
  });

  describe('Token Refresh Flow', () => {
    it('should successfully refresh token and rotate refresh token', async () => {
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
      jwt.sign = jest.fn().mockReturnValue('new-access-token');

      const result = await authService.refreshAccessToken(refreshToken);

      expect(result).toBeDefined();
      expect(result?.token).toBe('new-access-token');
      expect(result?.refreshToken).toBeDefined();
      expect(result?.refreshToken).not.toBe(refreshToken); // Token rotation
    });

    it('should prevent using same refresh token twice (replay attack)', async () => {
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
      jwt.sign = jest.fn().mockReturnValue('new-token-1');

      const firstUse = await authService.refreshAccessToken(refreshToken);
      expect(firstUse).toBeDefined();

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
      expect(secondUse).toBeNull();
    });
  });

  describe('Permission Chain Testing', () => {
    it('should validate permission chain: auth → permission check → action', async () => {
      const mockReq: any = {
        headers: { authorization: 'Bearer valid-token' },
        user: undefined,
      };
      const mockRes: any = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };
      const mockNext = jest.fn();

      // Step 1: Authenticate
      const jwt = require('jsonwebtoken');
      jwt.verify = jest.fn().mockReturnValue({
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

      await ensureAuthenticated(mockReq, mockRes, mockNext);

      expect(mockReq.user).toBeDefined();
      expect(mockReq.user.role).toBe('ANALYST');
      expect(mockNext).toHaveBeenCalled();

      // Step 2: Check permission
      const permissionMiddleware = requirePermission('entity:create');
      mockNext.mockClear();

      permissionMiddleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled(); // ANALYST can create entities
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should deny access when permission is insufficient', async () => {
      const mockReq: any = {
        headers: { authorization: 'Bearer viewer-token' },
        user: undefined,
      };
      const mockRes: any = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };
      const mockNext = jest.fn();

      // Authenticate as VIEWER
      const jwt = require('jsonwebtoken');
      jwt.verify = jest.fn().mockReturnValue({
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

      await ensureAuthenticated(mockReq, mockRes, mockNext);
      expect(mockReq.user.role).toBe('VIEWER');

      // Try to create entity (should fail)
      const permissionMiddleware = requirePermission('entity:create');
      permissionMiddleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Forbidden' });
    });
  });

  describe('Multi-User Scenarios', () => {
    it('should handle multiple users with different permissions concurrently', async () => {
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

      expect(adminUser?.role).toBe('ADMIN');
      expect(analystUser?.role).toBe('ANALYST');
      expect(viewerUser?.role).toBe('VIEWER');

      // Check permissions
      expect(authService.hasPermission(adminUser, 'user:delete')).toBe(true);
      expect(authService.hasPermission(analystUser, 'entity:create')).toBe(true);
      expect(authService.hasPermission(analystUser, 'user:delete')).toBe(false);
      expect(authService.hasPermission(viewerUser, 'entity:read')).toBe(true);
      expect(authService.hasPermission(viewerUser, 'entity:create')).toBe(false);
    });
  });

  describe('Session Security', () => {
    it('should blacklist token and prevent further use', async () => {
      const token = 'token-to-blacklist';

      // Blacklist the token
      mockPool.query.mockResolvedValueOnce({});
      const blacklisted = await authService.revokeToken(token);
      expect(blacklisted).toBe(true);

      // Try to verify blacklisted token
      const jwt = require('jsonwebtoken');
      jwt.verify = jest.fn().mockReturnValue({
        userId: 'user-123',
        email: 'user@test.com',
        role: 'ANALYST',
      });

      mockPool.query.mockResolvedValueOnce({
        rows: [{ token_hash: 'some-hash' }],
      }); // Token IS blacklisted

      const user = await authService.verifyToken(token);
      expect(user).toBeNull(); // Should reject blacklisted token
    });

    it('should revoke all user sessions on logout', async () => {
      const userId = 'user-123';

      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({}) // UPDATE user_sessions (revoke all)
        .mockResolvedValueOnce({}); // COMMIT

      const result = await authService.logout(userId);

      expect(result).toBe(true);
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE user_sessions SET is_revoked = true'),
        [userId],
      );
    });
  });

  describe('Error Recovery', () => {
    it('should rollback transaction on registration failure', async () => {
      const userData = {
        email: 'fail@test.com',
        password: 'password',
      };

      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [] }) // Check existing
        .mockRejectedValueOnce(new Error('Database constraint violation')); // INSERT fails

      await expect(authService.register(userData)).rejects.toThrow(
        'Database constraint violation',
      );

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should handle concurrent registration attempts gracefully', async () => {
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
      argon2.hash = jest.fn().mockResolvedValue('hashed');

      const jwt = require('jsonwebtoken');
      jwt.sign = jest.fn().mockReturnValue('token');

      const [result1, result2] = await Promise.allSettled([
        authService.register(userData),
        authService.register(userData),
      ]);

      expect(result1.status).toBe('fulfilled');
      expect(result2.status).toBe('rejected');
      if (result2.status === 'rejected') {
        expect(result2.reason.message).toContain('already exists');
      }
    });
  });

  describe('Token Expiration', () => {
    it('should reject expired refresh tokens', async () => {
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

      expect(result).toBeNull();
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE user_sessions SET is_revoked = true'),
        [expiredToken],
      );
    });
  });

  describe('Data Integrity', () => {
    it('should properly format user data throughout auth flow', async () => {
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
      jwt.verify = jest.fn().mockReturnValue({
        userId: dbUser.id,
        email: dbUser.email,
        role: dbUser.role,
      });

      mockPool.query.mockResolvedValueOnce({ rows: [] }); // Not blacklisted
      mockClient.query.mockResolvedValueOnce({ rows: [dbUser] });

      const user = await authService.verifyToken('token');

      // Check camelCase formatting
      expect(user?.firstName).toBe('Format');
      expect(user?.lastName).toBe('Tester');
      expect(user?.fullName).toBe('Format Tester');
      expect(user?.isActive).toBe(true);
      expect(user?.lastLogin).toEqual(dbUser.last_login);
      expect(user?.createdAt).toEqual(dbUser.created_at);

      // Should not expose sensitive fields
      expect((user as any)?.password_hash).toBeUndefined();
      expect((user as any)?.first_name).toBeUndefined();
      expect((user as any)?.last_name).toBeUndefined();
    });
  });
});
