/**
 * Comprehensive Unit Tests for OPA Bundle Manager
 * Tests bundle creation, packaging, signing, verification, and loading
 */

import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { OPABundleManager, DEFAULT_ABAC_POLICIES } from '../opa-bundle';

describe('OPABundleManager', () => {
  let manager: OPABundleManager;
  let testDir: string;

  beforeEach(() => {
    testDir = `/tmp/opa-bundle-test-${Date.now()}`;
    manager = new OPABundleManager();
  });

  afterEach(async () => {
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('Bundle Creation', () => {
    it('should create a basic bundle with policies', async () => {
      const policies = [
        {
          path: 'authz/main.rego',
          content: 'package authz\ndefault allow := false\nallow { true }',
        },
      ];

      const bundle = await manager.createBundle('test-bundle', '1.0.0', policies);

      expect(bundle).toBeDefined();
      expect(bundle.name).toBe('test-bundle');
      expect(bundle.version).toBe('1.0.0');
      expect(bundle.policies).toHaveLength(1);
      expect(bundle.policies[0].path).toBe('authz/main.rego');
      expect(bundle.policies[0].hash).toBeTruthy();
      expect(bundle.manifest).toBeDefined();
      expect(bundle.manifest.policies).toHaveLength(1);
    });

    it('should create a bundle with policies and data files', async () => {
      const policies = [
        {
          path: 'authz/main.rego',
          content: 'package authz\ndefault allow := false',
        },
      ];

      const data = [
        {
          path: 'data/users.json',
          content: { users: [{ id: '1', name: 'test' }] },
        },
      ];

      const bundle = await manager.createBundle('test-bundle', '1.0.0', policies, data);

      expect(bundle.policies).toHaveLength(1);
      expect(bundle.data).toHaveLength(1);
      expect(bundle.data[0].path).toBe('data/users.json');
      expect(bundle.data[0].content).toEqual({ users: [{ id: '1', name: 'test' }] });
    });

    it('should generate manifest with correct metadata', async () => {
      const policies = [
        {
          path: 'authz/main.rego',
          content: 'package authz\ndefault allow := false',
        },
      ];

      const metadata = {
        description: 'Test bundle for authorization',
        author: 'test-user',
      };

      const bundle = await manager.createBundle('test-bundle', '1.0.0', policies, [], metadata);

      expect(bundle.manifest.metadata.name).toBe('test-bundle');
      expect(bundle.manifest.metadata.description).toBe('Test bundle for authorization');
      expect(bundle.manifest.metadata.author).toBe('test-user');
      expect(bundle.manifest.metadata.created).toBeTruthy();
      expect(bundle.manifest.version).toBe('1.0.0');
    });

    it('should calculate correct hashes for policies', async () => {
      const policyContent = 'package authz\ndefault allow := false';
      const policies = [
        {
          path: 'authz/main.rego',
          content: policyContent,
        },
      ];

      const bundle = await manager.createBundle('test-bundle', '1.0.0', policies);

      const expectedHash = crypto.createHash('sha256').update(policyContent).digest('hex');
      expect(bundle.policies[0].hash).toBe(expectedHash);
      expect(bundle.manifest.policies[0].hash).toBe(expectedHash);
    });

    it('should extract roots from policy packages', async () => {
      const policies = [
        {
          path: 'authz/main.rego',
          content: 'package authz.rules\ndefault allow := false',
        },
        {
          path: 'data/permissions.rego',
          content: 'package data.permissions\npermissions := {}',
        },
      ];

      const bundle = await manager.createBundle('test-bundle', '1.0.0', policies);

      expect(bundle.manifest.roots).toContain('authz');
      expect(bundle.manifest.roots).toContain('data');
      expect(bundle.manifest.roots).toHaveLength(2);
    });

    it('should identify entrypoints correctly', async () => {
      const policies = [
        {
          path: 'main.rego',
          content: 'package main\ndefault allow := false',
        },
        {
          path: 'authz/rules.rego',
          content: 'package authz.rules\nallow := true',
        },
      ];

      const bundle = await manager.createBundle('test-bundle', '1.0.0', policies);

      const mainPolicy = bundle.manifest.policies.find(p => p.path === 'main.rego');
      const rulesPolicy = bundle.manifest.policies.find(p => p.path === 'authz/rules.rego');

      expect(mainPolicy?.entrypoint).toBe('main.rego');
      expect(rulesPolicy?.entrypoint).toBeUndefined();
    });

    it('should reject policies without package declaration', async () => {
      const policies = [
        {
          path: 'invalid.rego',
          content: 'default allow := false', // Missing package declaration
        },
      ];

      await expect(manager.createBundle('test-bundle', '1.0.0', policies)).rejects.toThrow('missing package declaration');
    });

    it('should reject policies with undefined_rule', async () => {
      const policies = [
        {
          path: 'invalid.rego',
          content: 'package authz\nundefined_rule { true }',
        },
      ];

      await expect(manager.createBundle('test-bundle', '1.0.0', policies)).rejects.toThrow('contains undefined rule');
    });
  });

  describe('Bundle Signing', () => {
    it('should sign bundle when signing config is provided', async () => {
      const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
      });

      const signingConfig = {
        privateKey: privateKey.export({ type: 'pkcs1', format: 'pem' }) as string,
        publicKey: publicKey.export({ type: 'pkcs1', format: 'pem' }) as string,
        algorithm: 'RS256' as const,
        keyId: 'test-key-1',
      };

      const managerWithSigning = new OPABundleManager(signingConfig);

      const policies = [
        {
          path: 'authz/main.rego',
          content: 'package authz\ndefault allow := false',
        },
      ];

      const bundle = await managerWithSigning.createBundle('signed-bundle', '1.0.0', policies);

      expect(bundle.signature).toBeDefined();
      expect(bundle.signature).toBeTruthy();
      expect(typeof bundle.signature).toBe('string');
    });

    it('should not sign bundle when no signing config is provided', async () => {
      const policies = [
        {
          path: 'authz/main.rego',
          content: 'package authz\ndefault allow := false',
        },
      ];

      const bundle = await manager.createBundle('unsigned-bundle', '1.0.0', policies);

      expect(bundle.signature).toBeUndefined();
    });

    it('should emit bundle_created event', async () => {
      const eventSpy = jest.fn();
      manager.on('bundle_created', eventSpy);

      const policies = [
        {
          path: 'authz/main.rego',
          content: 'package authz\ndefault allow := false',
        },
      ];

      await manager.createBundle('test-bundle', '1.0.0', policies);

      expect(eventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'test-bundle',
          version: '1.0.0',
          policiesCount: 1,
          dataFilesCount: 0,
          signed: false,
        })
      );
    });
  });

  describe('Bundle Packaging', () => {
    it('should package bundle as tar.gz file', async () => {
      const policies = [
        {
          path: 'authz/main.rego',
          content: 'package authz\ndefault allow := false',
        },
      ];

      const bundle = await manager.createBundle('test-bundle', '1.0.0', policies);
      const outputPath = path.join(testDir, 'bundle.tar.gz');

      await fs.mkdir(testDir, { recursive: true });
      await manager.packageBundle(bundle, outputPath);

      const stats = await fs.stat(outputPath);
      expect(stats.isFile()).toBe(true);
      expect(stats.size).toBeGreaterThan(0);
    });

    it('should emit bundle_packaged event', async () => {
      const eventSpy = jest.fn();
      manager.on('bundle_packaged', eventSpy);

      const policies = [
        {
          path: 'authz/main.rego',
          content: 'package authz\ndefault allow := false',
        },
      ];

      const bundle = await manager.createBundle('test-bundle', '1.0.0', policies);
      const outputPath = path.join(testDir, 'bundle.tar.gz');

      await fs.mkdir(testDir, { recursive: true });
      await manager.packageBundle(bundle, outputPath);

      expect(eventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'test-bundle',
          version: '1.0.0',
          outputPath,
          size: expect.any(Number),
        })
      );
    });

    it('should include signature in packaged bundle', async () => {
      const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
      });

      const signingConfig = {
        privateKey: privateKey.export({ type: 'pkcs1', format: 'pem' }) as string,
        publicKey: publicKey.export({ type: 'pkcs1', format: 'pem' }) as string,
        algorithm: 'RS256' as const,
      };

      const managerWithSigning = new OPABundleManager(signingConfig);

      const policies = [
        {
          path: 'authz/main.rego',
          content: 'package authz\ndefault allow := false',
        },
      ];

      const bundle = await managerWithSigning.createBundle('signed-bundle', '1.0.0', policies);
      const outputPath = path.join(testDir, 'bundle.tar.gz');

      await fs.mkdir(testDir, { recursive: true });
      await managerWithSigning.packageBundle(bundle, outputPath);

      expect(bundle.signature).toBeDefined();
      // Package should include .signatures.json file
    });
  });

  describe('Bundle Loading and Verification', () => {
    it('should load and verify a valid bundle', async () => {
      const policies = [
        {
          path: 'authz/main.rego',
          content: 'package authz\ndefault allow := false',
        },
      ];

      const bundle = await manager.createBundle('test-bundle', '1.0.0', policies);
      const bundlePath = path.join(testDir, 'bundle.tar.gz');

      await fs.mkdir(testDir, { recursive: true });
      await manager.packageBundle(bundle, bundlePath);

      const result = await manager.loadBundle(bundlePath);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.bundle).toBeDefined();
      expect(result.bundle?.name).toBe('test-bundle');
      expect(result.bundle?.version).toBe('1.0.0');
      expect(result.manifestValid).toBe(true);
      expect(result.policiesValid).toBe(true);
    });

    it('should verify signed bundle correctly', async () => {
      const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
      });

      const signingConfig = {
        privateKey: privateKey.export({ type: 'pkcs1', format: 'pem' }) as string,
        publicKey: publicKey.export({ type: 'pkcs1', format: 'pem' }) as string,
        algorithm: 'RS256' as const,
      };

      const managerWithSigning = new OPABundleManager(signingConfig);

      const policies = [
        {
          path: 'authz/main.rego',
          content: 'package authz\ndefault allow := false',
        },
      ];

      const bundle = await managerWithSigning.createBundle('signed-bundle', '1.0.0', policies);
      const bundlePath = path.join(testDir, 'bundle.tar.gz');

      await fs.mkdir(testDir, { recursive: true });
      await managerWithSigning.packageBundle(bundle, bundlePath);

      const result = await managerWithSigning.loadBundle(bundlePath);

      expect(result.valid).toBe(true);
      expect(result.signatureValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should emit bundle_loaded event on successful load', async () => {
      const eventSpy = jest.fn();
      manager.on('bundle_loaded', eventSpy);

      const policies = [
        {
          path: 'authz/main.rego',
          content: 'package authz\ndefault allow := false',
        },
      ];

      const bundle = await manager.createBundle('test-bundle', '1.0.0', policies);
      const bundlePath = path.join(testDir, 'bundle.tar.gz');

      await fs.mkdir(testDir, { recursive: true });
      await manager.packageBundle(bundle, bundlePath);
      await manager.loadBundle(bundlePath);

      expect(eventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'test-bundle',
          version: '1.0.0',
          verified: true,
        })
      );
    });

    it('should detect manifest hash mismatches', async () => {
      const policies = [
        {
          path: 'authz/main.rego',
          content: 'package authz\ndefault allow := false',
        },
      ];

      const bundle = await manager.createBundle('test-bundle', '1.0.0', policies);

      // Tamper with policy hash in manifest
      bundle.manifest.policies[0].hash = 'tampered-hash';

      const bundlePath = path.join(testDir, 'tampered-bundle.tar.gz');
      await fs.mkdir(testDir, { recursive: true });
      await manager.packageBundle(bundle, bundlePath);

      const result = await manager.loadBundle(bundlePath);

      expect(result.valid).toBe(false);
      expect(result.manifestValid).toBe(false);
      expect(result.errors).toContain('Manifest integrity check failed');
    });
  });

  describe('Bundle Management', () => {
    it('should retrieve bundle by name and version', async () => {
      const policies = [
        {
          path: 'authz/main.rego',
          content: 'package authz\ndefault allow := false',
        },
      ];

      await manager.createBundle('test-bundle', '1.0.0', policies);
      const retrieved = manager.getBundle('test-bundle', '1.0.0');

      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe('test-bundle');
      expect(retrieved?.version).toBe('1.0.0');
    });

    it('should return undefined for non-existent bundle', () => {
      const retrieved = manager.getBundle('non-existent', '1.0.0');
      expect(retrieved).toBeUndefined();
    });

    it('should list all bundles', async () => {
      const policies = [
        {
          path: 'authz/main.rego',
          content: 'package authz\ndefault allow := false',
        },
      ];

      await manager.createBundle('bundle1', '1.0.0', policies);
      await manager.createBundle('bundle2', '1.0.0', policies);

      const bundles = manager.listBundles();

      expect(bundles).toHaveLength(2);
      expect(bundles[0].name).toBeTruthy();
      expect(bundles[0].version).toBeTruthy();
      expect(bundles[0].signed).toBeDefined();
      expect(bundles[0].created).toBeInstanceOf(Date);
    });

    it('should update bundle with new version', async () => {
      const policies = [
        {
          path: 'authz/main.rego',
          content: 'package authz\ndefault allow := false',
        },
      ];

      await manager.createBundle('test-bundle', '1.0.0', policies);

      const newPolicies = [
        {
          path: 'authz/main.rego',
          content: 'package authz\ndefault allow := true',
        },
      ];

      const updatedBundle = await manager.updateBundle('test-bundle', '2.0.0', newPolicies);

      expect(updatedBundle.version).toBe('2.0.0');
      expect(updatedBundle.policies[0].content).toContain('allow := true');
    });

    it('should throw error when updating non-existent bundle', async () => {
      await expect(manager.updateBundle('non-existent', '2.0.0')).rejects.toThrow('Bundle non-existent not found');
    });
  });

  describe('Default ABAC Policies', () => {
    it('should include all required default policy files', () => {
      expect(DEFAULT_ABAC_POLICIES).toHaveProperty('authz/main.rego');
      expect(DEFAULT_ABAC_POLICIES).toHaveProperty('tenant/isolation.rego');
      expect(DEFAULT_ABAC_POLICIES).toHaveProperty('data/permissions.rego');
    });

    it('should have valid Rego syntax in default policies', () => {
      Object.values(DEFAULT_ABAC_POLICIES).forEach(policy => {
        expect(policy).toContain('package ');
        expect(typeof policy).toBe('string');
      });
    });

    it('should create bundle with default ABAC policies', async () => {
      const policies = Object.entries(DEFAULT_ABAC_POLICIES).map(([path, content]) => ({
        path,
        content,
      }));

      const bundle = await manager.createBundle('abac-bundle', '1.0.0', policies);

      expect(bundle.policies).toHaveLength(3);
      expect(bundle.manifest.roots).toContain('authz');
      expect(bundle.manifest.roots).toContain('tenant');
      expect(bundle.manifest.roots).toContain('data');
    });
  });
});
