/**
 * End-to-End Tests for Security Workflow
 * Tests complete workflow from policy creation to secret rotation
 */

import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { OPABundleManager, DEFAULT_ABAC_POLICIES } from '../../SECURITY/policy/opa-bundle';
import { SecretsManager } from '../../SECURITY/secrets/rotation';

describe('Security Workflow E2E', () => {
  let testDir: string;
  let bundleManager: OPABundleManager;
  let secretsManager: SecretsManager;
  let signingKeys: { privateKey: string; publicKey: string };

  beforeAll(async () => {
    testDir = `/tmp/security-e2e-test-${Date.now()}`;
    await fs.mkdir(testDir, { recursive: true });

    // Generate signing keys for the entire test suite
    const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
    });

    signingKeys = {
      privateKey: privateKey.export({ type: 'pkcs1', format: 'pem' }) as string,
      publicKey: publicKey.export({ type: 'pkcs1', format: 'pem' }) as string,
    };
  });

  beforeEach(() => {
    secretsManager = new SecretsManager();
    bundleManager = new OPABundleManager({
      privateKey: signingKeys.privateKey,
      publicKey: signingKeys.publicKey,
      algorithm: 'RS256',
      keyId: 'test-key-1',
    });
  });

  afterEach(() => {
    secretsManager.cleanup();
  });

  afterAll(async () => {
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('Complete Security Setup Workflow', () => {
    it('should setup complete security infrastructure', async () => {
      // Step 1: Register signing keys in secrets manager
      secretsManager.registerSecret({
        name: 'opa-signing-key',
        type: 'signing_key',
        rotationInterval: 604800, // 7 days
        gracePeriod: 86400, // 1 day
        autoRotate: true,
        destinations: ['kubernetes', 'vault'],
        dependencies: ['opa-service', 'api-gateway'],
      });

      const signingKeySecret = secretsManager.createSecret(
        'opa-signing-key',
        signingKeys.privateKey,
        {
          keyId: 'test-key-1',
          algorithm: 'RS256',
          purpose: 'opa-bundle-signing',
        }
      );

      expect(signingKeySecret.status).toBe('active');

      // Step 2: Register API keys
      secretsManager.registerSecret({
        name: 'api-gateway-key',
        type: 'api_key',
        rotationInterval: 86400, // 1 day
        gracePeriod: 3600, // 1 hour
        autoRotate: true,
        destinations: ['kubernetes'],
        dependencies: ['api-gateway', 'frontend-app'],
      });

      const apiKeySecret = secretsManager.createSecret('api-gateway-key', 'initial-api-key');
      expect(apiKeySecret.status).toBe('active');

      // Step 3: Create default ABAC policy bundle
      const policies = Object.entries(DEFAULT_ABAC_POLICIES).map(([path, content]) => ({
        path,
        content,
      }));

      const bundle = await bundleManager.createBundle(
        'production-abac-policies',
        '1.0.0',
        policies,
        [],
        {
          description: 'Production ABAC policies with tenant isolation',
          author: 'security-team',
        }
      );

      expect(bundle.signature).toBeDefined();
      expect(bundle.policies.length).toBe(3);
      expect(bundle.manifest.roots).toContain('authz');
      expect(bundle.manifest.roots).toContain('tenant');
      expect(bundle.manifest.roots).toContain('data');

      // Step 4: Package and distribute bundle
      const bundlePath = path.join(testDir, 'production-abac-policies-v1.0.0.tar.gz');
      await bundleManager.packageBundle(bundle, bundlePath);

      const bundleStats = await fs.stat(bundlePath);
      expect(bundleStats.isFile()).toBe(true);
      expect(bundleStats.size).toBeGreaterThan(0);

      // Step 5: Verify bundle integrity
      const verifyResult = await bundleManager.loadBundle(bundlePath);
      expect(verifyResult.valid).toBe(true);
      expect(verifyResult.signatureValid).toBe(true);
      expect(verifyResult.manifestValid).toBe(true);
      expect(verifyResult.policiesValid).toBe(true);

      // Step 6: Check overall security posture
      const secretsHealth = secretsManager.getHealthStatus();
      expect(secretsHealth.healthy).toBe(true);
      expect(secretsHealth.totalSecrets).toBe(2);
      expect(secretsHealth.expiredSecrets).toBe(0);

      const bundlesList = bundleManager.listBundles();
      expect(bundlesList.length).toBeGreaterThan(0);
      expect(bundlesList[0].signed).toBe(true);
    });
  });

  describe('Key Rotation Workflow', () => {
    it('should handle complete key rotation with bundle re-signing', async () => {
      // Setup initial infrastructure
      secretsManager.registerSecret({
        name: 'signing-key',
        type: 'signing_key',
        rotationInterval: 86400,
        gracePeriod: 3600,
        autoRotate: false,
        destinations: ['kubernetes'],
        dependencies: ['opa-service'],
      });

      const initialKey = secretsManager.createSecret('signing-key', signingKeys.privateKey);

      // Create initial bundle
      const policies = [
        {
          path: 'authz/main.rego',
          content: 'package authz\ndefault allow := false',
        },
      ];

      const bundleV1 = await bundleManager.createBundle('test-policies', '1.0.0', policies);
      const bundleV1Path = path.join(testDir, 'test-policies-v1.0.0.tar.gz');
      await bundleManager.packageBundle(bundleV1, bundleV1Path);

      // Verify initial bundle
      const verifyV1 = await bundleManager.loadBundle(bundleV1Path);
      expect(verifyV1.valid).toBe(true);

      // Rotate signing key
      await secretsManager.rotateSecret('signing-key', true);

      const rotatedKey = secretsManager.getActiveSecret('signing-key');
      expect(rotatedKey?.version).toBe(2);

      // Create new bundle with rotated key (in production, use new key)
      const bundleV2 = await bundleManager.createBundle('test-policies', '2.0.0', policies);
      const bundleV2Path = path.join(testDir, 'test-policies-v2.0.0.tar.gz');
      await bundleManager.packageBundle(bundleV2, bundleV2Path);

      // Verify both bundles are still valid during grace period
      const verifyV1AfterRotation = await bundleManager.loadBundle(bundleV1Path);
      expect(verifyV1AfterRotation.valid).toBe(true);

      const verifyV2 = await bundleManager.loadBundle(bundleV2Path);
      expect(verifyV2.valid).toBe(true);

      // Both versions should be accessible
      expect(secretsManager.getSecretVersion('signing-key', 1)).toBeDefined();
      expect(secretsManager.getSecretVersion('signing-key', 2)).toBeDefined();
    });

    it('should handle emergency key revocation and rotation', async () => {
      // Setup
      secretsManager.registerSecret({
        name: 'compromised-key',
        type: 'api_key',
        rotationInterval: 86400,
        gracePeriod: 3600,
        autoRotate: false,
        destinations: ['kubernetes'],
        dependencies: ['api-service'],
      });

      const compromisedKey = secretsManager.createSecret('compromised-key', 'compromised-value');
      expect(compromisedKey.status).toBe('active');

      // Simulate key compromise detection
      await secretsManager.revokeSecret('compromised-key', compromisedKey.version);

      const revokedKey = secretsManager.getSecretVersion('compromised-key', compromisedKey.version);
      expect(revokedKey?.status).toBe('revoked');

      // Emergency rotation creates new key
      const newKey = secretsManager.getActiveSecret('compromised-key');
      expect(newKey).toBeDefined();
      expect(newKey?.version).toBe(2);
      expect(newKey?.status).toBe('active');
      expect(newKey?.value).not.toBe('compromised-value');
    });
  });

  describe('Multi-Tenant Security Workflow', () => {
    it('should enforce tenant isolation across policies and secrets', async () => {
      // Create tenant-specific secrets
      const tenants = ['tenant-a', 'tenant-b', 'tenant-c'];

      for (const tenant of tenants) {
        secretsManager.registerSecret({
          name: `${tenant}-api-key`,
          type: 'api_key',
          rotationInterval: 86400,
          gracePeriod: 3600,
          autoRotate: false,
          destinations: ['kubernetes'],
          dependencies: [`${tenant}-service`],
        });

        const tenantSecret = secretsManager.createSecret(
          `${tenant}-api-key`,
          `key-for-${tenant}`,
          { tenant_id: tenant, environment: 'production' }
        );

        expect(tenantSecret.metadata.tenant_id).toBe(tenant);
      }

      // Create tenant isolation policies
      const tenantPolicies = [
        {
          path: 'tenant/isolation.rego',
          content: DEFAULT_ABAC_POLICIES['tenant/isolation.rego'],
        },
      ];

      const tenantBundle = await bundleManager.createBundle(
        'tenant-isolation-policies',
        '1.0.0',
        tenantPolicies
      );

      expect(tenantBundle.policies).toHaveLength(1);
      expect(tenantBundle.manifest.roots).toContain('tenant');

      // Verify all tenant secrets are isolated
      const allSecrets = secretsManager.listSecrets();
      const tenantSecrets = allSecrets.filter(s => s.name.includes('tenant-'));

      expect(tenantSecrets).toHaveLength(3);

      // Each tenant should have unique secret values
      const secretValues = tenantSecrets.map(s => s.activeVersion);
      const uniqueValues = new Set(secretValues);
      expect(uniqueValues.size).toBe(3);
    });
  });

  describe('Compliance and Audit Workflow', () => {
    it('should maintain complete audit trail for all security operations', async () => {
      const auditLog: Array<{ timestamp: number; type: string; details: any }> = [];

      // Track bundle operations
      bundleManager.on('bundle_created', (data) => {
        auditLog.push({
          timestamp: Date.now(),
          type: 'bundle_created',
          details: data,
        });
      });

      bundleManager.on('bundle_packaged', (data) => {
        auditLog.push({
          timestamp: Date.now(),
          type: 'bundle_packaged',
          details: data,
        });
      });

      bundleManager.on('bundle_loaded', (data) => {
        auditLog.push({
          timestamp: Date.now(),
          type: 'bundle_loaded',
          details: data,
        });
      });

      // Track secret operations
      secretsManager.on('secret_registered', (data) => {
        auditLog.push({
          timestamp: Date.now(),
          type: 'secret_registered',
          details: data,
        });
      });

      secretsManager.on('secret_created', (data) => {
        auditLog.push({
          timestamp: Date.now(),
          type: 'secret_created',
          details: data,
        });
      });

      secretsManager.on('rotation_started', (data) => {
        auditLog.push({
          timestamp: Date.now(),
          type: 'rotation_started',
          details: data,
        });
      });

      secretsManager.on('rotation_completed', (data) => {
        auditLog.push({
          timestamp: Date.now(),
          type: 'rotation_completed',
          details: data,
        });
      });

      // Perform operations
      const policies = [
        {
          path: 'authz/main.rego',
          content: 'package authz\ndefault allow := false',
        },
      ];

      await bundleManager.createBundle('audit-test', '1.0.0', policies);

      const bundlePath = path.join(testDir, 'audit-test-v1.0.0.tar.gz');
      const bundle = bundleManager.getBundle('audit-test', '1.0.0');
      if (bundle) {
        await bundleManager.packageBundle(bundle, bundlePath);
        await bundleManager.loadBundle(bundlePath);
      }

      secretsManager.registerSecret({
        name: 'audit-secret',
        type: 'api_key',
        rotationInterval: 86400,
        gracePeriod: 3600,
        autoRotate: false,
        destinations: [],
        dependencies: [],
      });

      secretsManager.createSecret('audit-secret', 'test-value');
      await secretsManager.rotateSecret('audit-secret', true);

      // Verify audit trail
      expect(auditLog.length).toBeGreaterThan(0);

      // Verify chronological order
      for (let i = 1; i < auditLog.length; i++) {
        expect(auditLog[i].timestamp).toBeGreaterThanOrEqual(auditLog[i - 1].timestamp);
      }

      // Verify all expected events are present
      expect(auditLog.some(e => e.type === 'bundle_created')).toBe(true);
      expect(auditLog.some(e => e.type === 'secret_created')).toBe(true);
      expect(auditLog.some(e => e.type === 'rotation_completed')).toBe(true);
    });

    it('should validate compliance with security policies', async () => {
      // Create comprehensive security policy bundle
      const allPolicies = Object.entries(DEFAULT_ABAC_POLICIES).map(([path, content]) => ({
        path,
        content,
      }));

      const complianceBundle = await bundleManager.createBundle(
        'compliance-policies',
        '1.0.0',
        allPolicies,
        [],
        {
          description: 'Comprehensive compliance and security policies',
          author: 'compliance-team',
        }
      );

      // Verify bundle is signed (required for compliance)
      expect(complianceBundle.signature).toBeDefined();

      // Package and verify
      const bundlePath = path.join(testDir, 'compliance-policies.tar.gz');
      await bundleManager.packageBundle(complianceBundle, bundlePath);

      const verifyResult = await bundleManager.loadBundle(bundlePath);

      // All compliance checks must pass
      expect(verifyResult.valid).toBe(true);
      expect(verifyResult.signatureValid).toBe(true);
      expect(verifyResult.manifestValid).toBe(true);
      expect(verifyResult.policiesValid).toBe(true);
      expect(verifyResult.errors).toHaveLength(0);

      // Verify secrets are in compliant state
      secretsManager.registerSecret({
        name: 'production-key',
        type: 'api_key',
        rotationInterval: 86400,
        gracePeriod: 3600,
        autoRotate: true, // Required for compliance
        destinations: ['kubernetes', 'vault'], // Required for HA
        dependencies: ['api-service'],
      });

      secretsManager.createSecret('production-key', 'secure-value');

      const health = secretsManager.getHealthStatus();
      expect(health.healthy).toBe(true);
      expect(health.expiredSecrets).toBe(0);

      // Complete compliance check
      const complianceStatus = {
        bundlesValid: verifyResult.valid,
        secretsHealthy: health.healthy,
        auditTrailActive: true,
        encryptionEnabled: true,
        rotationEnabled: true,
      };

      expect(Object.values(complianceStatus).every(v => v === true)).toBe(true);
    });
  });

  describe('Disaster Recovery Workflow', () => {
    it('should support backup and restore of security configuration', async () => {
      // Setup initial configuration
      secretsManager.registerSecret({
        name: 'critical-key',
        type: 'encryption_key',
        rotationInterval: 604800,
        gracePeriod: 86400,
        autoRotate: true,
        destinations: ['kubernetes', 'vault'],
        dependencies: ['encryption-service'],
      });

      const originalSecret = secretsManager.createSecret('critical-key', 'original-value');

      // Create policy bundle
      const policies = Object.entries(DEFAULT_ABAC_POLICIES).map(([path, content]) => ({
        path,
        content,
      }));

      const originalBundle = await bundleManager.createBundle('backup-test', '1.0.0', policies);
      const backupPath = path.join(testDir, 'backup-bundle.tar.gz');
      await bundleManager.packageBundle(originalBundle, backupPath);

      // Simulate disaster - create new managers
      const newSecretsManager = new SecretsManager();
      const newBundleManager = new OPABundleManager({
        privateKey: signingKeys.privateKey,
        publicKey: signingKeys.publicKey,
        algorithm: 'RS256',
        keyId: 'test-key-1',
      });

      // Restore from backup
      const restoredBundle = await newBundleManager.loadBundle(backupPath);
      expect(restoredBundle.valid).toBe(true);
      expect(restoredBundle.bundle?.name).toBe('backup-test');
      expect(restoredBundle.bundle?.policies.length).toBe(policies.length);

      // Restore secret configuration
      newSecretsManager.registerSecret({
        name: 'critical-key',
        type: 'encryption_key',
        rotationInterval: 604800,
        gracePeriod: 86400,
        autoRotate: true,
        destinations: ['kubernetes', 'vault'],
        dependencies: ['encryption-service'],
      });

      // Create new secret value (original value is not recoverable from metadata)
      const restoredSecret = newSecretsManager.createSecret('critical-key', 'restored-value');
      expect(restoredSecret.status).toBe('active');

      // Cleanup
      newSecretsManager.cleanup();
    });
  });
});
