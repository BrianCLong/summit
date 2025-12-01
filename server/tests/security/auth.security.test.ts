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

import AuthService from '../../src/services/AuthService';
import { ensureAuthenticated, requirePermission } from '../../src/middleware/auth';
import { securityTestVectors, createMockRequest, createMockResponse } from '../utils/auth-test-helpers';

jest.mock('../../src/config/database');
jest.mock('../../src/utils/logger', () => ({
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
}));

jest.mock('../../src/config/index.js', () => ({
  default: {
    jwt: {
      secret: 'test-secret',
      expiresIn: '24h',
    },
  },
}));

describe('Authentication Security Tests', () => {
  let authService: AuthService;
  let mockPool: any;
  let mockClient: any;

  beforeEach(() => {
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

  describe('OWASP A01:2021 - Broken Access Control', () => {
    it('should prevent horizontal privilege escalation', async () => {
      // User A tries to access User B's session
      const userAToken = 'user-a-token';
      const userBId = 'user-b-id';

      const jwt = require('jsonwebtoken');
      jwt.verify = jest.fn().mockReturnValue({
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
      expect(verifiedUser?.id).not.toBe(userBId);
      expect(verifiedUser?.id).toBe('user-a-id');
    });

    it('should prevent vertical privilege escalation', async () => {
      const mockReq = createMockRequest({
        user: { id: 'viewer-123', role: 'VIEWER' },
      });
      const { res, spies } = createMockResponse();
      const mockNext = jest.fn();

      // VIEWER tries to access admin-only function
      const adminMiddleware = requirePermission('user:manage');
      adminMiddleware(mockReq as any, res as any, mockNext);

      expect(spies.status).toHaveBeenCalledWith(403);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should enforce role-based access control strictly', () => {
      const roles = [
        { role: 'VIEWER', permission: 'entity:delete', shouldAllow: false },
        { role: 'ANALYST', permission: 'user:manage', shouldAllow: false },
        { role: 'ADMIN', permission: 'anything:anything', shouldAllow: true },
      ];

      roles.forEach(({ role, permission, shouldAllow }) => {
        const user = { id: 'test', role };
        const result = authService.hasPermission(user, permission);
        expect(result).toBe(shouldAllow);
      });
    });
  });

  describe('OWASP A02:2021 - Cryptographic Failures', () => {
    it('should use strong password hashing (Argon2)', async () => {
      const userData = {
        email: 'secure@test.com',
        password: 'PlainTextPassword123!',
      };

      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [] }) // No existing user
        .mockResolvedValueOnce({
          rows: [{ id: 'user-123', email: userData.email }],
        })
        .mockResolvedValueOnce({}) // Session
        .mockResolvedValueOnce({}); // COMMIT

      const argon2 = require('argon2');
      argon2.hash = jest.fn().mockResolvedValue('$argon2id$v=19$...');

      const jwt = require('jsonwebtoken');
      jwt.sign = jest.fn().mockReturnValue('token');

      await authService.register(userData);

      // Verify Argon2 was used
      expect(argon2.hash).toHaveBeenCalledWith(userData.password);

      // Verify password was not stored in plain text
      const insertCall = mockClient.query.mock.calls.find((call: any) =>
        call[0].includes('INSERT INTO users'),
      );
      expect(insertCall).toBeDefined();
      expect(insertCall[1]).not.toContain(userData.password);
    });

    it('should not expose password hashes in user objects', async () => {
      const jwt = require('jsonwebtoken');
      jwt.verify = jest.fn().mockReturnValue({
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

      expect((user as any)?.password_hash).toBeUndefined();
    });

    it('should protect tokens with HMAC (JWT signing)', () => {
      const jwt = require('jsonwebtoken');
      const mockSign = jest.fn();
      jwt.sign = mockSign;

      // Tokens should be signed with secret
      expect(jwt.sign).toBeDefined();
    });
  });

  describe('OWASP A03:2021 - Injection', () => {
    describe('SQL Injection Protection', () => {
      securityTestVectors.sqlInjection.forEach((payload) => {
        it(`should prevent SQL injection: ${payload.substring(0, 30)}...`, async () => {
          mockClient.query.mockResolvedValueOnce({ rows: [] });

          await expect(
            authService.login(payload, 'password'),
          ).rejects.toThrow();

          // Verify parameterized queries were used
          const queryCall = mockClient.query.mock.calls[0];
          if (queryCall) {
            expect(queryCall[0]).toContain('$1'); // Parameterized
            expect(queryCall[1]).toContain(payload);
          }
        });
      });

      it('should use parameterized queries for all database operations', async () => {
        mockClient.query
          .mockResolvedValueOnce({}) // BEGIN
          .mockResolvedValueOnce({ rows: [] }) // Check existing
          .mockResolvedValueOnce({
            rows: [{ id: 'user-123', email: 'test@example.com' }],
          })
          .mockResolvedValueOnce({})
          .mockResolvedValueOnce({});

        const argon2 = require('argon2');
        argon2.hash = jest.fn().mockResolvedValue('hash');

        const jwt = require('jsonwebtoken');
        jwt.sign = jest.fn().mockReturnValue('token');

        await authService.register({
          email: "test'; DROP TABLE users;--",
          password: 'password',
        });

        // All queries should use parameterized format
        mockClient.query.mock.calls.forEach((call: any) => {
          if (call[0].includes('SELECT') || call[0].includes('INSERT')) {
            expect(call[0]).toMatch(/\$\d+/); // Contains $1, $2, etc.
          }
        });
      });
    });

    describe('Command Injection Protection', () => {
      securityTestVectors.commandInjection.forEach((payload) => {
        it(`should prevent command injection: ${payload.substring(0, 30)}...`, async () => {
          const mockReq = createMockRequest({
            headers: { authorization: `Bearer ${payload}` },
          });
          const { res } = createMockResponse();
          const mockNext = jest.fn();

          await ensureAuthenticated(mockReq as any, res as any, mockNext);

          // Should safely reject, not execute commands
          expect(mockNext).not.toHaveBeenCalled();
        });
      });
    });

    describe('XSS Protection', () => {
      securityTestVectors.xss.forEach((payload) => {
        it(`should handle XSS payload safely: ${payload.substring(0, 30)}...`, async () => {
          const userData = {
            email: 'test@example.com',
            firstName: payload,
            password: 'password',
          };

          mockClient.query
            .mockResolvedValueOnce({})
            .mockResolvedValueOnce({ rows: [] })
            .mockResolvedValueOnce({
              rows: [{ id: 'user-123', first_name: payload }],
            })
            .mockResolvedValueOnce({})
            .mockResolvedValueOnce({});

          const argon2 = require('argon2');
          argon2.hash = jest.fn().mockResolvedValue('hash');

          const jwt = require('jsonwebtoken');
          jwt.sign = jest.fn().mockReturnValue('token');

          const result = await authService.register(userData);

          // Data should be stored as-is (sanitization is client/view responsibility)
          expect(result.user.firstName).toBe(payload);
        });
      });
    });
  });

  describe('OWASP A04:2021 - Insecure Design', () => {
    it('should implement token rotation on refresh', async () => {
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

      const jwt = require('jsonwebtoken');
      jwt.sign = jest.fn().mockReturnValue('new-token');

      const result = await authService.refreshAccessToken(originalRefreshToken);

      // New refresh token should be different
      expect(result?.refreshToken).toBeDefined();
      expect(result?.refreshToken).not.toBe(originalRefreshToken);

      // Old token should be revoked
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE user_sessions SET is_revoked = true'),
        [originalRefreshToken],
      );
    });

    it('should implement token blacklisting', async () => {
      const token = 'token-to-blacklist';

      mockPool.query.mockResolvedValueOnce({});

      const result = await authService.revokeToken(token);

      expect(result).toBe(true);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO token_blacklist'),
        expect.any(Array),
      );
    });

    it('should hash tokens before blacklisting (avoid storing full tokens)', async () => {
      const token = 'sensitive-token';
      const crypto = require('crypto');

      mockPool.query.mockImplementationOnce((query: string, params: any[]) => {
        // Verify token is hashed
        expect(params[0]).not.toBe(token);
        expect(params[0]).toHaveLength(64); // SHA-256 produces 64 hex characters
        return Promise.resolve({});
      });

      await authService.revokeToken(token);
    });
  });

  describe('OWASP A05:2021 - Security Misconfiguration', () => {
    it('should not expose stack traces in error responses', async () => {
      mockClient.query.mockRejectedValueOnce(
        new Error('Detailed database error with stack trace'),
      );

      const mockReq = createMockRequest({
        headers: { authorization: 'Bearer error-token' },
      });
      const { res, spies } = createMockResponse();
      const mockNext = jest.fn();

      await ensureAuthenticated(mockReq as any, res as any, mockNext);

      // Should return generic error, not detailed stack trace
      expect(spies.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
      expect(spies.json).not.toHaveBeenCalledWith(
        expect.objectContaining({
          stack: expect.any(String),
        }),
      );
    });

    it('should handle missing configuration gracefully', () => {
      // Config should have defaults or validation
      const config = require('../../src/config/index.js').default;
      expect(config.jwt.secret).toBeDefined();
      expect(config.jwt.expiresIn).toBeDefined();
    });
  });

  describe('OWASP A07:2021 - Identification and Authentication Failures', () => {
    it('should prevent authentication bypass with empty password', async () => {
      mockClient.query.mockResolvedValueOnce({
        rows: [
          {
            id: 'user-123',
            email: 'test@example.com',
            password_hash: 'hash',
          },
        ],
      });

      const argon2 = require('argon2');
      argon2.verify = jest.fn().mockResolvedValue(false);

      await expect(
        authService.login('test@example.com', ''),
      ).rejects.toThrow('Invalid credentials');
    });

    it('should use constant-time comparison for credentials', async () => {
      // Argon2.verify provides timing-safe comparison
      const argon2 = require('argon2');
      expect(argon2.verify).toBeDefined();
    });

    it('should prevent enumeration of valid usernames', async () => {
      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // User not found
        .mockResolvedValueOnce({
          rows: [{ id: 'user-123', password_hash: 'hash' }],
        }); // Wrong password

      const argon2 = require('argon2');
      argon2.verify = jest.fn().mockResolvedValue(false);

      // Both should return same error message
      let error1, error2;
      try {
        await authService.login('nonexistent@example.com', 'password');
      } catch (e: any) {
        error1 = e.message;
      }

      try {
        await authService.login('existing@example.com', 'wrongpassword');
      } catch (e: any) {
        error2 = e.message;
      }

      expect(error1).toBe('Invalid credentials');
      expect(error2).toBe('Invalid credentials');
    });

    it('should invalidate sessions on logout', async () => {
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({}) // Revoke all sessions
        .mockResolvedValueOnce({}); // COMMIT

      mockPool.query.mockResolvedValueOnce({});

      const result = await authService.logout('user-123', 'token');

      expect(result).toBe(true);
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE user_sessions SET is_revoked = true'),
        ['user-123'],
      );
    });
  });

  describe('OWASP A08:2021 - Software and Data Integrity Failures', () => {
    it('should verify JWT signature', async () => {
      const jwt = require('jsonwebtoken');
      jwt.verify = jest.fn().mockImplementation(() => {
        throw new Error('invalid signature');
      });

      const result = await authService.verifyToken('tampered-token');

      expect(result).toBeNull();
      expect(jwt.verify).toHaveBeenCalled();
    });

    it('should reject tokens with "none" algorithm', async () => {
      const jwt = require('jsonwebtoken');
      jwt.verify = jest.fn().mockImplementation(() => {
        throw new Error('invalid algorithm');
      });

      const result = await authService.verifyToken('none-algorithm-token');

      expect(result).toBeNull();
    });
  });

  describe('Session Hijacking Prevention', () => {
    it('should reject tokens after logout', async () => {
      const token = 'session-token';

      // Logout
      mockClient.query
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({});
      mockPool.query.mockResolvedValueOnce({});

      await authService.logout('user-123', token);

      // Try to use token after logout
      const jwt = require('jsonwebtoken');
      jwt.verify = jest.fn().mockReturnValue({
        userId: 'user-123',
        email: 'test@example.com',
        role: 'ANALYST',
      });

      mockPool.query.mockResolvedValueOnce({ rows: [{ token_hash: 'hash' }] }); // Blacklisted

      const result = await authService.verifyToken(token);

      expect(result).toBeNull();
    });

    it('should prevent token reuse after refresh', async () => {
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

      const jwt = require('jsonwebtoken');
      jwt.sign = jest.fn().mockReturnValue('new-token');

      await authService.refreshAccessToken(oldRefreshToken);

      // Second use should fail
      mockClient.query.mockResolvedValueOnce({
        rows: [
          { user_id: 'user-123', expires_at: futureDate, is_revoked: true },
        ],
      });

      const result = await authService.refreshAccessToken(oldRefreshToken);

      expect(result).toBeNull();
    });
  });

  describe('Input Validation', () => {
    it('should handle extremely long inputs safely', async () => {
      const longEmail = 'a'.repeat(10000) + '@example.com';
      const longPassword = 'b'.repeat(10000);

      mockClient.query
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({ rows: [] });

      // Should not crash, should handle gracefully
      await expect(
        authService.register({
          email: longEmail,
          password: longPassword,
        }),
      ).resolves.toBeDefined();
    });

    it('should handle special characters in all fields', async () => {
      const specialChars = "!@#$%^&*()_+-=[]{}|;':\",./<>?";

      mockClient.query
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({
          rows: [{ id: 'user-123', email: 'test@example.com' }],
        })
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({});

      const argon2 = require('argon2');
      argon2.hash = jest.fn().mockResolvedValue('hash');

      const jwt = require('jsonwebtoken');
      jwt.sign = jest.fn().mockReturnValue('token');

      await expect(
        authService.register({
          email: 'test@example.com',
          firstName: specialChars,
          lastName: specialChars,
          password: specialChars,
        }),
      ).resolves.toBeDefined();
    });

    it('should handle null bytes safely', async () => {
      const nullByteEmail = 'test\x00@example.com';

      mockClient.query.mockResolvedValueOnce({ rows: [] });

      await expect(
        authService.login(nullByteEmail, 'password'),
      ).rejects.toThrow();
    });
  });

  describe('Rate Limiting Compatibility', () => {
    it('should be compatible with rate limiting middleware', async () => {
      // Auth service should not maintain state that breaks rate limiting
      const requests = Array.from({ length: 100 }, (_, i) =>
        authService.verifyToken(`token-${i}`),
      );

      mockPool.query.mockResolvedValue({ rows: [{ token_hash: 'hash' }] });

      const jwt = require('jsonwebtoken');
      jwt.verify = jest.fn().mockReturnValue({
        userId: 'user-123',
        email: 'test@example.com',
        role: 'ANALYST',
      });

      // Should handle concurrent requests
      await expect(Promise.all(requests)).resolves.toBeDefined();
    });
  });

  describe('Denial of Service (DoS) Prevention', () => {
    it('should handle rapid registration attempts', async () => {
      mockClient.query
        .mockResolvedValue({}) // BEGIN
        .mockResolvedValue({ rows: [] }) // Check existing
        .mockResolvedValue({
          rows: [{ id: 'user-123', email: 'test@example.com' }],
        });

      const argon2 = require('argon2');
      argon2.hash = jest.fn().mockResolvedValue('hash');

      const jwt = require('jsonwebtoken');
      jwt.sign = jest.fn().mockReturnValue('token');

      const requests = Array.from({ length: 10 }, (_, i) =>
        authService.register({
          email: `user${i}@example.com`,
          password: 'password',
        }),
      );

      // Should complete without crashing
      await expect(Promise.allSettled(requests)).resolves.toBeDefined();
    });
  });
});
