/**
 * Authentication & Authorization Integration Tests
 *
 * Tests for authentication flows, token validation, and authorization.
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// Types
interface AuthToken {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
}

interface TokenPayload {
  sub: string;
  userId: string;
  email: string;
  role: string;
  permissions: string[];
  iat: number;
  exp: number;
}

// Mock auth service
const createMockAuthService = () => {
  const validTokens = new Map<string, TokenPayload>();
  const revokedTokens = new Set<string>();

  return {
    login: jest.fn(async (email: string, password: string): Promise<AuthToken> => {
      if (email === 'invalid@test.com' || password === 'wrongpassword') {
        throw new Error('Invalid credentials');
      }

      const accessToken = `access_${Date.now()}_${Math.random().toString(36)}`;
      const refreshToken = `refresh_${Date.now()}_${Math.random().toString(36)}`;

      const payload: TokenPayload = {
        sub: 'user-123',
        userId: 'user-123',
        email,
        role: email.includes('admin') ? 'ADMIN' : 'ANALYST',
        permissions: email.includes('admin')
          ? ['*']
          : ['entity:read', 'entity:create', 'investigation:read'],
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      };

      validTokens.set(accessToken, payload);

      return {
        accessToken,
        refreshToken,
        expiresIn: 3600,
        tokenType: 'Bearer',
      };
    }),

    validateToken: jest.fn(async (token: string): Promise<TokenPayload | null> => {
      if (revokedTokens.has(token)) {
        return null;
      }
      return validTokens.get(token) || null;
    }),

    refreshAccessToken: jest.fn(async (refreshToken: string): Promise<AuthToken> => {
      if (!refreshToken.startsWith('refresh_')) {
        throw new Error('Invalid refresh token');
      }

      const accessToken = `access_${Date.now()}_${Math.random().toString(36)}`;
      const newRefreshToken = `refresh_${Date.now()}_${Math.random().toString(36)}`;

      validTokens.set(accessToken, {
        sub: 'user-123',
        userId: 'user-123',
        email: 'user@test.com',
        role: 'ANALYST',
        permissions: ['entity:read', 'entity:create'],
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      });

      return {
        accessToken,
        refreshToken: newRefreshToken,
        expiresIn: 3600,
        tokenType: 'Bearer',
      };
    }),

    revokeToken: jest.fn(async (token: string): Promise<void> => {
      revokedTokens.add(token);
      validTokens.delete(token);
    }),

    logout: jest.fn(async (token: string): Promise<void> => {
      revokedTokens.add(token);
      validTokens.delete(token);
    }),

    checkPermission: jest.fn(async (token: string, permission: string): Promise<boolean> => {
      const payload = validTokens.get(token);
      if (!payload) return false;

      if (payload.permissions.includes('*')) return true;
      return payload.permissions.includes(permission);
    }),

    _validTokens: validTokens,
    _revokedTokens: revokedTokens,
  };
};

describe('Authentication Integration', () => {
  let authService: ReturnType<typeof createMockAuthService>;

  beforeEach(() => {
    authService = createMockAuthService();
    jest.clearAllMocks();
  });

  describe('Login Flow', () => {
    it('should successfully login with valid credentials', async () => {
      const result = await authService.login('user@test.com', 'validpassword');

      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(result.tokenType).toBe('Bearer');
      expect(result.expiresIn).toBeGreaterThan(0);
    });

    it('should fail login with invalid email', async () => {
      await expect(
        authService.login('invalid@test.com', 'password')
      ).rejects.toThrow('Invalid credentials');
    });

    it('should fail login with wrong password', async () => {
      await expect(
        authService.login('user@test.com', 'wrongpassword')
      ).rejects.toThrow('Invalid credentials');
    });

    it('should assign admin role to admin users', async () => {
      const result = await authService.login('admin@test.com', 'password');
      const payload = await authService.validateToken(result.accessToken);

      expect(payload?.role).toBe('ADMIN');
    });

    it('should assign analyst role to regular users', async () => {
      const result = await authService.login('analyst@test.com', 'password');
      const payload = await authService.validateToken(result.accessToken);

      expect(payload?.role).toBe('ANALYST');
    });
  });

  describe('Token Validation', () => {
    it('should validate a valid token', async () => {
      const { accessToken } = await authService.login('user@test.com', 'password');

      const payload = await authService.validateToken(accessToken);

      expect(payload).not.toBeNull();
      expect(payload?.userId).toBe('user-123');
      expect(payload?.email).toBe('user@test.com');
    });

    it('should return null for invalid token', async () => {
      const payload = await authService.validateToken('invalid_token');

      expect(payload).toBeNull();
    });

    it('should return null for revoked token', async () => {
      const { accessToken } = await authService.login('user@test.com', 'password');
      await authService.revokeToken(accessToken);

      const payload = await authService.validateToken(accessToken);

      expect(payload).toBeNull();
    });

    it('should include expiration time in payload', async () => {
      const { accessToken } = await authService.login('user@test.com', 'password');

      const payload = await authService.validateToken(accessToken);

      expect(payload?.exp).toBeDefined();
      expect(payload?.exp).toBeGreaterThan(payload?.iat || 0);
    });
  });

  describe('Token Refresh', () => {
    it('should refresh access token with valid refresh token', async () => {
      const initial = await authService.login('user@test.com', 'password');

      const refreshed = await authService.refreshAccessToken(initial.refreshToken);

      expect(refreshed.accessToken).toBeDefined();
      expect(refreshed.accessToken).not.toBe(initial.accessToken);
      expect(refreshed.refreshToken).toBeDefined();
    });

    it('should fail refresh with invalid refresh token', async () => {
      await expect(
        authService.refreshAccessToken('invalid_refresh_token')
      ).rejects.toThrow('Invalid refresh token');
    });

    it('should return new refresh token on refresh', async () => {
      const initial = await authService.login('user@test.com', 'password');

      const refreshed = await authService.refreshAccessToken(initial.refreshToken);

      expect(refreshed.refreshToken).not.toBe(initial.refreshToken);
    });
  });

  describe('Logout', () => {
    it('should invalidate token on logout', async () => {
      const { accessToken } = await authService.login('user@test.com', 'password');

      await authService.logout(accessToken);

      const payload = await authService.validateToken(accessToken);
      expect(payload).toBeNull();
    });

    it('should handle logout with already invalid token', async () => {
      await expect(
        authService.logout('invalid_token')
      ).resolves.not.toThrow();
    });
  });
});

describe('Authorization Integration', () => {
  let authService: ReturnType<typeof createMockAuthService>;

  beforeEach(() => {
    authService = createMockAuthService();
    jest.clearAllMocks();
  });

  describe('Permission Checking', () => {
    it('should grant admin all permissions', async () => {
      const { accessToken } = await authService.login('admin@test.com', 'password');

      const canRead = await authService.checkPermission(accessToken, 'entity:read');
      const canDelete = await authService.checkPermission(accessToken, 'entity:delete');
      const canAdmin = await authService.checkPermission(accessToken, 'system:admin');

      expect(canRead).toBe(true);
      expect(canDelete).toBe(true);
      expect(canAdmin).toBe(true);
    });

    it('should grant analyst limited permissions', async () => {
      const { accessToken } = await authService.login('analyst@test.com', 'password');

      const canRead = await authService.checkPermission(accessToken, 'entity:read');
      const canCreate = await authService.checkPermission(accessToken, 'entity:create');
      const canDelete = await authService.checkPermission(accessToken, 'entity:delete');

      expect(canRead).toBe(true);
      expect(canCreate).toBe(true);
      expect(canDelete).toBe(false);
    });

    it('should deny permissions for invalid token', async () => {
      const canRead = await authService.checkPermission('invalid_token', 'entity:read');

      expect(canRead).toBe(false);
    });

    it('should deny permissions for revoked token', async () => {
      const { accessToken } = await authService.login('analyst@test.com', 'password');
      await authService.revokeToken(accessToken);

      const canRead = await authService.checkPermission(accessToken, 'entity:read');

      expect(canRead).toBe(false);
    });
  });

  describe('Role-Based Access', () => {
    it('should include role in token payload', async () => {
      const { accessToken } = await authService.login('analyst@test.com', 'password');

      const payload = await authService.validateToken(accessToken);

      expect(payload?.role).toBeDefined();
      expect(['ADMIN', 'ANALYST', 'VIEWER']).toContain(payload?.role);
    });

    it('should include permissions list in token payload', async () => {
      const { accessToken } = await authService.login('analyst@test.com', 'password');

      const payload = await authService.validateToken(accessToken);

      expect(payload?.permissions).toBeDefined();
      expect(Array.isArray(payload?.permissions)).toBe(true);
    });
  });
});

describe('Security Edge Cases', () => {
  let authService: ReturnType<typeof createMockAuthService>;

  beforeEach(() => {
    authService = createMockAuthService();
    jest.clearAllMocks();
  });

  it('should handle concurrent login attempts', async () => {
    const promises = Array.from({ length: 5 }, () =>
      authService.login('user@test.com', 'password')
    );

    const results = await Promise.all(promises);

    expect(results).toHaveLength(5);
    results.forEach(r => {
      expect(r.accessToken).toBeDefined();
    });

    // Each should get unique token
    const tokens = results.map(r => r.accessToken);
    const uniqueTokens = new Set(tokens);
    expect(uniqueTokens.size).toBe(5);
  });

  it('should handle rapid token validation', async () => {
    const { accessToken } = await authService.login('user@test.com', 'password');

    const validations = Array.from({ length: 100 }, () =>
      authService.validateToken(accessToken)
    );

    const results = await Promise.all(validations);

    results.forEach(r => {
      expect(r).not.toBeNull();
      expect(r?.userId).toBe('user-123');
    });
  });

  it('should handle special characters in email', async () => {
    const result = await authService.login('user+test@test.com', 'password');

    expect(result.accessToken).toBeDefined();

    const payload = await authService.validateToken(result.accessToken);
    expect(payload?.email).toBe('user+test@test.com');
  });
});
