const AuthService = require('../../src/services/AuthService');
const { getPostgresPool } = require('../../src/config/database');
const argon2 = require('argon2');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// Mock database pool and client
jest.mock('../../src/config/database', () => ({
  getPostgresPool: jest.fn(),
}));

// Mock argon2 and jsonwebtoken
jest.mock('argon2', () => ({
  hash: jest.fn(),
  verify: jest.fn(),
}));

jest.mock('jsonwebtoken', () => ({
  sign: jest.fn(),
  verify: jest.fn(),
}));

// Mock logger to prevent console noise during tests
jest.mock('../../src/utils/logger', () => ({
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
}));

// Mock config
jest.mock('../../src/config/index.js', () => ({
  default: {
    jwt: {
      secret: 'test-secret-key',
      expiresIn: '24h',
    },
  },
}));

describe('AuthService', () => {
  let authService;
  let mockClient;
  let mockPool;

  beforeEach(() => {
    mockClient = {
      query: jest.fn(),
      release: jest.fn(),
    };
    mockPool = {
      connect: jest.fn(() => mockClient),
    };
    getPostgresPool.mockReturnValue(mockPool);
    authService = new AuthService();

    // Reset mocks before each test
    jest.clearAllMocks();
  });

  describe('hasPermission', () => {
    it('should return true for ADMIN role with any permission', () => {
      const user = { role: 'ADMIN' };
      expect(authService.hasPermission(user, 'entity:create')).toBe(true);
      expect(authService.hasPermission(user, 'graph:read')).toBe(true);
    });

    it('should return true for ANALYST role with analyst permissions', () => {
      const user = { role: 'ANALYST' };
      expect(authService.hasPermission(user, 'entity:create')).toBe(true);
      expect(authService.hasPermission(user, 'tag:delete')).toBe(true);
      expect(authService.hasPermission(user, 'user:manage')).toBe(false); // Analyst should not have this
    });

    it('should return true for VIEWER role with viewer permissions', () => {
      const user = { role: 'VIEWER' };
      expect(authService.hasPermission(user, 'graph:read')).toBe(true);
      expect(authService.hasPermission(user, 'entity:create')).toBe(false); // Viewer should not have this
    });

    it('should return false for undefined user or role', () => {
      expect(authService.hasPermission(null, 'any:permission')).toBe(false);
      expect(authService.hasPermission({}, 'any:permission')).toBe(false);
      expect(
        authService.hasPermission({ role: 'UNKNOWN' }, 'any:permission'),
      ).toBe(false);
    });
  });

  describe('register', () => {
    const userData = {
      email: 'test@example.com',
      username: 'testuser',
      password: 'password123',
      firstName: 'Test',
      lastName: 'User',
      role: 'ANALYST',
    };

    it('should successfully register a new user', async () => {
      mockClient.query
        .mockResolvedValueOnce({}) // For BEGIN
        .mockResolvedValueOnce({ rows: [] }) // For existing user check
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'user123',
              ...userData,
              is_active: true,
              created_at: new Date(),
            },
          ],
        }) // For user insert
        .mockResolvedValueOnce({}); // For COMMIT

      argon2.hash.mockResolvedValue('hashedpassword');
      jwt.sign.mockReturnValue('mockToken');
      mockClient.query.mockResolvedValue({}); // For user_sessions insert

      const result = await authService.register(userData);

      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(argon2.hash).toHaveBeenCalledWith('password123');
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO users'),
        expect.any(Array),
      );
      expect(jwt.sign).toHaveBeenCalled();
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(result.user.email).toBe('test@example.com');
      expect(result.token).toBe('mockToken');
    });

    it('should throw error if user already exists', async () => {
      mockClient.query
        .mockResolvedValueOnce({}) // For BEGIN
        .mockResolvedValueOnce({ rows: [{ id: 'user123' }] }) // Existing user
        .mockResolvedValueOnce({}); // For ROLLBACK

      await expect(authService.register(userData)).rejects.toThrow(
        'User with this email or username already exists',
      );
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });
  });

  describe('login', () => {
    const email = 'test@example.com';
    const password = 'password123';
    const user = {
      id: 'user123',
      email,
      password_hash: 'hashedpassword',
      role: 'ANALYST',
      is_active: true,
    };

    it('should successfully log in a user', async () => {
      mockClient.query
        .mockResolvedValueOnce({ rows: [user] }) // For user fetch
        .mockResolvedValueOnce({}) // For UPDATE last_login
        .mockResolvedValueOnce({}); // For user_sessions insert

      argon2.verify.mockResolvedValue(true);
      jwt.sign.mockReturnValue('mockToken');

      const result = await authService.login(
        email,
        password,
        '127.0.0.1',
        'test-agent',
      );

      expect(argon2.verify).toHaveBeenCalledWith(
        'hashedpassword',
        'password123',
      );
      expect(result.user.email).toBe(email);
      expect(result.token).toBe('mockToken');
    });

    it('should throw error for invalid credentials', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [] }); // User not found

      await expect(
        authService.login(email, password, '127.0.0.1', 'test-agent'),
      ).rejects.toThrow('Invalid credentials');
    });

    it('should throw error for incorrect password', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [user] }); // User found
      argon2.verify.mockResolvedValue(false);

      await expect(
        authService.login(email, password, '127.0.0.1', 'test-agent'),
      ).rejects.toThrow('Invalid credentials');
    });
  });

  describe('verifyToken', () => {
    const token = 'validToken';
    const decodedPayload = {
      userId: 'user123',
      email: 'test@example.com',
      role: 'ANALYST',
    };
    const user = {
      id: 'user123',
      email: 'test@example.com',
      username: 'testuser',
      first_name: 'Test',
      last_name: 'User',
      role: 'ANALYST',
      is_active: true,
    };

    it('should return user for a valid token', async () => {
      jwt.verify.mockReturnValue(decodedPayload);
      mockClient.query.mockResolvedValueOnce({ rows: [user] });

      const result = await authService.verifyToken(token);

      expect(result).toBeDefined();
      expect(result.id).toBe('user123');
    });

    it('should return null for an invalid token', async () => {
      jwt.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const result = await authService.verifyToken('invalidToken');

      expect(result).toBeNull();
    });

    it('should return null if user not found or inactive', async () => {
      jwt.verify.mockReturnValue(decodedPayload);
      mockPool.query.mockResolvedValueOnce({ rows: [] }); // Blacklist check
      mockClient.query.mockResolvedValueOnce({ rows: [] }); // User query

      const result = await authService.verifyToken(token);

      expect(result).toBeNull();
    });

    it('should return null if token is empty or missing', async () => {
      const result1 = await authService.verifyToken('');
      const result2 = await authService.verifyToken(null);
      const result3 = await authService.verifyToken(undefined);

      expect(result1).toBeNull();
      expect(result2).toBeNull();
      expect(result3).toBeNull();
    });

    it('should return null if token is blacklisted', async () => {
      jwt.verify.mockReturnValue(decodedPayload);
      mockPool.query.mockResolvedValueOnce({ rows: [{ token_hash: 'hash' }] }); // Blacklist check returns result

      const result = await authService.verifyToken(token);

      expect(result).toBeNull();
    });

    it('should handle JWT verification errors gracefully', async () => {
      jwt.verify.mockImplementation(() => {
        throw new Error('jwt malformed');
      });

      const result = await authService.verifyToken('malformed.token.here');

      expect(result).toBeNull();
    });
  });

  describe('refreshAccessToken', () => {
    const refreshToken = 'valid-refresh-token';
    const userId = 'user123';
    const user = {
      id: userId,
      email: 'test@example.com',
      username: 'testuser',
      first_name: 'Test',
      last_name: 'User',
      role: 'ANALYST',
      is_active: true,
      password_hash: 'hash',
    };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should successfully refresh access token with token rotation', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);

      mockClient.query
        .mockResolvedValueOnce({
          // Session lookup
          rows: [
            {
              user_id: userId,
              expires_at: futureDate,
              is_revoked: false,
            },
          ],
        })
        .mockResolvedValueOnce({
          // User lookup
          rows: [user],
        })
        .mockResolvedValueOnce({}) // Revoke old refresh token
        .mockResolvedValueOnce({}); // Insert new session

      jwt.sign.mockReturnValue('new-access-token');

      const result = await authService.refreshAccessToken(refreshToken);

      expect(result).toBeDefined();
      expect(result.token).toBe('new-access-token');
      expect(result.refreshToken).toBeDefined();
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE user_sessions SET is_revoked = true'),
        [refreshToken],
      );
    });

    it('should return null for invalid refresh token', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [] }); // Session not found

      const result = await authService.refreshAccessToken('invalid-token');

      expect(result).toBeNull();
    });

    it('should return null for revoked refresh token', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);

      mockClient.query.mockResolvedValueOnce({
        rows: [
          {
            user_id: userId,
            expires_at: futureDate,
            is_revoked: true, // Token is revoked
          },
        ],
      });

      const result = await authService.refreshAccessToken(refreshToken);

      expect(result).toBeNull();
    });

    it('should return null for expired refresh token', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1); // Expired yesterday

      mockClient.query
        .mockResolvedValueOnce({
          rows: [
            {
              user_id: userId,
              expires_at: pastDate,
              is_revoked: false,
            },
          ],
        })
        .mockResolvedValueOnce({}); // Revoke expired token

      const result = await authService.refreshAccessToken(refreshToken);

      expect(result).toBeNull();
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE user_sessions SET is_revoked = true'),
        [refreshToken],
      );
    });

    it('should return null if user is not found or inactive', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);

      mockClient.query
        .mockResolvedValueOnce({
          rows: [
            {
              user_id: userId,
              expires_at: futureDate,
              is_revoked: false,
            },
          ],
        })
        .mockResolvedValueOnce({ rows: [] }); // User not found

      const result = await authService.refreshAccessToken(refreshToken);

      expect(result).toBeNull();
    });

    it('should handle database errors gracefully', async () => {
      mockClient.query.mockRejectedValueOnce(
        new Error('Database connection error'),
      );

      const result = await authService.refreshAccessToken(refreshToken);

      expect(result).toBeNull();
    });
  });

  describe('revokeToken', () => {
    const token = 'valid-access-token';

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should successfully revoke a token', async () => {
      mockPool.query.mockResolvedValueOnce({}); // Blacklist insert

      const result = await authService.revokeToken(token);

      expect(result).toBe(true);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO token_blacklist'),
        expect.any(Array),
      );
    });

    it('should handle duplicate revocation (idempotent)', async () => {
      mockPool.query.mockResolvedValueOnce({}); // ON CONFLICT DO NOTHING

      const result = await authService.revokeToken(token);

      expect(result).toBe(true);
    });

    it('should return false on database error', async () => {
      mockPool.query.mockRejectedValueOnce(new Error('Database error'));

      const result = await authService.revokeToken(token);

      expect(result).toBe(false);
    });

    it('should hash token before storing in blacklist', async () => {
      const expectedHash = crypto
        .createHash('sha256')
        .update(token)
        .digest('hex');

      mockPool.query.mockImplementationOnce((query, params) => {
        expect(params[0]).toBe(expectedHash);
        return Promise.resolve({});
      });

      await authService.revokeToken(token);
    });
  });

  describe('logout', () => {
    const userId = 'user123';
    const currentToken = 'current-access-token';

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should successfully logout user and revoke all sessions', async () => {
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({}) // UPDATE user_sessions
        .mockResolvedValueOnce({}); // COMMIT

      mockPool.query.mockResolvedValueOnce({}); // revokeToken blacklist insert

      const result = await authService.logout(userId, currentToken);

      expect(result).toBe(true);
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE user_sessions SET is_revoked = true'),
        [userId],
      );
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    });

    it('should logout without current token', async () => {
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({}) // UPDATE user_sessions
        .mockResolvedValueOnce({}); // COMMIT

      const result = await authService.logout(userId);

      expect(result).toBe(true);
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    });

    it('should rollback on error', async () => {
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockRejectedValueOnce(new Error('Database error')); // UPDATE fails

      const result = await authService.logout(userId, currentToken);

      expect(result).toBe(false);
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });

    it('should release client even on error', async () => {
      mockClient.query.mockRejectedValueOnce(new Error('Database error'));

      await authService.logout(userId);

      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('hasPermission - extended tests', () => {
    it('should handle case-insensitive roles', () => {
      const user1 = { role: 'admin' };
      const user2 = { role: 'Admin' };
      const user3 = { role: 'ADMIN' };

      expect(authService.hasPermission(user1, 'entity:delete')).toBe(true);
      expect(authService.hasPermission(user2, 'entity:delete')).toBe(true);
      expect(authService.hasPermission(user3, 'entity:delete')).toBe(true);
    });

    it('should return false for users without role property', () => {
      const user = { id: '123', email: 'test@example.com' };

      expect(authService.hasPermission(user, 'entity:create')).toBe(false);
    });

    it('should check all ANALYST permissions', () => {
      const analyst = { role: 'ANALYST' };

      // Should have these permissions
      expect(
        authService.hasPermission(analyst, 'investigation:create'),
      ).toBe(true);
      expect(authService.hasPermission(analyst, 'investigation:read')).toBe(
        true,
      );
      expect(authService.hasPermission(analyst, 'investigation:update')).toBe(
        true,
      );
      expect(authService.hasPermission(analyst, 'entity:create')).toBe(true);
      expect(authService.hasPermission(analyst, 'entity:read')).toBe(true);
      expect(authService.hasPermission(analyst, 'entity:update')).toBe(true);
      expect(authService.hasPermission(analyst, 'entity:delete')).toBe(true);
      expect(authService.hasPermission(analyst, 'relationship:create')).toBe(
        true,
      );
      expect(authService.hasPermission(analyst, 'relationship:read')).toBe(
        true,
      );
      expect(authService.hasPermission(analyst, 'relationship:update')).toBe(
        true,
      );
      expect(authService.hasPermission(analyst, 'relationship:delete')).toBe(
        true,
      );
      expect(authService.hasPermission(analyst, 'tag:create')).toBe(true);
      expect(authService.hasPermission(analyst, 'tag:read')).toBe(true);
      expect(authService.hasPermission(analyst, 'tag:delete')).toBe(true);
      expect(authService.hasPermission(analyst, 'graph:read')).toBe(true);
      expect(authService.hasPermission(analyst, 'graph:export')).toBe(true);
      expect(authService.hasPermission(analyst, 'ai:request')).toBe(true);

      // Should NOT have admin permissions
      expect(authService.hasPermission(analyst, 'user:manage')).toBe(false);
      expect(authService.hasPermission(analyst, 'system:configure')).toBe(
        false,
      );
    });

    it('should check all VIEWER permissions', () => {
      const viewer = { role: 'VIEWER' };

      // Should have read-only permissions
      expect(authService.hasPermission(viewer, 'investigation:read')).toBe(
        true,
      );
      expect(authService.hasPermission(viewer, 'entity:read')).toBe(true);
      expect(authService.hasPermission(viewer, 'relationship:read')).toBe(
        true,
      );
      expect(authService.hasPermission(viewer, 'tag:read')).toBe(true);
      expect(authService.hasPermission(viewer, 'graph:read')).toBe(true);
      expect(authService.hasPermission(viewer, 'graph:export')).toBe(true);

      // Should NOT have write permissions
      expect(authService.hasPermission(viewer, 'investigation:create')).toBe(
        false,
      );
      expect(authService.hasPermission(viewer, 'entity:create')).toBe(false);
      expect(authService.hasPermission(viewer, 'entity:update')).toBe(false);
      expect(authService.hasPermission(viewer, 'entity:delete')).toBe(false);
      expect(authService.hasPermission(viewer, 'ai:request')).toBe(false);
    });

    it('should validate wildcard permission for ADMIN', () => {
      const admin = { role: 'ADMIN' };

      // Admin should have access to any permission
      expect(authService.hasPermission(admin, 'anything:anything')).toBe(true);
      expect(authService.hasPermission(admin, 'system:shutdown')).toBe(true);
      expect(authService.hasPermission(admin, 'nuclear:launch')).toBe(true);
    });
  });

  describe('register - extended tests', () => {
    it('should use default role ANALYST if not provided', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
      };

      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [] }) // Existing user check
        .mockResolvedValueOnce({
          // User insert
          rows: [
            {
              id: 'user123',
              email: userData.email,
              role: 'ANALYST', // Default role
              is_active: true,
              created_at: new Date(),
            },
          ],
        })
        .mockResolvedValueOnce({}) // Session insert
        .mockResolvedValueOnce({}); // COMMIT

      argon2.hash.mockResolvedValue('hashedpassword');
      jwt.sign.mockReturnValue('mockToken');

      const result = await authService.register(userData);

      expect(result.user.role).toBe('ANALYST');
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO users'),
        expect.arrayContaining([
          userData.email,
          undefined, // username
          'hashedpassword',
          userData.firstName,
          userData.lastName,
          'ANALYST', // Default role
        ]),
      );
    });

    it('should rollback transaction on password hashing error', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
      };

      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [] }); // Existing user check

      argon2.hash.mockRejectedValueOnce(new Error('Argon2 hashing failed'));

      await expect(authService.register(userData)).rejects.toThrow(
        'Argon2 hashing failed',
      );
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should release client even on error', async () => {
      const userData = { email: 'test@example.com', password: 'password123' };

      mockClient.query.mockRejectedValueOnce(new Error('Database error'));

      await expect(authService.register(userData)).rejects.toThrow(
        'Database error',
      );
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should format user with fullName', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
        role: 'ANALYST',
      };

      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [] }) // Existing user check
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'user123',
              email: userData.email,
              first_name: 'John',
              last_name: 'Doe',
              role: 'ANALYST',
              is_active: true,
              created_at: new Date(),
            },
          ],
        })
        .mockResolvedValueOnce({}) // Session insert
        .mockResolvedValueOnce({}); // COMMIT

      argon2.hash.mockResolvedValue('hashedpassword');
      jwt.sign.mockReturnValue('mockToken');

      const result = await authService.register(userData);

      expect(result.user.fullName).toBe('John Doe');
      expect(result.user.firstName).toBe('John');
      expect(result.user.lastName).toBe('Doe');
    });
  });

  describe('login - extended tests', () => {
    it('should update last_login timestamp on successful login', async () => {
      const email = 'test@example.com';
      const password = 'password123';
      const user = {
        id: 'user123',
        email,
        password_hash: 'hashedpassword',
        role: 'ANALYST',
        is_active: true,
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [user] }) // User fetch
        .mockResolvedValueOnce({}) // UPDATE last_login
        .mockResolvedValueOnce({}); // Session insert

      argon2.verify.mockResolvedValue(true);
      jwt.sign.mockReturnValue('mockToken');

      await authService.login(email, password);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE users SET last_login'),
        [user.id],
      );
    });

    it('should not login inactive users', async () => {
      const email = 'test@example.com';
      const password = 'password123';

      // Query filters by is_active = true, so inactive users return no rows
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      await expect(authService.login(email, password)).rejects.toThrow(
        'Invalid credentials',
      );
    });

    it('should release client even on error', async () => {
      mockClient.query.mockRejectedValueOnce(new Error('Database error'));

      await expect(
        authService.login('test@example.com', 'password'),
      ).rejects.toThrow('Database error');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should accept optional ipAddress and userAgent parameters', async () => {
      const email = 'test@example.com';
      const password = 'password123';
      const ipAddress = '192.168.1.100';
      const userAgent = 'Mozilla/5.0 (test browser)';

      const user = {
        id: 'user123',
        email,
        password_hash: 'hashedpassword',
        role: 'ANALYST',
        is_active: true,
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [user] })
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({});

      argon2.verify.mockResolvedValue(true);
      jwt.sign.mockReturnValue('mockToken');

      const result = await authService.login(
        email,
        password,
        ipAddress,
        userAgent,
      );

      expect(result).toBeDefined();
      expect(result.token).toBe('mockToken');
    });
  });

  describe('verifyToken - extended tests', () => {
    it('should verify token against blacklist before checking user', async () => {
      const token = 'validToken';
      const decodedPayload = {
        userId: 'user123',
        email: 'test@example.com',
        role: 'ANALYST',
      };

      jwt.verify.mockReturnValue(decodedPayload);
      mockPool.query.mockResolvedValueOnce({ rows: [] }); // Not blacklisted
      mockClient.query.mockResolvedValueOnce({
        rows: [
          {
            id: 'user123',
            email: 'test@example.com',
            role: 'ANALYST',
            is_active: true,
            first_name: 'Test',
            last_name: 'User',
          },
        ],
      });

      const result = await authService.verifyToken(token);

      expect(result).toBeDefined();
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT 1 FROM token_blacklist'),
        expect.any(Array),
      );
    });

    it('should properly format returned user object', async () => {
      const token = 'validToken';
      const decodedPayload = {
        userId: 'user123',
        email: 'test@example.com',
        role: 'ANALYST',
      };
      const dbUser = {
        id: 'user123',
        email: 'test@example.com',
        username: 'testuser',
        first_name: 'Jane',
        last_name: 'Smith',
        role: 'ANALYST',
        is_active: true,
        created_at: new Date('2024-01-01'),
        updated_at: new Date('2024-01-15'),
        last_login: new Date('2024-01-20'),
      };

      jwt.verify.mockReturnValue(decodedPayload);
      mockPool.query.mockResolvedValueOnce({ rows: [] }); // Not blacklisted
      mockClient.query.mockResolvedValueOnce({ rows: [dbUser] });

      const result = await authService.verifyToken(token);

      expect(result.fullName).toBe('Jane Smith');
      expect(result.firstName).toBe('Jane');
      expect(result.lastName).toBe('Smith');
      expect(result.username).toBe('testuser');
      expect(result.isActive).toBe(true);
      expect(result.createdAt).toEqual(dbUser.created_at);
      expect(result.updatedAt).toEqual(dbUser.updated_at);
      expect(result.lastLogin).toEqual(dbUser.last_login);
      // Should not include password_hash
      expect(result.password_hash).toBeUndefined();
    });
  });
});
