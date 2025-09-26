const AuthService = require('../../src/services/AuthService');
const { getPostgresPool } = require('../../src/config/database');
const argon2 = require('argon2');
const jwt = require('jsonwebtoken');

const mockSessionStore = {
  saveSession: jest.fn(),
  getSession: jest.fn(),
  revokeSession: jest.fn(),
  revokeAllSessionsForUser: jest.fn(),
  listSessionsForUser: jest.fn(),
  hashRefreshToken: jest.fn((token) => `hashed-${token}`),
  touchSession: jest.fn(),
};

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

jest.mock('../../src/services/sessionStore', () => ({
  sessionStore: mockSessionStore,
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
    Object.values(mockSessionStore).forEach((fn) => {
      if (typeof fn.mockReset === 'function') {
        fn.mockReset();
      }
    });
    mockSessionStore.hashRefreshToken.mockImplementation((token) => `hashed-${token}`);
    mockSessionStore.listSessionsForUser.mockResolvedValue([]);
    mockSessionStore.revokeAllSessionsForUser.mockResolvedValue(0);
    mockSessionStore.getSession.mockResolvedValue(null);
    mockSessionStore.touchSession.mockResolvedValue(null);
    mockSessionStore.saveSession.mockResolvedValue(undefined);
    mockSessionStore.revokeSession.mockResolvedValue(undefined);

    jwt.sign.mockImplementation((payload) =>
      payload && payload.type === 'refresh' ? 'mockRefreshToken' : 'mockToken',
    );
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
      expect(authService.hasPermission({ role: 'UNKNOWN' }, 'any:permission')).toBe(false);
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
          rows: [{ id: 'user123', ...userData, is_active: true, created_at: new Date() }],
        }) // For user insert
        .mockResolvedValueOnce({}) // For session insert
        .mockResolvedValueOnce({}); // For COMMIT

      argon2.hash.mockResolvedValue('hashedpassword');

      const result = await authService.register(userData);

      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(argon2.hash).toHaveBeenCalledWith('password123');
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO users'),
        expect.any(Array),
      );
      expect(jwt.sign).toHaveBeenCalled();
      expect(mockSessionStore.saveSession).toHaveBeenCalledTimes(1);
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(result.user.email).toBe('test@example.com');
      expect(result.token).toBe('mockToken');
      expect(result.refreshToken).toBe('mockRefreshToken');
      expect(result.session).toBeDefined();
      const savedSession = mockSessionStore.saveSession.mock.calls[0][0];
      expect(savedSession.refreshTokenHash).toBe('hashed-mockRefreshToken');
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

      const result = await authService.login(email, password, '127.0.0.1', 'test-agent');

      expect(argon2.verify).toHaveBeenCalledWith('hashedpassword', 'password123');
      expect(result.user.email).toBe(email);
      expect(result.token).toBe('mockToken');
      expect(result.refreshToken).toBe('mockRefreshToken');
      expect(result.session).toBeDefined();
      expect(mockSessionStore.saveSession).toHaveBeenCalledTimes(1);
    });

    it('should throw error for invalid credentials', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [] }); // User not found

      await expect(authService.login(email, password, '127.0.0.1', 'test-agent')).rejects.toThrow(
        'Invalid credentials',
      );
    });

    it('should throw error for incorrect password', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [user] }); // User found
      argon2.verify.mockResolvedValue(false);

      await expect(authService.login(email, password, '127.0.0.1', 'test-agent')).rejects.toThrow(
        'Invalid credentials',
      );
    });
  });

  describe('verifyToken', () => {
    const token = 'validToken';
    const decodedPayload = {
      userId: 'user123',
      email: 'test@example.com',
      role: 'ANALYST',
      sessionId: 'session123',
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
      const activeSession = {
        sessionId: 'session123',
        userId: 'user123',
        refreshTokenId: 'refresh123',
        refreshTokenHash: 'hash',
        createdAt: new Date().toISOString(),
        lastActivityAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        ipAddress: null,
        userAgent: null,
        revoked: false,
      };
      jwt.verify.mockReturnValue(decodedPayload);
      mockSessionStore.getSession.mockResolvedValue(activeSession);
      mockSessionStore.touchSession.mockResolvedValue(activeSession);
      mockClient.query
        .mockResolvedValueOnce({ rows: [user] })
        .mockResolvedValueOnce({});

      const result = await authService.verifyToken(token);

      expect(result).toBeDefined();
      expect(result.id).toBe('user123');
      expect(mockSessionStore.touchSession).toHaveBeenCalledWith('session123');
    });

    it('should return null for an invalid token', async () => {
      jwt.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const result = await authService.verifyToken('invalidToken');

      expect(result).toBeNull();
    });

    it('should return null if user not found or inactive', async () => {
      const activeSession = {
        sessionId: 'session123',
        userId: 'user123',
        refreshTokenId: 'refresh123',
        refreshTokenHash: 'hash',
        createdAt: new Date().toISOString(),
        lastActivityAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        ipAddress: null,
        userAgent: null,
        revoked: false,
      };
      jwt.verify.mockReturnValue(decodedPayload);
      mockSessionStore.getSession.mockResolvedValue(activeSession);
      mockSessionStore.touchSession.mockResolvedValue(activeSession);
      mockClient.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rowCount: 1 });

      const result = await authService.verifyToken(token);

      expect(result).toBeNull();
      expect(mockSessionStore.revokeSession).toHaveBeenCalledWith('session123');
    });
  });
});
