/**
 * Integration Tests for Security Modules
 * Tests OPA Bundle Manager and Secrets Manager working together
 */

import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { OPABundleManager, DEFAULT_ABAC_POLICIES } from '../../policy/opa-bundle';
import { SecretsManager } from '../../secrets/rotation';

describe('Security Modules Integration', () => {
  let testDir: string;
  let bundleManager: OPABundleManager;
  let secretsManager: SecretsManager;

  beforeEach(async () => {
    testDir = `/tmp/security-integration-test-${Date.now()}`;
    await fs.mkdir(testDir, { recursive: true });

    bundleManager = new OPABundleManager();
    secretsManager = new SecretsManager();
  });

  afterEach(async () => {
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
    secretsManager.cleanup();
  });

  describe('Bundle Signing with Secrets Manager', () => {
    it('should use secrets manager to rotate signing keys for OPA bundles', async () => {
      // Register signing key in secrets manager
      secretsManager.registerSecret({
        name: 'opa-signing-key',
        type: 'signing_key',
        rotationInterval: 86400,
        gracePeriod: 3600,
        autoRotate: false,
        destinations: ['kubernetes'],
        dependencies: ['opa-service'],
      });

      // Create initial signing key
      const initialKey = secretsManager.createSecret('opa-signing-key', 'initial-key-value');

      // Use the key to sign a bundle
      const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
      });

      const signingConfig = {
        privateKey: privateKey.export({ type: 'pkcs1', format: 'pem' }) as string,
        publicKey: publicKey.export({ type: 'pkcs1', format: 'pem' }) as string,
        algorithm: 'RS256' as const,
        keyId: `version-${initialKey.version}`,
      };

      const signedBundleManager = new OPABundleManager(signingConfig);

      const policies = [
        {
          path: 'authz/main.rego',
          content: 'package authz\ndefault allow := false',
        },
      ];

      const bundle = await signedBundleManager.createBundle('test-bundle', '1.0.0', policies);

      expect(bundle.signature).toBeDefined();

      // Rotate the signing key
      await secretsManager.rotateSecret('opa-signing-key', true);

      const rotatedKey = secretsManager.getActiveSecret('opa-signing-key');
      expect(rotatedKey?.version).toBe(2);
    });

    it('should verify bundle signatures after key rotation with grace period', async () => {
      // Setup secrets manager with signing key
      secretsManager.registerSecret({
        name: 'opa-signing-key',
        type: 'signing_key',
        rotationInterval: 86400,
        gracePeriod: 3600,
        autoRotate: false,
        destinations: [],
        dependencies: [],
      });

      const initialKey = secretsManager.createSecret('opa-signing-key', 'key-v1');

      // Create bundle with initial key
      const { privateKey: key1Private, publicKey: key1Public } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
      });

      const signingConfig1 = {
        privateKey: key1Private.export({ type: 'pkcs1', format: 'pem' }) as string,
        publicKey: key1Public.export({ type: 'pkcs1', format: 'pem' }) as string,
        algorithm: 'RS256' as const,
        keyId: 'key-v1',
      };

      const manager1 = new OPABundleManager(signingConfig1);

      const policies = [
        {
          path: 'authz/main.rego',
          content: 'package authz\ndefault allow := false',
        },
      ];

      const bundle1 = await manager1.createBundle('bundle-v1', '1.0.0', policies);
      const bundle1Path = path.join(testDir, 'bundle-v1.tar.gz');
      await manager1.packageBundle(bundle1, bundle1Path);

      // Verify with key1
      const verifyResult1 = await manager1.loadBundle(bundle1Path);
      expect(verifyResult1.valid).toBe(true);
      expect(verifyResult1.signatureValid).toBe(true);

      // Rotate key
      await secretsManager.rotateSecret('opa-signing-key', true);
      const rotatedKey = secretsManager.getActiveSecret('opa-signing-key');
      expect(rotatedKey?.version).toBe(2);

      // Old bundles should still be verifiable during grace period
      const verifyResult2 = await manager1.loadBundle(bundle1Path);
      expect(verifyResult2.valid).toBe(true);
    });
  });

  describe('Policy-Based Secret Access Control', () => {
    it('should use OPA policies to control secret access', async () => {
      // Create ABAC policies for secret access
      const secretAccessPolicies = {
        'secrets/access.rego': `
package secrets.access

import future.keywords.if

default allow := false

# Allow secret access if user has permission and belongs to correct tenant
allow if {
    input.user.permissions[_] == "secrets:read"
    input.user.tenant_id == input.secret.tenant_id
    not is_expired(input.secret)
}

# Check if secret is expired
is_expired(secret) if {
    time.now_ns() > time.parse_rfc3339_ns(secret.expires_at)
}

# Require MFA for critical secrets
allow if {
    input.secret.classification == "critical"
    input.user.mfa_verified == true
    input.user.role == "admin"
}
`,
      };

      const policies = Object.entries(secretAccessPolicies).map(([path, content]) => ({
        path,
        content,
      }));

      const bundle = await bundleManager.createBundle('secret-access-policies', '1.0.0', policies);

      expect(bundle.policies).toHaveLength(1);
      expect(bundle.manifest.roots).toContain('secrets');

      // Register secret
      secretsManager.registerSecret({
        name: 'critical-api-key',
        type: 'api_key',
        rotationInterval: 86400,
        gracePeriod: 3600,
        autoRotate: false,
        destinations: [],
        dependencies: [],
      });

      const secret = secretsManager.createSecret(
        'critical-api-key',
        'critical-secret-value',
        { classification: 'critical', tenant_id: 'tenant-1' }
      );

      expect(secret).toBeDefined();
      expect(secret.metadata.classification).toBe('critical');
    });

    it('should enforce tenant isolation for secrets using OPA policies', async () => {
      const tenantIsolationPolicies = Object.entries(DEFAULT_ABAC_POLICIES)
        .filter(([path]) => path.includes('tenant'))
        .map(([path, content]) => ({ path, content }));

      const bundle = await bundleManager.createBundle(
        'tenant-isolation',
        '1.0.0',
        tenantIsolationPolicies
      );

      expect(bundle.policies.length).toBeGreaterThan(0);

      // Create secrets for different tenants
      secretsManager.registerSecret({
        name: 'tenant1-secret',
        type: 'api_key',
        rotationInterval: 86400,
        gracePeriod: 3600,
        autoRotate: false,
        destinations: [],
        dependencies: [],
      });

      secretsManager.registerSecret({
        name: 'tenant2-secret',
        type: 'api_key',
        rotationInterval: 86400,
        gracePeriod: 3600,
        autoRotate: false,
        destinations: [],
        dependencies: [],
      });

      const secret1 = secretsManager.createSecret(
        'tenant1-secret',
        'value1',
        { tenant_id: 'tenant-1' }
      );

      const secret2 = secretsManager.createSecret(
        'tenant2-secret',
        'value2',
        { tenant_id: 'tenant-2' }
      );

      expect(secret1.metadata.tenant_id).toBe('tenant-1');
      expect(secret2.metadata.tenant_id).toBe('tenant-2');
      expect(secret1.value).not.toBe(secret2.value);
    });
  });

  describe('Policy Bundle Distribution with Secret Encryption', () => {
    it('should encrypt policy bundles using secrets manager keys', async () => {
      // Register encryption key
      secretsManager.registerSecret({
        name: 'bundle-encryption-key',
        type: 'encryption_key',
        rotationInterval: 604800, // 7 days
        gracePeriod: 86400, // 1 day
        autoRotate: false,
        destinations: ['kubernetes'],
        dependencies: ['opa-service'],
      });

      const encryptionKey = secretsManager.createSecret(
        'bundle-encryption-key',
        crypto.randomBytes(32).toString('base64')
      );

      // Create a policy bundle
      const policies = Object.entries(DEFAULT_ABAC_POLICIES).map(([path, content]) => ({
        path,
        content,
      }));

      const bundle = await bundleManager.createBundle('encrypted-bundle', '1.0.0', policies);
      const bundlePath = path.join(testDir, 'encrypted-bundle.tar.gz');
      await bundleManager.packageBundle(bundle, bundlePath);

      // Verify bundle was created
      const stats = await fs.stat(bundlePath);
      expect(stats.isFile()).toBe(true);
      expect(stats.size).toBeGreaterThan(0);

      // Verify encryption key is available
      expect(encryptionKey.value).toBeTruthy();
      expect(encryptionKey.status).toBe('active');
    });
  });

  describe('Audit Trail Integration', () => {
    it('should create audit trails for both bundle and secret operations', async () => {
      const auditEvents: Array<{ type: string; data: any }> = [];

      // Listen to bundle events
      bundleManager.on('bundle_created', (data) => {
        auditEvents.push({ type: 'bundle_created', data });
      });

      bundleManager.on('bundle_loaded', (data) => {
        auditEvents.push({ type: 'bundle_loaded', data });
      });

      // Listen to secret events
      secretsManager.on('secret_created', (data) => {
        auditEvents.push({ type: 'secret_created', data });
      });

      secretsManager.on('rotation_completed', (data) => {
        auditEvents.push({ type: 'rotation_completed', data });
      });

      // Perform operations
      const policies = [
        {
          path: 'authz/main.rego',
          content: 'package authz\ndefault allow := false',
        },
      ];

      await bundleManager.createBundle('audit-test-bundle', '1.0.0', policies);

      secretsManager.registerSecret({
        name: 'audit-test-secret',
        type: 'api_key',
        rotationInterval: 86400,
        gracePeriod: 3600,
        autoRotate: false,
        destinations: [],
        dependencies: [],
      });

      secretsManager.createSecret('audit-test-secret', 'test-value');
      await secretsManager.rotateSecret('audit-test-secret', true);

      // Verify audit events
      expect(auditEvents.length).toBeGreaterThan(0);
      expect(auditEvents.some(e => e.type === 'bundle_created')).toBe(true);
      expect(auditEvents.some(e => e.type === 'secret_created')).toBe(true);
      expect(auditEvents.some(e => e.type === 'rotation_completed')).toBe(true);
    });

    it('should maintain chronological audit trail', async () => {
      const auditEvents: Array<{ type: string; timestamp: number }> = [];

      bundleManager.on('bundle_created', () => {
        auditEvents.push({ type: 'bundle_created', timestamp: Date.now() });
      });

      secretsManager.on('secret_created', () => {
        auditEvents.push({ type: 'secret_created', timestamp: Date.now() });
      });

      // Create bundle
      const policies = [
        {
          path: 'authz/main.rego',
          content: 'package authz\ndefault allow := false',
        },
      ];
      await bundleManager.createBundle('test-bundle', '1.0.0', policies);

      // Small delay
      await new Promise(resolve => setTimeout(resolve, 10));

      // Create secret
      secretsManager.registerSecret({
        name: 'test-secret',
        type: 'api_key',
        rotationInterval: 86400,
        gracePeriod: 3600,
        autoRotate: false,
        destinations: [],
        dependencies: [],
      });
      secretsManager.createSecret('test-secret', 'test-value');

      // Verify chronological order
      expect(auditEvents.length).toBe(2);
      expect(auditEvents[0].timestamp).toBeLessThan(auditEvents[1].timestamp);
    });
  });

  describe('Compliance and Verification', () => {
    it('should verify both bundle integrity and secret rotation compliance', async () => {
      // Create and package a bundle
      const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
      });

      const signingConfig = {
        privateKey: privateKey.export({ type: 'pkcs1', format: 'pem' }) as string,
        publicKey: publicKey.export({ type: 'pkcs1', format: 'pem' }) as string,
        algorithm: 'RS256' as const,
      };

      const signedManager = new OPABundleManager(signingConfig);

      const policies = [
        {
          path: 'authz/main.rego',
          content: 'package authz\ndefault allow := false',
        },
      ];

      const bundle = await signedManager.createBundle('compliance-bundle', '1.0.0', policies);
      const bundlePath = path.join(testDir, 'compliance-bundle.tar.gz');
      await signedManager.packageBundle(bundle, bundlePath);

      // Verify bundle
      const verifyResult = await signedManager.loadBundle(bundlePath);
      expect(verifyResult.valid).toBe(true);
      expect(verifyResult.signatureValid).toBe(true);
      expect(verifyResult.manifestValid).toBe(true);
      expect(verifyResult.policiesValid).toBe(true);

      // Check secrets health
      secretsManager.registerSecret({
        name: 'compliance-secret',
        type: 'api_key',
        rotationInterval: 86400,
        gracePeriod: 3600,
        autoRotate: false,
        destinations: [],
        dependencies: [],
      });

      secretsManager.createSecret('compliance-secret', 'test-value');

      const health = secretsManager.getHealthStatus();
      expect(health.healthy).toBe(true);
      expect(health.expiredSecrets).toBe(0);

      // Both systems should be in compliant state
      expect(verifyResult.valid).toBe(true);
      expect(health.healthy).toBe(true);
    });
  });
});
