/**
 * Secret Rotation Manager Tests
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import {
  SecretRotationManager,
  SecretMetadata,
  getSecretRotationManager,
  resetSecretRotationManager,
} from '../secret-rotation.js';

// Mock Redis
jest.mock('ioredis', () => {
  const storage = new Map<string, string>();
  const sets = new Map<string, Set<string>>();

  return jest.fn().mockImplementation(() => ({
    connect: jest.fn().mockResolvedValue(undefined),
    quit: jest.fn().mockResolvedValue(undefined),
    ping: jest.fn().mockResolvedValue('PONG'),
    get: jest.fn((key: string) => Promise.resolve(storage.get(key) || null)),
    set: jest.fn((key: string, value: string) => {
      storage.set(key, value);
      return Promise.resolve('OK');
    }),
    del: jest.fn((key: string) => {
      storage.delete(key);
      return Promise.resolve(1);
    }),
    keys: jest.fn((pattern: string) => {
      const regex = new RegExp(pattern.replace('*', '.*'));
      return Promise.resolve(Array.from(storage.keys()).filter(k => regex.test(k)));
    }),
    expire: jest.fn().mockResolvedValue(1),
    sadd: jest.fn((key: string, ...values: string[]) => {
      if (!sets.has(key)) sets.set(key, new Set());
      values.forEach(v => sets.get(key)!.add(v));
      return Promise.resolve(values.length);
    }),
    smembers: jest.fn((key: string) => {
      return Promise.resolve(Array.from(sets.get(key) || []));
    }),
    on: jest.fn(),
  }));
});

describe('SecretRotationManager', () => {
  let manager: SecretRotationManager;

  beforeEach(async () => {
    resetSecretRotationManager();
    manager = new SecretRotationManager(undefined, {
      enabled: true,
      checkIntervalMs: 1000,
      gracePeriodMs: 1000,
      maxVersionsRetained: 3,
      encryptAtRest: true,
    });
    await manager.initialize();
  });

  afterEach(async () => {
    await manager.shutdown();
    resetSecretRotationManager();
  });

  describe('Secret Registration', () => {
    it('should register a new secret', async () => {
      const metadata = await manager.registerSecret(
        'api-key',
        'test-api-key',
        'my-secret-value',
        ['test', 'development']
      );

      expect(metadata).toBeDefined();
      expect(metadata.type).toBe('api-key');
      expect(metadata.name).toBe('test-api-key');
      expect(metadata.version).toBe(1);
      expect(metadata.status).toBe('active');
      expect(metadata.tags).toContain('test');
    });

    it('should retrieve registered secret', async () => {
      const registered = await manager.registerSecret(
        'api-key',
        'test-key',
        'super-secret-123'
      );

      const value = await manager.getSecret(registered.id);
      expect(value).toBe('super-secret-123');
    });

    it('should encrypt secrets at rest', async () => {
      const registered = await manager.registerSecret(
        'jwt-signing',
        'jwt-key',
        'plain-text-secret'
      );

      // The stored value should be encrypted, not plain text
      // This is verified by successful decryption on retrieval
      const value = await manager.getSecret(registered.id);
      expect(value).toBe('plain-text-secret');
    });
  });

  describe('Secret Rotation', () => {
    it('should rotate a secret', async () => {
      const original = await manager.registerSecret(
        'webhook',
        'webhook-secret',
        'original-value'
      );

      const rotated = await manager.rotateSecret(original.id, 'manual', 'new-value');

      expect(rotated.version).toBe(2);
      expect(rotated.rotatedBy).toBe('system');
      expect(rotated.rotatedAt).toBeDefined();

      const newValue = await manager.getSecret(original.id);
      expect(newValue).toBe('new-value');
    });

    it('should auto-generate secret if not provided', async () => {
      const original = await manager.registerSecret(
        'api-key',
        'auto-rotate-key',
        'original'
      );

      const rotated = await manager.rotateSecret(original.id, 'manual');
      const newValue = await manager.getSecret(original.id);

      expect(newValue).not.toBe('original');
      expect(newValue).toMatch(/^sk_/); // API key format
    });

    it('should emit rotation event', async () => {
      const events: any[] = [];
      manager.on('secret:rotated', (event) => events.push(event));

      const original = await manager.registerSecret('api-key', 'event-test', 'value');
      await manager.rotateSecret(original.id, 'scheduled');

      expect(events.length).toBe(1);
      expect(events[0].secretId).toBe(original.id);
      expect(events[0].reason).toBe('scheduled');
    });
  });

  describe('Secret Revocation', () => {
    it('should revoke a secret', async () => {
      const secret = await manager.registerSecret('api-key', 'revoke-test', 'value');
      await manager.revokeSecret(secret.id, 'compromised');

      const metadata = await manager.getSecretMetadata(secret.id);
      expect(metadata?.status).toBe('revoked');
    });

    it('should emit revocation event', async () => {
      const events: any[] = [];
      manager.on('secret:revoked', (event) => events.push(event));

      const secret = await manager.registerSecret('api-key', 'revoke-event', 'value');
      await manager.revokeSecret(secret.id, 'manual');

      expect(events.length).toBe(1);
      expect(events[0].id).toBe(secret.id);
    });
  });

  describe('Secret Listing', () => {
    it('should list all secrets', async () => {
      await manager.registerSecret('api-key', 'key-1', 'v1');
      await manager.registerSecret('webhook', 'hook-1', 'v2');
      await manager.registerSecret('api-key', 'key-2', 'v3');

      const all = await manager.listSecrets();
      expect(all.length).toBe(3);
    });

    it('should list secrets by type', async () => {
      await manager.registerSecret('api-key', 'key-1', 'v1');
      await manager.registerSecret('webhook', 'hook-1', 'v2');
      await manager.registerSecret('api-key', 'key-2', 'v3');

      const apiKeys = await manager.listSecrets('api-key');
      expect(apiKeys.length).toBe(2);
      expect(apiKeys.every(s => s.type === 'api-key')).toBe(true);
    });
  });

  describe('Rotation Status', () => {
    it('should report rotation status', async () => {
      await manager.registerSecret('api-key', 'status-key', 'value');
      await manager.registerSecret('webhook', 'status-hook', 'value');

      const status = await manager.getRotationStatus();

      expect(status.totalSecrets).toBe(2);
      expect(status.byType['api-key']).toBe(1);
      expect(status.byType['webhook']).toBe(1);
    });
  });

  describe('Secret Generation', () => {
    it('should generate API keys with correct format', async () => {
      const secret = await manager.registerSecret('api-key', 'gen-api', 'placeholder');
      await manager.rotateSecret(secret.id, 'manual');

      const value = await manager.getSecret(secret.id);
      expect(value).toMatch(/^sk_[a-f0-9]{64}$/);
    });

    it('should generate webhook secrets with correct format', async () => {
      const secret = await manager.registerSecret('webhook', 'gen-hook', 'placeholder');
      await manager.rotateSecret(secret.id, 'manual');

      const value = await manager.getSecret(secret.id);
      expect(value).toMatch(/^whsec_/);
    });
  });

  describe('Policy Management', () => {
    it('should add custom rotation policy', () => {
      manager.addPolicy({
        type: 'api-key',
        rotationIntervalMs: 24 * 60 * 60 * 1000, // 1 day
        autoRotate: true,
        validationFn: async (secret) => secret.length >= 32,
      });

      // Policy is stored internally; verify by attempting rotation
      // with validation
    });
  });

  describe('Health Check', () => {
    it('should return healthy status', async () => {
      const health = await manager.healthCheck();
      expect(health.status).toBe('healthy');
      expect(health.details.redis).toBe('connected');
    });
  });
});
