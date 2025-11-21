/**
 * Version Registry Tests
 *
 * MIT License
 * Copyright (c) 2025 IntelGraph
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { VersionRegistry } from '../version-registry';

describe('VersionRegistry', () => {
  let registry: VersionRegistry;

  beforeEach(() => {
    registry = new VersionRegistry();
  });

  describe('version registration', () => {
    it('should register default versions on initialization', () => {
      const versions = registry.getAllVersions();
      expect(versions.length).toBeGreaterThan(0);

      const v1 = registry.getVersion('v1');
      expect(v1).toBeDefined();
      expect(v1?.version).toBe('v1');
      expect(v1?.status).toBe('active');
    });

    it('should register a new version', () => {
      registry.registerVersion({
        version: 'v3',
        status: 'active',
        releaseDate: new Date('2026-01-01'),
        description: 'Test version',
        breaking: false,
        changelog: [],
        compatibleWith: [],
      });

      const v3 = registry.getVersion('v3');
      expect(v3).toBeDefined();
      expect(v3?.version).toBe('v3');
    });
  });

  describe('version status', () => {
    it('should identify active versions', () => {
      const activeVersions = registry.getActiveVersions();
      expect(activeVersions.length).toBeGreaterThan(0);
      expect(activeVersions.every((v) => v.status === 'active')).toBe(true);
    });

    it('should check if version is deprecated', () => {
      const v1 = registry.getVersion('v1');
      expect(registry.isDeprecated('v1')).toBe(false);

      if (v1) {
        registry.deprecateVersion('v1');
        expect(registry.isDeprecated('v1')).toBe(true);
      }
    });

    it('should check if version is sunset', () => {
      expect(registry.isSunset('v1')).toBe(false);

      registry.sunsetVersion('v1');
      expect(registry.isSunset('v1')).toBe(true);
    });
  });

  describe('version compatibility', () => {
    it('should check compatibility between versions', () => {
      const compatible = registry.isCompatible('v1', 'v2');
      expect(typeof compatible).toBe('boolean');
    });

    it('should get compatibility details', () => {
      const compat = registry.getCompatibility('v1', 'v2');
      if (compat) {
        expect(compat.from).toBe('v1');
        expect(compat.to).toBe('v2');
        expect(typeof compat.compatible).toBe('boolean');
        expect(typeof compat.autoMigrate).toBe('boolean');
      }
    });

    it('should generate compatibility matrix', () => {
      const matrix = registry.generateCompatibilityMatrix();
      expect(matrix).toBeDefined();
      expect(typeof matrix).toBe('object');

      // Check diagonal (same version should be compatible with itself)
      const versions = registry.getAllVersions();
      for (const version of versions) {
        expect(matrix[version.version][version.version]).toBe(true);
      }
    });
  });

  describe('changelog', () => {
    it('should get changelog for a version', () => {
      const changelog = registry.getChangelog('v1');
      expect(Array.isArray(changelog)).toBe(true);
    });

    it('should get breaking changes', () => {
      const breakingChanges = registry.getBreakingChanges('v2');
      expect(Array.isArray(breakingChanges)).toBe(true);

      for (const change of breakingChanges) {
        expect(change.type).toBe('breaking');
      }
    });
  });

  describe('deprecation warnings', () => {
    it('should return null for active version', () => {
      const warning = registry.getDeprecationWarning('v1');
      if (registry.isDeprecated('v1')) {
        expect(warning).toBeDefined();
      } else {
        expect(warning).toBeNull();
      }
    });

    it('should return warning for deprecated version', () => {
      registry.deprecateVersion('v1', new Date('2025-12-31'));
      const warning = registry.getDeprecationWarning('v1');

      expect(warning).toBeDefined();
      expect(warning).toContain('deprecated');
      expect(warning).toContain('2025-12-31');
    });
  });

  describe('version defaults', () => {
    it('should have a default version', () => {
      const defaultVersion = registry.getDefaultVersion();
      expect(defaultVersion).toBeDefined();
      expect(typeof defaultVersion).toBe('string');
    });

    it('should have a latest version', () => {
      const latestVersion = registry.getLatestVersion();
      expect(latestVersion).toBeDefined();
      expect(typeof latestVersion).toBe('string');
    });

    it('should allow setting default version', () => {
      const v2 = registry.getVersion('v2');
      if (v2) {
        registry.setDefaultVersion('v2');
        expect(registry.getDefaultVersion()).toBe('v2');
      }
    });

    it('should throw error when setting invalid default version', () => {
      expect(() => {
        registry.setDefaultVersion('v999');
      }).toThrow();
    });
  });
});
