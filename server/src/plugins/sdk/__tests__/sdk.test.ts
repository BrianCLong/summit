import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import { ManifestValidator } from '../validator.js';
import { PluginSandbox } from '../sandbox.js';

describe('Plugin SDK', () => {
  describe('Manifest Validation', () => {
    const validManifest = {
      name: 'test-plugin',
      version: '1.0.0',
      type: 'connector',
      capabilities: ['read:graph'],
      requiredScopes: ['tenant:123'],
      riskLevel: 'low',
      owner: 'dev@example.com'
    };

    it('should validate a correct manifest', () => {
      const result = ManifestValidator.validate(validManifest);
      expect(result.success).toBe(true);
      expect(result.data).toMatchObject(validManifest);
    });

    it('should fail on invalid name format', () => {
      const invalid = { ...validManifest, name: 'Test Plugin' }; // Spaces not allowed
      const result = ManifestValidator.validate(invalid);
      expect(result.success).toBe(false);
      expect(result.errors![0]).toContain('Name must be kebab-case');
    });

    it('should fail on invalid semver', () => {
      const invalid = { ...validManifest, version: '1.0' }; // Missing patch
      const result = ManifestValidator.validate(invalid);
      expect(result.success).toBe(false);
      expect(result.errors![0]).toContain('Must be valid semver');
    });

    it('should fail on missing required fields', () => {
      const invalid = { ...validManifest } as any;
      delete invalid.owner;
      const result = ManifestValidator.validate(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('Plugin Sandbox', () => {
    it('should execute a function within timeout', async () => {
      const sandbox = new PluginSandbox({ timeoutMs: 100 });
      const result = await sandbox.run(async () => {
        return 'success';
      });
      expect(result).toBe('success');
    });

    it('should timeout long running functions', async () => {
      const sandbox = new PluginSandbox({ timeoutMs: 50 });

      await expect(sandbox.run(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
        return 'too slow';
      })).rejects.toThrow('Plugin execution timed out');
    });

    it('should block network if configured', () => {
        const sandbox = new PluginSandbox({ allowNetwork: false });
        expect(() => sandbox.checkNetworkAccess('example.com')).toThrow('Network access denied');
    });

    it('should allow network if configured', () => {
        const sandbox = new PluginSandbox({ allowNetwork: true });
        expect(() => sandbox.checkNetworkAccess('example.com')).not.toThrow();
    });
  });
});
