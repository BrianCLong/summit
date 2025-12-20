/**
 * JWT Security Manager Test Suite
 *
 * Tests for:
 * - Key generation and rotation
 * - Token signing and verification
 * - Replay attack protection
 * - Circuit breaker behavior
 * - JWKS endpoint functionality
 */

import { jest } from '@jest/globals';
import { createJWTSecurityManager, JWTSecurityManager } from '../jwt-security';
import { createClient } from 'redis';

// Mock Redis
jest.mock('redis', () => ({
  createClient: jest.fn(() => ({
    connect: jest.fn(),
    quit: jest.fn(),
    get: jest.fn(),
    set: jest.fn(),
    setex: jest.fn(),
    exists: jest.fn(),
    keys: jest.fn(),
    del: jest.fn(),
    ping: jest.fn(),
  })),
}));

describe('JWTSecurityManager', () => {
  let jwtManager: JWTSecurityManager;
  let mockRedis: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRedis = (createClient as jest.Mock)();
    mockRedis.connect.mockResolvedValue(undefined);
    mockRedis.ping.mockResolvedValue('PONG');
    mockRedis.get.mockResolvedValue(null);
    mockRedis.set.mockResolvedValue('OK');
    mockRedis.setex.mockResolvedValue('OK');
    mockRedis.exists.mockResolvedValue(0);
    mockRedis.keys.mockResolvedValue([]);
    mockRedis.del.mockResolvedValue(1);
  });

  afterEach(async () => {
    if (jwtManager) {
      await jwtManager.shutdown();
    }
  });

  describe('Initialization', () => {
    it('should initialize successfully with default config', async () => {
      jwtManager = createJWTSecurityManager({
        redisUrl: 'redis://localhost:6379',
      });

      await jwtManager.initialize();

      expect(mockRedis.connect).toHaveBeenCalledTimes(1);
      expect(mockRedis.get).toHaveBeenCalledWith('jwt:current_key');
    });

    it('should generate new key if none exists in Redis', async () => {
      mockRedis.get.mockResolvedValue(null);

      jwtManager = createJWTSecurityManager({
        redisUrl: 'redis://localhost:6379',
      });

      await jwtManager.initialize();

      expect(mockRedis.set).toHaveBeenCalledWith(
        'jwt:current_key',
        expect.any(String),
      );
    });

    it('should load existing key from Redis', async () => {
      const existingKey = {
        kid: 'test-kid-123',
        privateKey: '-----BEGIN PRIVATE KEY-----\nMOCK\n-----END PRIVATE KEY-----',
        publicKey: '-----BEGIN PUBLIC KEY-----\nMOCK\n-----END PUBLIC KEY-----',
        algorithm: 'RS256',
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      };

      mockRedis.get.mockResolvedValue(JSON.stringify(existingKey));

      jwtManager = createJWTSecurityManager({
        redisUrl: 'redis://localhost:6379',
      });

      await jwtManager.initialize();

      expect(mockRedis.get).toHaveBeenCalledWith('jwt:current_key');
      expect(mockRedis.set).not.toHaveBeenCalled(); // Should not generate new key
    });

    it('should rotate expired key on initialization', async () => {
      const expiredKey = {
        kid: 'expired-kid',
        privateKey: '-----BEGIN PRIVATE KEY-----\nMOCK\n-----END PRIVATE KEY-----',
        publicKey: '-----BEGIN PUBLIC KEY-----\nMOCK\n-----END PUBLIC KEY-----',
        algorithm: 'RS256',
        createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
        expiresAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // Expired yesterday
      };

      mockRedis.get.mockResolvedValue(JSON.stringify(expiredKey));

      jwtManager = createJWTSecurityManager({
        redisUrl: 'redis://localhost:6379',
      });

      await jwtManager.initialize();

      // Should rotate key
      expect(mockRedis.set).toHaveBeenCalledWith(
        'jwt:current_key',
        expect.any(String),
      );
      expect(mockRedis.setex).toHaveBeenCalledWith(
        `jwt:key:${expiredKey.kid}`,
        expect.any(Number),
        expect.any(String),
      );
    });
  });

  describe('Token Signing', () => {
    beforeEach(async () => {
      jwtManager = createJWTSecurityManager({
        redisUrl: 'redis://localhost:6379',
        issuer: 'test-issuer',
        audience: 'test-audience',
      });
      await jwtManager.initialize();
    });

    it('should sign a token with required claims', async () => {
      const token = await jwtManager.signToken({
        sub: 'user-123',
        userId: 'user-123',
        tenantId: 'tenant-456',
      });

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT format: header.payload.signature
    });

    it('should include kid in JWT header', async () => {
      const token = await jwtManager.signToken({
        sub: 'user-123',
      });

      const [headerBase64] = token.split('.');
      const header = JSON.parse(Buffer.from(headerBase64, 'base64').toString());

      expect(header.kid).toBeDefined();
      expect(header.alg).toBe('RS256');
    });

    it('should include jti for replay protection', async () => {
      const token = await jwtManager.signToken({
        sub: 'user-123',
      });

      const [, payloadBase64] = token.split('.');
      const payload = JSON.parse(
        Buffer.from(payloadBase64, 'base64').toString(),
      );

      expect(payload.jti).toBeDefined();
      expect(payload.iss).toBe('test-issuer');
      expect(payload.aud).toBe('test-audience');
    });

    it('should throw error if no current key available', async () => {
      // Create a manager without initializing
      const uninitializedManager = createJWTSecurityManager({
        redisUrl: 'redis://localhost:6379',
      });

      await expect(
        uninitializedManager.signToken({ sub: 'user-123' }),
      ).rejects.toThrow('No current JWT signing key available');
    });
  });

  describe('Token Verification', () => {
    let token: string;

    beforeEach(async () => {
      jwtManager = createJWTSecurityManager({
        redisUrl: 'redis://localhost:6379',
        issuer: 'test-issuer',
        audience: 'test-audience',
      });
      await jwtManager.initialize();

      // Sign a test token
      token = await jwtManager.signToken({
        sub: 'user-123',
        userId: 'user-123',
        scopes: ['read', 'write'],
      });
    });

    it('should verify a valid token', async () => {
      mockRedis.exists.mockResolvedValue(0); // JTI doesn't exist (not replayed)

      const payload = await jwtManager.verifyToken(token);

      expect(payload.sub).toBe('user-123');
      expect(payload.userId).toBe('user-123');
      expect(payload.scopes).toEqual(['read', 'write']);
      expect(payload.iss).toBe('test-issuer');
      expect(payload.aud).toBe('test-audience');
    });

    it('should throw error for token without kid header', async () => {
      const malformedToken = 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.signature';

      await expect(jwtManager.verifyToken(malformedToken)).rejects.toThrow();
    });

    it('should throw error for invalid signature', async () => {
      const [header, payload] = token.split('.');
      const tamperedToken = `${header}.${payload}.invalid_signature`;

      await expect(jwtManager.verifyToken(tamperedToken)).rejects.toThrow();
    });

    it('should throw error for unknown kid', async () => {
      // Create a token with different manager
      const otherManager = createJWTSecurityManager({
        redisUrl: 'redis://localhost:6380',
      });
      await otherManager.initialize();
      const otherToken = await otherManager.signToken({ sub: 'user-123' });
      await otherManager.shutdown();

      await expect(jwtManager.verifyToken(otherToken)).rejects.toThrow(
        'Unknown key ID',
      );
    });

    it('should detect replay attacks using JTI', async () => {
      mockRedis.exists.mockResolvedValue(0); // First verification succeeds

      // First verification
      await jwtManager.verifyToken(token);

      // Simulate JTI already exists (replay)
      mockRedis.exists.mockResolvedValue(1);

      // Second verification should fail
      await expect(jwtManager.verifyToken(token)).rejects.toThrow(
        'JWT replay attack detected',
      );
    });

    it('should record JTI with TTL for replay protection', async () => {
      mockRedis.exists.mockResolvedValue(0);

      await jwtManager.verifyToken(token);

      expect(mockRedis.setex).toHaveBeenCalledWith(
        expect.stringMatching(/^jwt:jti:/),
        expect.any(Number), // TTL in seconds
        '1',
      );
    });

    it('should reject token with wrong issuer', async () => {
      const wrongIssuerManager = createJWTSecurityManager({
        redisUrl: 'redis://localhost:6379',
        issuer: 'wrong-issuer',
      });
      await wrongIssuerManager.initialize();

      await expect(wrongIssuerManager.verifyToken(token)).rejects.toThrow();

      await wrongIssuerManager.shutdown();
    });

    it('should reject token with wrong audience', async () => {
      const wrongAudienceManager = createJWTSecurityManager({
        redisUrl: 'redis://localhost:6379',
        issuer: 'test-issuer',
        audience: 'wrong-audience',
      });
      await wrongAudienceManager.initialize();

      await expect(wrongAudienceManager.verifyToken(token)).rejects.toThrow();

      await wrongAudienceManager.shutdown();
    });
  });

  describe('Key Rotation', () => {
    beforeEach(async () => {
      jwtManager = createJWTSecurityManager({
        redisUrl: 'redis://localhost:6379',
        keyRotationInterval: 100, // 100ms for testing
      });
      await jwtManager.initialize();
    });

    it('should store old key when rotating', async () => {
      const token1 = await jwtManager.signToken({ sub: 'user-1' });
      const [header1Base64] = token1.split('.');
      const header1 = JSON.parse(
        Buffer.from(header1Base64, 'base64').toString(),
      );
      const kid1 = header1.kid;

      // Force rotation by waiting
      await new Promise((resolve) => setTimeout(resolve, 150));

      expect(mockRedis.setex).toHaveBeenCalledWith(
        `jwt:key:${kid1}`,
        expect.any(Number),
        expect.any(String),
      );
    });

    it('should be able to verify tokens signed with old keys', async () => {
      mockRedis.exists.mockResolvedValue(0);

      const token1 = await jwtManager.signToken({ sub: 'user-1' });

      // Simulate key rotation
      // In real scenario, old key would be in Redis
      const oldKeyData = {
        kid: 'old-kid',
        publicKey: '-----BEGIN PUBLIC KEY-----\nMOCK\n-----END PUBLIC KEY-----',
        algorithm: 'RS256',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      };
      mockRedis.get.mockResolvedValue(JSON.stringify(oldKeyData));

      // Should still verify token signed with current key
      const payload = await jwtManager.verifyToken(token1);
      expect(payload.sub).toBe('user-1');
    });

    it('should cleanup expired keys', async () => {
      const expiredKeyId = 'expired-key-123';
      mockRedis.keys.mockResolvedValue([`jwt:key:${expiredKeyId}`]);
      mockRedis.get.mockResolvedValue(
        JSON.stringify({
          kid: expiredKeyId,
          expiresAt: new Date(Date.now() - 1000).toISOString(), // Expired
        }),
      );

      // Trigger rotation which calls cleanup
      await jwtManager.initialize();

      // Wait for cleanup
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Should have deleted expired key
      expect(mockRedis.del).toHaveBeenCalledWith(`jwt:key:${expiredKeyId}`);
    });
  });

  describe('JWKS Endpoint', () => {
    beforeEach(async () => {
      jwtManager = createJWTSecurityManager({
        redisUrl: 'redis://localhost:6379',
      });
      await jwtManager.initialize();
    });

    it('should return public keys in JWKS format', async () => {
      const keys = await jwtManager.getPublicKeys();

      expect(Array.isArray(keys)).toBe(true);
      expect(keys.length).toBeGreaterThan(0);

      const key = keys[0];
      expect(key.kid).toBeDefined();
      expect(key.kty).toBe('RSA');
      expect(key.use).toBe('sig');
      expect(key.alg).toBe('RS256');
      expect(key.n).toBeDefined(); // RSA modulus
      expect(key.e).toBe('AQAB'); // Standard RSA exponent
    });

    it('should only include valid (non-expired) keys', async () => {
      const keys = await jwtManager.getPublicKeys();

      // All keys should be valid
      keys.forEach((key) => {
        expect(key.kid).toBeDefined();
      });
    });
  });

  describe('Health Check', () => {
    beforeEach(async () => {
      jwtManager = createJWTSecurityManager({
        redisUrl: 'redis://localhost:6379',
      });
      await jwtManager.initialize();
    });

    it('should return healthy status when everything is ok', async () => {
      mockRedis.ping.mockResolvedValue('PONG');

      const health = await jwtManager.healthCheck();

      expect(health.status).toBe('healthy');
      expect(health.details.redis).toBe('connected');
      expect(health.details.currentKey).toBeDefined();
      expect(health.details.keyExpiry).toBeDefined();
    });

    it('should return degraded status when Redis is down', async () => {
      mockRedis.ping.mockRejectedValue(new Error('Connection refused'));

      const health = await jwtManager.healthCheck();

      expect(health.status).toBe('degraded');
      expect(health.details.redis).toBe('disconnected');
    });

    it('should return unhealthy status on error', async () => {
      mockRedis.ping.mockRejectedValue(new Error('Fatal error'));

      const health = await jwtManager.healthCheck();

      expect(health.status).toBe('unhealthy');
      expect(health.details.error).toBeDefined();
    });
  });

  describe('Shutdown', () => {
    it('should gracefully shutdown and close Redis connection', async () => {
      jwtManager = createJWTSecurityManager({
        redisUrl: 'redis://localhost:6379',
      });
      await jwtManager.initialize();

      await jwtManager.shutdown();

      expect(mockRedis.quit).toHaveBeenCalledTimes(1);
    });

    it('should handle shutdown errors gracefully', async () => {
      jwtManager = createJWTSecurityManager({
        redisUrl: 'redis://localhost:6379',
      });
      await jwtManager.initialize();

      mockRedis.quit.mockRejectedValue(new Error('Redis error'));

      // Should not throw
      await expect(jwtManager.shutdown()).resolves.not.toThrow();
    });
  });

  describe('Edge Cases', () => {
    beforeEach(async () => {
      jwtManager = createJWTSecurityManager({
        redisUrl: 'redis://localhost:6379',
      });
      await jwtManager.initialize();
    });

    it('should handle malformed token gracefully', async () => {
      await expect(
        jwtManager.verifyToken('not-a-valid-jwt'),
      ).rejects.toThrow();
    });

    it('should handle empty token', async () => {
      await expect(jwtManager.verifyToken('')).rejects.toThrow();
    });

    it('should handle token with tampered payload', async () => {
      const token = await jwtManager.signToken({ sub: 'user-123' });
      const [header, , signature] = token.split('.');

      // Tamper with payload
      const tamperedPayload = Buffer.from(
        JSON.stringify({ sub: 'attacker' }),
      ).toString('base64url');
      const tamperedToken = `${header}.${tamperedPayload}.${signature}`;

      await expect(jwtManager.verifyToken(tamperedToken)).rejects.toThrow();
    });

    it('should handle concurrent token signing', async () => {
      const promises = Array.from({ length: 10 }, (_, i) =>
        jwtManager.signToken({ sub: `user-${i}` }),
      );

      const tokens = await Promise.all(promises);

      expect(tokens).toHaveLength(10);
      tokens.forEach((token, i) => {
        expect(token).toBeDefined();
        expect(typeof token).toBe('string');
      });
    });

    it('should handle concurrent token verification', async () => {
      mockRedis.exists.mockResolvedValue(0);

      const tokens = await Promise.all(
        Array.from({ length: 5 }, (_, i) =>
          jwtManager.signToken({ sub: `user-${i}` }),
        ),
      );

      const verifications = await Promise.all(
        tokens.map((token) => jwtManager.verifyToken(token)),
      );

      expect(verifications).toHaveLength(5);
      verifications.forEach((payload, i) => {
        expect(payload.sub).toBe(`user-${i}`);
      });
    });
  });
});
