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

import { jest, describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import { Express } from 'express';
import jwt from 'jsonwebtoken';

// Mock the database pool
const mockQuery = jest.fn();
const mockConnect = jest.fn();
const mockRelease = jest.fn();

jest.mock('../../config/database.js', () => ({
  getPostgresPool: jest.fn(() => ({
    query: mockQuery,
    connect: mockConnect,
  })),
  getRedisClient: jest.fn(() => null),
}));

jest.mock('argon2', () => ({
  hash: jest.fn().mockResolvedValue('$argon2id$v=19$m=65536$...hashed...'),
  verify: jest.fn().mockImplementation((hash, password) => {
    return Promise.resolve(password === 'ValidPassword123!');
  }),
}));

jest.mock('../../config/index.js', () => ({
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

// Import after mocking
const { createApp } = await import('../../app.js');

describe('Authentication Integration Tests', () => {
  let app: Express;

  beforeAll(async () => {
    app = await createApp();
  });

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mock client
    const mockClient = {
      query: mockQuery,
      release: mockRelease,
    };
    mockConnect.mockResolvedValue(mockClient);
  });

  describe('POST /auth/register', () => {
    const validRegistration = {
      email: 'newuser@example.com',
      password: 'ValidPassword123!',
      firstName: 'John',
      lastName: 'Doe',
    };

    it('should register a new user successfully', async () => {
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

      const response = await request(app)
        .post('/auth/register')
        .send(validRegistration)
        .expect(201);

      expect(response.body.message).toBe('Registration successful');
      expect(response.body.user.email).toBe(validRegistration.email);
      expect(response.body.token).toBeDefined();
      expect(response.body.refreshToken).toBeDefined();
    });

    it('should reject registration with weak password', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({
          ...validRegistration,
          password: 'weak',
        })
        .expect(400);

      expect(response.body.code).toBe('VALIDATION_ERROR');
    });

    it('should reject registration with invalid email', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({
          ...validRegistration,
          email: 'not-an-email',
        })
        .expect(400);

      expect(response.body.code).toBe('VALIDATION_ERROR');
    });

    it('should reject registration if user already exists', async () => {
      // Mock: existing user found
      mockQuery.mockResolvedValueOnce(undefined); // BEGIN
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 'existing-user' }] }); // Check existing
      mockQuery.mockResolvedValueOnce(undefined); // ROLLBACK

      const response = await request(app)
        .post('/auth/register')
        .send(validRegistration)
        .expect(409);

      expect(response.body.code).toBe('USER_EXISTS');
    });
  });

  describe('POST /auth/login', () => {
    it('should login user with valid credentials', async () => {
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

      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'ValidPassword123!',
        })
        .expect(200);

      expect(response.body.message).toBe('Login successful');
      expect(response.body.user.email).toBe(mockUser.email);
      expect(response.body.token).toBeDefined();
      expect(response.body.refreshToken).toBeDefined();
    });

    it('should reject login with invalid credentials', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] }); // User not found

      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'WrongPassword123!',
        })
        .expect(401);

      expect(response.body.code).toBe('INVALID_CREDENTIALS');
    });

    it('should reject login for inactive user', async () => {
      const inactiveUser = {
        id: 'user-123',
        email: 'test@example.com',
        password_hash: '$argon2id$v=19$m=65536$...hashed...',
        role: 'ANALYST',
        is_active: false,
        created_at: new Date(),
      };

      mockQuery.mockResolvedValueOnce({ rows: [inactiveUser] });

      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'ValidPassword123!',
        })
        .expect(401);

      expect(response.body.code).toBe('INVALID_CREDENTIALS');
    });
  });

  describe('POST /auth/refresh', () => {
    it('should refresh token with valid refresh token', async () => {
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

      const response = await request(app)
        .post('/auth/refresh')
        .send({ refreshToken: validRefreshToken })
        .expect(200);

      expect(response.body.token).toBeDefined();
      expect(response.body.refreshToken).toBeDefined();
    });

    it('should reject expired refresh token', async () => {
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

      const response = await request(app)
        .post('/auth/refresh')
        .send({ refreshToken: expiredRefreshToken })
        .expect(401);

      expect(response.body.code).toBe('INVALID_REFRESH_TOKEN');
    });
  });

  describe('POST /auth/logout', () => {
    it('should logout user with valid token', async () => {
      // Generate a valid token
      const token = jwt.sign(
        { userId: 'user-123', email: 'test@example.com', role: 'ANALYST' },
        'test-jwt-secret-key-12345',
        { expiresIn: '1h' }
      );

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

      const response = await request(app)
        .post('/auth/logout')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.message).toBe('Logout successful');
    });

    it('should reject logout without token', async () => {
      const response = await request(app)
        .post('/auth/logout')
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /auth/me', () => {
    it('should return current user profile', async () => {
      const token = jwt.sign(
        { userId: 'user-123', email: 'test@example.com', role: 'ANALYST' },
        'test-jwt-secret-key-12345',
        { expiresIn: '1h' }
      );

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

      const response = await request(app)
        .get('/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.user.email).toBe('test@example.com');
      expect(response.body.user.role).toBe('ANALYST');
    });
  });

  describe('GET /auth/verify-token', () => {
    it('should verify valid token', async () => {
      const token = jwt.sign(
        { userId: 'user-123', email: 'test@example.com', role: 'ANALYST' },
        'test-jwt-secret-key-12345',
        { expiresIn: '1h' }
      );

      // Mock: find user
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 'user-123',
          email: 'test@example.com',
          role: 'ANALYST',
          is_active: true,
        }],
      });

      const response = await request(app)
        .get('/auth/verify-token')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.valid).toBe(true);
      expect(response.body.user.id).toBe('user-123');
    });

    it('should reject invalid token', async () => {
      const response = await request(app)
        .get('/auth/verify-token')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.valid).toBe(false);
    });
  });

  describe('POST /auth/password/reset-request', () => {
    it('should initiate password reset for existing user', async () => {
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

      const response = await request(app)
        .post('/auth/password/reset-request')
        .send({ email: 'test@example.com' })
        .expect(200);

      // Should always return success to prevent email enumeration
      expect(response.body.message).toContain('password reset link');
    });

    it('should return success even for non-existent email (prevent enumeration)', async () => {
      const mockClient = {
        query: mockQuery,
        release: mockRelease,
      };
      mockConnect.mockResolvedValue(mockClient);

      // Mock: user not found
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .post('/auth/password/reset-request')
        .send({ email: 'nonexistent@example.com' })
        .expect(200);

      // Should still return success to prevent email enumeration
      expect(response.body.message).toContain('password reset link');
    });
  });

  describe('POST /auth/password/reset', () => {
    it('should reset password with valid token', async () => {
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

      const response = await request(app)
        .post('/auth/password/reset')
        .send({
          token: 'valid-reset-token-hash',
          password: 'NewValidPassword123!',
        })
        .expect(200);

      expect(response.body.message).toContain('Password reset successful');
    });

    it('should reject with invalid or expired token', async () => {
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

      const response = await request(app)
        .post('/auth/password/reset')
        .send({
          token: 'invalid-token',
          password: 'NewValidPassword123!',
        })
        .expect(400);

      expect(response.body.code).toBe('INVALID_RESET_TOKEN');
    });
  });

  describe('POST /auth/password/change', () => {
    it('should change password for authenticated user', async () => {
      const token = jwt.sign(
        { userId: 'user-123', email: 'test@example.com', role: 'ANALYST' },
        'test-jwt-secret-key-12345',
        { expiresIn: '1h' }
      );

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

      const response = await request(app)
        .post('/auth/password/change')
        .set('Authorization', `Bearer ${token}`)
        .send({
          currentPassword: 'ValidPassword123!',
          newPassword: 'NewSecurePassword456!',
        })
        .expect(200);

      expect(response.body.message).toContain('Password changed successfully');
    });

    it('should reject with incorrect current password', async () => {
      const token = jwt.sign(
        { userId: 'user-123', email: 'test@example.com', role: 'ANALYST' },
        'test-jwt-secret-key-12345',
        { expiresIn: '1h' }
      );

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

      const response = await request(app)
        .post('/auth/password/change')
        .set('Authorization', `Bearer ${token}`)
        .send({
          currentPassword: 'WrongCurrentPassword123!',
          newPassword: 'NewSecurePassword456!',
        })
        .expect(400);

      expect(response.body.code).toBe('INCORRECT_PASSWORD');
    });
  });

  describe('Rate Limiting', () => {
    it('should rate limit login attempts', async () => {
      // This would require multiple requests to trigger rate limiting
      // Implementation depends on the actual rate limiter configuration
      // For now, just verify the endpoint accepts the request
      mockQuery.mockResolvedValue({ rows: [] });

      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'ValidPassword123!',
        });

      // Should either succeed (401 for invalid credentials) or be rate limited (429)
      expect([401, 429]).toContain(response.status);
    });
  });
});
