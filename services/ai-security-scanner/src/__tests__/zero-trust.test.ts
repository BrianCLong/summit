import { describe, it, expect, beforeEach } from 'vitest';
import { ZeroTrustValidator } from '../zero-trust/validator.js';
import type { ZeroTrustContext } from '../types.js';

describe('ZeroTrustValidator', () => {
  let validator: ZeroTrustValidator;

  beforeEach(() => {
    validator = new ZeroTrustValidator({
      maxSessionDuration: 3600000,
      riskThreshold: 70,
      requireMFA: false,
      geoFencing: false,
      deviceTrustRequired: false,
      continuousValidation: true,
    });
  });

  describe('session management', () => {
    it('should create a new session', () => {
      const context = validator.createSession(
        'user-123',
        'device-456',
        'US-East',
        ['read:*', 'write:data']
      );

      expect(context.sessionId).toBeDefined();
      expect(context.userId).toBe('user-123');
      expect(context.deviceId).toBe('device-456');
      expect(context.permissions).toContain('read:*');
    });

    it('should terminate session', async () => {
      const context = validator.createSession(
        'user-123',
        'device-456',
        'US-East',
        ['read:*']
      );

      await validator.terminateSession(context.sessionId, 'user-logout');
      // Session should be removed (no error thrown)
    });
  });

  describe('access validation', () => {
    it('should allow access with valid permissions', async () => {
      const context = validator.createSession(
        'user-123',
        'device-456',
        'US-East',
        ['resource:read']
      );

      const result = await validator.validateAccess(
        context,
        'resource',
        'read'
      );

      expect(result.allowed).toBe(true);
      expect(result.riskScore).toBeLessThan(70);
    });

    it('should deny access without permissions', async () => {
      const context = validator.createSession(
        'user-123',
        'device-456',
        'US-East',
        ['other:read']
      );

      const result = await validator.validateAccess(
        context,
        'resource',
        'write'
      );

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Missing permission');
    });

    it('should allow wildcard permissions', async () => {
      const context = validator.createSession(
        'user-123',
        'device-456',
        'US-East',
        ['*']
      );

      const result = await validator.validateAccess(
        context,
        'any-resource',
        'any-action'
      );

      expect(result.allowed).toBe(true);
    });
  });

  describe('risk scoring', () => {
    it('should increase risk for sensitive operations', async () => {
      const context = validator.createSession(
        'user-123',
        'device-456',
        'US-East',
        ['secrets:delete']
      );

      const result = await validator.validateAccess(
        context,
        'secrets',
        'delete'
      );

      // Risk should be elevated for sensitive resource + action
      expect(result.riskScore).toBeGreaterThan(0);
    });
  });

  describe('device trust', () => {
    it('should register device with attestations', async () => {
      await validator.registerDevice('device-123', [
        {
          type: 'hardware',
          status: 'valid',
          verifiedAt: new Date(),
          expiresAt: new Date(Date.now() + 86400000),
        },
        {
          type: 'software',
          status: 'valid',
          verifiedAt: new Date(),
          expiresAt: new Date(Date.now() + 86400000),
        },
      ]);

      // Device should be registered (no error thrown)
    });
  });
});
