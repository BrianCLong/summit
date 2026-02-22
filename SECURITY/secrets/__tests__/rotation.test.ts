/**
 * Comprehensive Unit Tests for Secrets Manager
 * Tests secret registration, creation, rotation, revocation, and rollback
 */

import { SecretsManager } from '../rotation';

describe('SecretsManager', () => {
  let manager: SecretsManager;

  beforeEach(() => {
    manager = new SecretsManager();
  });

  afterEach(() => {
    manager.cleanup();
  });

  describe('Secret Registration', () => {
    it('should register a new secret configuration', () => {
      const config = {
        name: 'api-key',
        type: 'api_key' as const,
        rotationInterval: 86400, // 1 day
        gracePeriod: 3600, // 1 hour
        autoRotate: false,
        destinations: ['kubernetes'],
        dependencies: ['api-service'],
      };

      manager.registerSecret(config);
      const secrets = manager.listSecrets();

      expect(secrets).toHaveLength(1);
      expect(secrets[0].name).toBe('api-key');
    });

    it('should emit secret_registered event', (done) => {
      manager.on('secret_registered', (event) => {
        expect(event.name).toBe('test-secret');
        expect(event.config).toBeDefined();
        done();
      });

      manager.registerSecret({
        name: 'test-secret',
        type: 'password',
        rotationInterval: 86400,
        gracePeriod: 3600,
        autoRotate: false,
        destinations: [],
        dependencies: [],
      });
    });

    it('should handle multiple secret registrations', () => {
      const configs = [
        {
          name: 'api-key-1',
          type: 'api_key' as const,
          rotationInterval: 86400,
          gracePeriod: 3600,
          autoRotate: false,
          destinations: [],
          dependencies: [],
        },
        {
          name: 'db-password',
          type: 'password' as const,
          rotationInterval: 604800, // 7 days
          gracePeriod: 7200,
          autoRotate: true,
          destinations: ['vault'],
          dependencies: ['database-service'],
        },
      ];

      configs.forEach(config => manager.registerSecret(config));
      const secrets = manager.listSecrets();

      expect(secrets).toHaveLength(2);
    });
  });

  describe('Secret Creation', () => {
    beforeEach(() => {
      manager.registerSecret({
        name: 'test-secret',
        type: 'api_key',
        rotationInterval: 86400,
        gracePeriod: 3600,
        autoRotate: false,
        destinations: [],
        dependencies: [],
      });
    });

    it('should create a secret with specified value', () => {
      const secret = manager.createSecret('test-secret', 'my-secret-value');

      expect(secret).toBeDefined();
      expect(secret.version).toBe(1);
      expect(secret.value).toBe('my-secret-value');
      expect(secret.status).toBe('active');
      expect(secret.createdAt).toBeInstanceOf(Date);
      expect(secret.expiresAt).toBeInstanceOf(Date);
    });

    it('should create secret with metadata', () => {
      const metadata = { environment: 'production', owner: 'platform-team' };
      const secret = manager.createSecret('test-secret', 'my-secret-value', metadata);

      expect(secret.metadata).toEqual(metadata);
    });

    it('should throw error when creating secret for unregistered name', () => {
      expect(() => {
        manager.createSecret('unregistered-secret', 'value');
      }).toThrow('Secret unregistered-secret not registered');
    });

    it('should emit secret_created event', (done) => {
      manager.on('secret_created', (event) => {
        expect(event.secretName).toBe('test-secret');
        expect(event.version).toBe(1);
        done();
      });

      manager.createSecret('test-secret', 'test-value');
    });

    it('should calculate correct expiration time', () => {
      const beforeCreate = Date.now();
      const secret = manager.createSecret('test-secret', 'test-value');
      const afterCreate = Date.now();

      const expectedExpiry = beforeCreate + 86400 * 1000;
      const actualExpiry = secret.expiresAt.getTime();

      expect(actualExpiry).toBeGreaterThanOrEqual(expectedExpiry);
      expect(actualExpiry).toBeLessThanOrEqual(afterCreate + 86400 * 1000);
    });
  });

  describe('Secret Rotation', () => {
    beforeEach(() => {
      manager.registerSecret({
        name: 'test-secret',
        type: 'api_key',
        rotationInterval: 86400,
        gracePeriod: 3600,
        autoRotate: false,
        destinations: [],
        dependencies: [],
      });
    });

    it('should rotate an active secret', async () => {
      const originalSecret = manager.createSecret('test-secret', 'original-value');

      // Force rotation by setting expiration to past
      originalSecret.expiresAt = new Date(Date.now() - 1000);

      const result = await manager.rotateSecret('test-secret', true);

      expect(result.success).toBe(true);
      expect(result.newVersion).toBe(2);
      expect(result.oldVersion).toBe(1);

      const activeSecret = manager.getActiveSecret('test-secret');
      expect(activeSecret?.version).toBe(2);
      expect(activeSecret?.value).not.toBe('original-value');
    });

    it('should not rotate if secret not expired and force is false', async () => {
      manager.createSecret('test-secret', 'current-value');

      const result = await manager.rotateSecret('test-secret', false);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Rotation not needed - secret not expired');
    });

    it('should emit rotation_started and rotation_completed events', async () => {
      const startedSpy = jest.fn();
      const completedSpy = jest.fn();

      manager.on('rotation_started', startedSpy);
      manager.on('rotation_completed', completedSpy);

      manager.createSecret('test-secret', 'original-value');
      await manager.rotateSecret('test-secret', true);

      expect(startedSpy).toHaveBeenCalled();
      expect(completedSpy).toHaveBeenCalled();
    });

    it('should set old version to deprecated after rotation', async () => {
      manager.createSecret('test-secret', 'original-value');
      await manager.rotateSecret('test-secret', true);

      const oldVersion = manager.getSecretVersion('test-secret', 1);
      expect(oldVersion?.status).toBe('deprecated');
    });

    it('should generate different secret values on rotation', async () => {
      manager.createSecret('test-secret', 'original-value');
      await manager.rotateSecret('test-secret', true);

      const version1 = manager.getSecretVersion('test-secret', 1);
      const version2 = manager.getSecretVersion('test-secret', 2);

      expect(version1?.value).not.toBe(version2?.value);
    });

    it('should throw error when rotating non-existent secret', async () => {
      await expect(manager.rotateSecret('non-existent', true)).rejects.toThrow('Secret non-existent not registered');
    });

    it('should throw error when rotating secret with no active version', async () => {
      manager.registerSecret({
        name: 'empty-secret',
        type: 'api_key',
        rotationInterval: 86400,
        gracePeriod: 3600,
        autoRotate: false,
        destinations: [],
        dependencies: [],
      });

      await expect(manager.rotateSecret('empty-secret', true)).rejects.toThrow('No active version found');
    });
  });

  describe('Secret Generation', () => {
    it('should generate API key with correct prefix', async () => {
      manager.registerSecret({
        name: 'api-key',
        type: 'api_key',
        rotationInterval: 86400,
        gracePeriod: 3600,
        autoRotate: false,
        destinations: [],
        dependencies: [],
      });

      manager.createSecret('api-key', 'temp');
      await manager.rotateSecret('api-key', true);

      const activeSecret = manager.getActiveSecret('api-key');
      expect(activeSecret?.value).toMatch(/^ak_[a-f0-9]{64}$/);
    });

    it('should generate password with correct length and characters', async () => {
      manager.registerSecret({
        name: 'password',
        type: 'password',
        rotationInterval: 86400,
        gracePeriod: 3600,
        autoRotate: false,
        destinations: [],
        dependencies: [],
      });

      manager.createSecret('password', 'temp');
      await manager.rotateSecret('password', true);

      const activeSecret = manager.getActiveSecret('password');
      expect(activeSecret?.value).toHaveLength(32);
      expect(activeSecret?.value).toMatch(/^[A-Za-z0-9!@#$%^&*]+$/);
    });

    it('should generate encryption key in base64', async () => {
      manager.registerSecret({
        name: 'encryption-key',
        type: 'encryption_key',
        rotationInterval: 86400,
        gracePeriod: 3600,
        autoRotate: false,
        destinations: [],
        dependencies: [],
      });

      manager.createSecret('encryption-key', 'temp');
      await manager.rotateSecret('encryption-key', true);

      const activeSecret = manager.getActiveSecret('encryption-key');
      expect(activeSecret?.value).toMatch(/^[A-Za-z0-9+/]+=*$/);
    });

    it('should generate certificate', async () => {
      manager.registerSecret({
        name: 'certificate',
        type: 'certificate',
        rotationInterval: 86400,
        gracePeriod: 3600,
        autoRotate: false,
        destinations: [],
        dependencies: [],
      });

      manager.createSecret('certificate', 'temp');
      await manager.rotateSecret('certificate', true);

      const activeSecret = manager.getActiveSecret('certificate');
      expect(activeSecret?.value).toContain('-----BEGIN CERTIFICATE-----');
      expect(activeSecret?.value).toContain('-----END CERTIFICATE-----');
    });
  });

  describe('Secret Revocation', () => {
    beforeEach(() => {
      manager.registerSecret({
        name: 'test-secret',
        type: 'api_key',
        rotationInterval: 86400,
        gracePeriod: 3600,
        autoRotate: false,
        destinations: [],
        dependencies: [],
      });
    });

    it('should revoke active secret version', async () => {
      const secret = manager.createSecret('test-secret', 'test-value');

      await manager.revokeSecret('test-secret', secret.version);

      const revokedSecret = manager.getSecretVersion('test-secret', secret.version);
      expect(revokedSecret?.status).toBe('revoked');
    });

    it('should revoke all active versions when no version specified', async () => {
      manager.createSecret('test-secret', 'test-value-1');
      await manager.rotateSecret('test-secret', true);

      await manager.revokeSecret('test-secret');

      const version1 = manager.getSecretVersion('test-secret', 1);
      const version2 = manager.getSecretVersion('test-secret', 2);

      expect(version1?.status).toBe('revoked');
      expect(version2?.status).toBe('revoked');
    });

    it('should emit secret_revoked event', async () => {
      const eventSpy = jest.fn();
      manager.on('secret_revoked', eventSpy);

      const secret = manager.createSecret('test-secret', 'test-value');
      await manager.revokeSecret('test-secret', secret.version);

      expect(eventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          secretName: 'test-secret',
          revokedVersions: [secret.version],
        })
      );
    });

    it('should force rotation after revoking all active versions', async () => {
      manager.createSecret('test-secret', 'test-value');
      await manager.revokeSecret('test-secret');

      // Should have created a new version
      const activeSecret = manager.getActiveSecret('test-secret');
      expect(activeSecret).toBeDefined();
      expect(activeSecret?.status).toBe('active');
      expect(activeSecret?.version).toBe(2);
    });
  });

  describe('Secret Rollback', () => {
    beforeEach(() => {
      manager.registerSecret({
        name: 'test-secret',
        type: 'api_key',
        rotationInterval: 86400,
        gracePeriod: 3600,
        autoRotate: false,
        destinations: [],
        dependencies: [],
      });
    });

    it('should rollback to previous version', async () => {
      manager.createSecret('test-secret', 'version-1');
      await manager.rotateSecret('test-secret', true);

      const rollbackResult = await manager.rollbackSecret('test-secret');

      expect(rollbackResult.success).toBe(true);
      expect(rollbackResult.newVersion).toBe(1);

      const activeSecret = manager.getActiveSecret('test-secret');
      expect(activeSecret?.version).toBe(1);
      expect(activeSecret?.value).toBe('version-1');
    });

    it('should mark current version as revoked after rollback', async () => {
      manager.createSecret('test-secret', 'version-1');
      await manager.rotateSecret('test-secret', true);
      await manager.rollbackSecret('test-secret');

      const version2 = manager.getSecretVersion('test-secret', 2);
      expect(version2?.status).toBe('revoked');
    });

    it('should throw error when no previous version available', async () => {
      manager.createSecret('test-secret', 'version-1');

      await expect(manager.rollbackSecret('test-secret')).rejects.toThrow('No previous version available');
    });

    it('should emit rollback_completed event', async () => {
      const eventSpy = jest.fn();
      manager.on('rollback_completed', eventSpy);

      manager.createSecret('test-secret', 'version-1');
      await manager.rotateSecret('test-secret', true);
      await manager.rollbackSecret('test-secret');

      expect(eventSpy).toHaveBeenCalled();
    });
  });

  describe('Secret Retrieval', () => {
    beforeEach(() => {
      manager.registerSecret({
        name: 'test-secret',
        type: 'api_key',
        rotationInterval: 86400,
        gracePeriod: 3600,
        autoRotate: false,
        destinations: [],
        dependencies: [],
      });
    });

    it('should get active secret', () => {
      const created = manager.createSecret('test-secret', 'test-value');
      const active = manager.getActiveSecret('test-secret');

      expect(active).toBeDefined();
      expect(active?.version).toBe(created.version);
      expect(active?.value).toBe('test-value');
    });

    it('should return null for non-existent secret', () => {
      const active = manager.getActiveSecret('non-existent');
      expect(active).toBeNull();
    });

    it('should get secret by specific version', () => {
      manager.createSecret('test-secret', 'version-1');
      const version1 = manager.getSecretVersion('test-secret', 1);

      expect(version1).toBeDefined();
      expect(version1?.version).toBe(1);
      expect(version1?.value).toBe('version-1');
    });

    it('should return null for non-existent version', () => {
      manager.createSecret('test-secret', 'test-value');
      const version = manager.getSecretVersion('test-secret', 999);

      expect(version).toBeNull();
    });
  });

  describe('Secret Listing and Status', () => {
    it('should list all registered secrets', () => {
      manager.registerSecret({
        name: 'secret-1',
        type: 'api_key',
        rotationInterval: 86400,
        gracePeriod: 3600,
        autoRotate: false,
        destinations: [],
        dependencies: [],
      });

      manager.registerSecret({
        name: 'secret-2',
        type: 'password',
        rotationInterval: 604800,
        gracePeriod: 7200,
        autoRotate: true,
        destinations: [],
        dependencies: [],
      });

      const secrets = manager.listSecrets();

      expect(secrets).toHaveLength(2);
      expect(secrets[0].config).toBeDefined();
      expect(secrets[0].status).toBeDefined();
    });

    it('should report healthy status for unexpired secrets', () => {
      manager.registerSecret({
        name: 'healthy-secret',
        type: 'api_key',
        rotationInterval: 86400,
        gracePeriod: 3600,
        autoRotate: false,
        destinations: [],
        dependencies: [],
      });

      manager.createSecret('healthy-secret', 'test-value');
      const secrets = manager.listSecrets();

      expect(secrets[0].status).toBe('healthy');
    });

    it('should report expired status for expired secrets', () => {
      manager.registerSecret({
        name: 'expired-secret',
        type: 'api_key',
        rotationInterval: 86400,
        gracePeriod: 3600,
        autoRotate: false,
        destinations: [],
        dependencies: [],
      });

      const secret = manager.createSecret('expired-secret', 'test-value');
      secret.expiresAt = new Date(Date.now() - 1000);

      const secrets = manager.listSecrets();
      expect(secrets[0].status).toBe('expired');
    });

    it('should report error status when no active version exists', () => {
      manager.registerSecret({
        name: 'error-secret',
        type: 'api_key',
        rotationInterval: 86400,
        gracePeriod: 3600,
        autoRotate: false,
        destinations: [],
        dependencies: [],
      });

      const secrets = manager.listSecrets();
      expect(secrets[0].status).toBe('error');
    });
  });

  describe('Health Status', () => {
    it('should return healthy status when no expired secrets', () => {
      manager.registerSecret({
        name: 'test-secret',
        type: 'api_key',
        rotationInterval: 86400,
        gracePeriod: 3600,
        autoRotate: false,
        destinations: [],
        dependencies: [],
      });

      manager.createSecret('test-secret', 'test-value');
      const health = manager.getHealthStatus();

      expect(health.healthy).toBe(true);
      expect(health.expiredSecrets).toBe(0);
    });

    it('should return unhealthy status when expired secrets exist', () => {
      manager.registerSecret({
        name: 'expired-secret',
        type: 'api_key',
        rotationInterval: 86400,
        gracePeriod: 3600,
        autoRotate: false,
        destinations: [],
        dependencies: [],
      });

      const secret = manager.createSecret('expired-secret', 'test-value');
      secret.expiresAt = new Date(Date.now() - 1000);

      const health = manager.getHealthStatus();

      expect(health.healthy).toBe(false);
      expect(health.expiredSecrets).toBeGreaterThan(0);
    });

    it('should count total secrets correctly', () => {
      for (let i = 1; i <= 3; i++) {
        manager.registerSecret({
          name: `secret-${i}`,
          type: 'api_key',
          rotationInterval: 86400,
          gracePeriod: 3600,
          autoRotate: false,
          destinations: [],
          dependencies: [],
        });
        manager.createSecret(`secret-${i}`, `value-${i}`);
      }

      const health = manager.getHealthStatus();
      expect(health.totalSecrets).toBe(3);
    });
  });

  describe('Cleanup', () => {
    it('should cleanup all resources', () => {
      manager.registerSecret({
        name: 'test-secret',
        type: 'api_key',
        rotationInterval: 86400,
        gracePeriod: 3600,
        autoRotate: true,
        destinations: [],
        dependencies: [],
      });

      manager.cleanup();

      // After cleanup, rotation schedules should be cleared
      expect(() => manager.cleanup()).not.toThrow();
    });
  });
});
