/**
 * AuthService Test Suite
 *
 * Tests for:
 * - User registration
 * - User login
 * - Token generation and verification
 * - Password hashing with argon2
 * - Role-based permissions
 * - Session management
 */

import { jest } from '@jest/globals';
import AuthService from '../AuthService';
import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import type { Pool, PoolClient } from 'pg';

// Mock dependencies
jest.mock('argon2');
jest.mock('jsonwebtoken');
jest.mock('../config/database.js', () => ({
  getPostgresPool: jest.fn(() => mockPool),
}));
jest.mock('../config/index.js', () => ({
  default: {
    jwt: {
      secret: 'test-secret-key',
      expiresIn: '24h',
    },
  },
}));

let mockPool: jest.Mocked<Pool>;
let mockClient: jest.Mocked<PoolClient>;

describe('AuthService', () => {
  let authService: AuthService;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Mock PostgreSQL client
    mockClient = {
      query: jest.fn(),
      release: jest.fn(),
    } as any;

    // Mock PostgreSQL pool
    mockPool = {
      connect: jest.fn().mockResolvedValue(mockClient),
      query: jest.fn(),
    } as any;

    authService = new AuthService();
  });

  describe('register', () => {
    const mockUserData = {
      email: 'test@example.com',
      username: 'testuser',
      password: 'SecurePassword123!',
      firstName: 'John',
      lastName: 'Doe',
      role: 'ANALYST',
    };

    it('should register a new user successfully', async () => {
      const mockHashedPassword = '$argon2id$v=19$m=65536$...';
      const mockUserId = 'user-123';
      const mockToken = 'jwt-token-123';
      const mockRefreshToken = 'refresh-token-456';

      (argon2.hash as jest.Mock).mockResolvedValue(mockHashedPassword);
      (jwt.sign as jest.Mock).mockReturnValue(mockToken);

      mockClient.query.mockResolvedValueOnce(undefined); // BEGIN
      mockClient.query.mockResolvedValueOnce({ rows: [] }); // Check existing user
      mockClient.query.mockResolvedValueOnce({
        // Insert user
        rows: [
          {
            id: mockUserId,
            email: mockUserData.email,
            username: mockUserData.username,
            first_name: mockUserData.firstName,
            last_name: mockUserData.lastName,
            role: mockUserData.role,
            is_active: true,
            created_at: new Date(),
          },
        ],
      });
      mockClient.query.mockResolvedValueOnce(undefined); // Insert session
      mockClient.query.mockResolvedValueOnce(undefined); // COMMIT

      const result = await authService.register(mockUserData);

      expect(result.user.id).toBe(mockUserId);
      expect(result.user.email).toBe(mockUserData.email);
      expect(result.token).toBe(mockToken);
      expect(result.refreshToken).toBeDefined();
      expect(argon2.hash).toHaveBeenCalledWith(mockUserData.password);
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    });

    it('should throw error if user already exists', async () => {
      mockClient.query.mockResolvedValueOnce(undefined); // BEGIN
      mockClient.query.mockResolvedValueOnce({
        // Check existing user
        rows: [{ id: 'existing-user' }],
      });

      await expect(authService.register(mockUserData)).rejects.toThrow(
        'User with this email or username already exists',
      );

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });

    it('should default role to ANALYST if not provided', async () => {
      const userDataWithoutRole = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'SecurePassword123!',
      };

      const mockHashedPassword = '$argon2id$v=19$m=65536$...';
      (argon2.hash as jest.Mock).mockResolvedValue(mockHashedPassword);
      (jwt.sign as jest.Mock).mockReturnValue('jwt-token');

      mockClient.query.mockResolvedValueOnce(undefined); // BEGIN
      mockClient.query.mockResolvedValueOnce({ rows: [] }); // Check existing user
      mockClient.query.mockResolvedValueOnce({
        // Insert user
        rows: [
          {
            id: 'user-123',
            email: userDataWithoutRole.email,
            username: userDataWithoutRole.username,
            role: 'ANALYST',
            is_active: true,
            created_at: new Date(),
          },
        ],
      });
      mockClient.query.mockResolvedValueOnce(undefined); // Insert session
      mockClient.query.mockResolvedValueOnce(undefined); // COMMIT

      const result = await authService.register(userDataWithoutRole);

      expect(result.user.role).toBe('ANALYST');
    });

    it('should rollback on database error', async () => {
      (argon2.hash as jest.Mock).mockResolvedValue('hashed-password');

      mockClient.query.mockResolvedValueOnce(undefined); // BEGIN
      mockClient.query.mockResolvedValueOnce({ rows: [] }); // Check existing user
      mockClient.query.mockRejectedValueOnce(new Error('Database error'));

      await expect(authService.register(mockUserData)).rejects.toThrow(
        'Database error',
      );

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });

    it('should hash password using argon2', async () => {
      const mockHashedPassword = '$argon2id$v=19$m=65536$...';
      (argon2.hash as jest.Mock).mockResolvedValue(mockHashedPassword);
      (jwt.sign as jest.Mock).mockReturnValue('jwt-token');

      mockClient.query.mockResolvedValueOnce(undefined); // BEGIN
      mockClient.query.mockResolvedValueOnce({ rows: [] }); // Check existing user
      mockClient.query.mockResolvedValueOnce({
        rows: [
          {
            id: 'user-123',
            email: mockUserData.email,
            role: 'ANALYST',
            is_active: true,
            created_at: new Date(),
          },
        ],
      });
      mockClient.query.mockResolvedValueOnce(undefined); // Insert session
      mockClient.query.mockResolvedValueOnce(undefined); // COMMIT

      await authService.register(mockUserData);

      expect(argon2.hash).toHaveBeenCalledWith(mockUserData.password);
      expect(argon2.hash).toHaveBeenCalledTimes(1);
    });
  });

  describe('login', () => {
    const mockEmail = 'test@example.com';
    const mockPassword = 'SecurePassword123!';
    const mockHashedPassword = '$argon2id$v=19$m=65536$...';

    it('should login user with valid credentials', async () => {
      const mockUser = {
        id: 'user-123',
        email: mockEmail,
        password_hash: mockHashedPassword,
        role: 'ANALYST',
        is_active: true,
        created_at: new Date(),
      };

      mockClient.query.mockResolvedValueOnce({ rows: [mockUser] }); // Find user
      mockClient.query.mockResolvedValueOnce(undefined); // Update last_login
      mockClient.query.mockResolvedValueOnce(undefined); // Insert session

      (argon2.verify as jest.Mock).mockResolvedValue(true);
      (jwt.sign as jest.Mock).mockReturnValue('jwt-token');

      const result = await authService.login(mockEmail, mockPassword);

      expect(result.user.id).toBe(mockUser.id);
      expect(result.user.email).toBe(mockEmail);
      expect(result.token).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(argon2.verify).toHaveBeenCalledWith(
        mockHashedPassword,
        mockPassword,
      );
    });

    it('should throw error for non-existent user', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [] }); // User not found

      await expect(authService.login(mockEmail, mockPassword)).rejects.toThrow(
        'Invalid credentials',
      );
    });

    it('should throw error for inactive user', async () => {
      const inactiveUser = {
        id: 'user-123',
        email: mockEmail,
        password_hash: mockHashedPassword,
        role: 'ANALYST',
        is_active: false,
        created_at: new Date(),
      };

      mockClient.query.mockResolvedValueOnce({ rows: [inactiveUser] });

      await expect(authService.login(mockEmail, mockPassword)).rejects.toThrow(
        'Invalid credentials',
      );
    });

    it('should throw error for invalid password', async () => {
      const mockUser = {
        id: 'user-123',
        email: mockEmail,
        password_hash: mockHashedPassword,
        role: 'ANALYST',
        is_active: true,
        created_at: new Date(),
      };

      mockClient.query.mockResolvedValueOnce({ rows: [mockUser] });
      (argon2.verify as jest.Mock).mockResolvedValue(false);

      await expect(authService.login(mockEmail, mockPassword)).rejects.toThrow(
        'Invalid credentials',
      );
    });

    it('should update last_login timestamp', async () => {
      const mockUser = {
        id: 'user-123',
        email: mockEmail,
        password_hash: mockHashedPassword,
        role: 'ANALYST',
        is_active: true,
        created_at: new Date(),
      };

      mockClient.query.mockResolvedValueOnce({ rows: [mockUser] });
      mockClient.query.mockResolvedValueOnce(undefined); // Update last_login
      mockClient.query.mockResolvedValueOnce(undefined); // Insert session

      (argon2.verify as jest.Mock).mockResolvedValue(true);
      (jwt.sign as jest.Mock).mockReturnValue('jwt-token');

      await authService.login(mockEmail, mockPassword);

      expect(mockClient.query).toHaveBeenCalledWith(
        'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
        [mockUser.id],
      );
    });

    it('should create session with refresh token', async () => {
      const mockUser = {
        id: 'user-123',
        email: mockEmail,
        password_hash: mockHashedPassword,
        role: 'ANALYST',
        is_active: true,
        created_at: new Date(),
      };

      mockClient.query.mockResolvedValueOnce({ rows: [mockUser] });
      mockClient.query.mockResolvedValueOnce(undefined); // Update last_login
      mockClient.query.mockResolvedValueOnce(undefined); // Insert session

      (argon2.verify as jest.Mock).mockResolvedValue(true);
      (jwt.sign as jest.Mock).mockReturnValue('jwt-token');

      const result = await authService.login(mockEmail, mockPassword);

      expect(result.refreshToken).toBeDefined();
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO user_sessions'),
        expect.arrayContaining([mockUser.id, expect.any(String)]),
      );
    });
  });

  describe('verifyToken', () => {
    it('should verify valid token and return user', async () => {
      const mockToken = 'valid-jwt-token';
      const mockPayload = {
        userId: 'user-123',
        email: 'test@example.com',
        role: 'ANALYST',
      };
      const mockUser = {
        id: mockPayload.userId,
        email: mockPayload.email,
        role: mockPayload.role,
        is_active: true,
        first_name: 'John',
        last_name: 'Doe',
        created_at: new Date(),
      };

      (jwt.verify as jest.Mock).mockReturnValue(mockPayload);
      mockClient.query.mockResolvedValue({ rows: [mockUser] } as any);

      const result = await authService.verifyToken(mockToken);

      expect(result).not.toBeNull();
      expect(result?.id).toBe(mockUser.id);
      expect(result?.email).toBe(mockUser.email);
      expect(jwt.verify).toHaveBeenCalledWith(mockToken, 'test-secret-key');
    });

    it('should return null for invalid token', async () => {
      const mockToken = 'invalid-token';

      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const result = await authService.verifyToken(mockToken);

      expect(result).toBeNull();
    });

    it('should return null for empty token', async () => {
      const result = await authService.verifyToken('');

      expect(result).toBeNull();
    });

    it('should return null if user not found', async () => {
      const mockToken = 'valid-jwt-token';
      const mockPayload = {
        userId: 'non-existent-user',
        email: 'test@example.com',
        role: 'ANALYST',
      };

      (jwt.verify as jest.Mock).mockReturnValue(mockPayload);
      mockClient.query.mockResolvedValue({ rows: [] } as any);

      const result = await authService.verifyToken(mockToken);

      expect(result).toBeNull();
    });

    it('should return null if user is inactive', async () => {
      const mockToken = 'valid-jwt-token';
      const mockPayload = {
        userId: 'user-123',
        email: 'test@example.com',
        role: 'ANALYST',
      };
      const mockUser = {
        id: mockPayload.userId,
        email: mockPayload.email,
        role: mockPayload.role,
        is_active: false,
        created_at: new Date(),
      };

      (jwt.verify as jest.Mock).mockReturnValue(mockPayload);
      mockClient.query.mockResolvedValue({ rows: [mockUser] } as any);

      const result = await authService.verifyToken(mockToken);

      expect(result).toBeNull();
    });
  });

  describe('hasPermission', () => {
    it('should grant all permissions to ADMIN role', () => {
      const adminUser = {
        id: 'admin-1',
        email: 'admin@example.com',
        role: 'ADMIN',
        isActive: true,
        createdAt: new Date(),
      };

      expect(authService.hasPermission(adminUser, 'investigation:create')).toBe(
        true,
      );
      expect(authService.hasPermission(adminUser, 'entity:delete')).toBe(true);
      expect(authService.hasPermission(adminUser, 'any:permission')).toBe(true);
    });

    it('should grant specific permissions to ANALYST role', () => {
      const analystUser = {
        id: 'analyst-1',
        email: 'analyst@example.com',
        role: 'ANALYST',
        isActive: true,
        createdAt: new Date(),
      };

      expect(
        authService.hasPermission(analystUser, 'investigation:create'),
      ).toBe(true);
      expect(authService.hasPermission(analystUser, 'entity:read')).toBe(true);
      expect(authService.hasPermission(analystUser, 'entity:delete')).toBe(
        true,
      );
      expect(authService.hasPermission(analystUser, 'ai:request')).toBe(true);
    });

    it('should deny admin-only permissions to ANALYST', () => {
      const analystUser = {
        id: 'analyst-1',
        email: 'analyst@example.com',
        role: 'ANALYST',
        isActive: true,
        createdAt: new Date(),
      };

      expect(authService.hasPermission(analystUser, 'user:create')).toBe(false);
      expect(authService.hasPermission(analystUser, 'system:configure')).toBe(
        false,
      );
    });

    it('should grant limited permissions to VIEWER role', () => {
      const viewerUser = {
        id: 'viewer-1',
        email: 'viewer@example.com',
        role: 'VIEWER',
        isActive: true,
        createdAt: new Date(),
      };

      expect(authService.hasPermission(viewerUser, 'investigation:read')).toBe(
        true,
      );
      expect(authService.hasPermission(viewerUser, 'entity:read')).toBe(true);
      expect(authService.hasPermission(viewerUser, 'graph:read')).toBe(true);
      expect(authService.hasPermission(viewerUser, 'graph:export')).toBe(true);
    });

    it('should deny write permissions to VIEWER role', () => {
      const viewerUser = {
        id: 'viewer-1',
        email: 'viewer@example.com',
        role: 'VIEWER',
        isActive: true,
        createdAt: new Date(),
      };

      expect(authService.hasPermission(viewerUser, 'investigation:create')).toBe(
        false,
      );
      expect(authService.hasPermission(viewerUser, 'entity:create')).toBe(
        false,
      );
      expect(authService.hasPermission(viewerUser, 'entity:delete')).toBe(
        false,
      );
      expect(authService.hasPermission(viewerUser, 'ai:request')).toBe(false);
    });

    it('should return false for null user', () => {
      expect(authService.hasPermission(null, 'investigation:read')).toBe(false);
    });

    it('should return false for user without role', () => {
      const userWithoutRole = {
        id: 'user-1',
        email: 'user@example.com',
        role: null as any,
        isActive: true,
        createdAt: new Date(),
      };

      expect(
        authService.hasPermission(userWithoutRole, 'investigation:read'),
      ).toBe(false);
    });

    it('should return false for unknown role', () => {
      const unknownRoleUser = {
        id: 'user-1',
        email: 'user@example.com',
        role: 'UNKNOWN_ROLE',
        isActive: true,
        createdAt: new Date(),
      };

      expect(
        authService.hasPermission(unknownRoleUser, 'investigation:read'),
      ).toBe(false);
    });

    it('should handle case-insensitive role matching', () => {
      const mixedCaseUser = {
        id: 'user-1',
        email: 'user@example.com',
        role: 'analyst', // lowercase
        isActive: true,
        createdAt: new Date(),
      };

      expect(
        authService.hasPermission(mixedCaseUser, 'investigation:read'),
      ).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle concurrent login attempts', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        password_hash: '$argon2id$v=19$m=65536$...',
        role: 'ANALYST',
        is_active: true,
        created_at: new Date(),
      };

      mockClient.query.mockResolvedValue({ rows: [mockUser] });
      (argon2.verify as jest.Mock).mockResolvedValue(true);
      (jwt.sign as jest.Mock).mockReturnValue('jwt-token');

      const loginPromises = Array.from({ length: 5 }, () =>
        authService.login('test@example.com', 'password'),
      );

      const results = await Promise.all(loginPromises);

      expect(results).toHaveLength(5);
      results.forEach((result) => {
        expect(result.token).toBeDefined();
        expect(result.refreshToken).toBeDefined();
      });
    });

    it('should handle SQL injection attempts in email', async () => {
      const maliciousEmail = "test@example.com' OR '1'='1";

      mockClient.query.mockResolvedValue({ rows: [] });

      await expect(
        authService.login(maliciousEmail, 'password'),
      ).rejects.toThrow('Invalid credentials');
    });

    it('should format user with full name', async () => {
      const mockToken = 'valid-jwt-token';
      const mockPayload = {
        userId: 'user-123',
        email: 'test@example.com',
        role: 'ANALYST',
      };
      const mockUser = {
        id: mockPayload.userId,
        email: mockPayload.email,
        role: mockPayload.role,
        is_active: true,
        first_name: 'John',
        last_name: 'Doe',
        created_at: new Date(),
      };

      (jwt.verify as jest.Mock).mockReturnValue(mockPayload);
      mockClient.query.mockResolvedValue({ rows: [mockUser] } as any);

      const result = await authService.verifyToken(mockToken);

      expect(result?.fullName).toBe('John Doe');
      expect(result?.firstName).toBe('John');
      expect(result?.lastName).toBe('Doe');
    });
  });
});
