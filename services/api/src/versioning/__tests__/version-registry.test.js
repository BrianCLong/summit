"use strict";
/**
 * Version Registry Tests
 *
 * MIT License
 * Copyright (c) 2025 IntelGraph
 */
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const version_registry_1 = require("../version-registry");
(0, globals_1.describe)('VersionRegistry', () => {
    let registry;
    (0, globals_1.beforeEach)(() => {
        registry = new version_registry_1.VersionRegistry();
    });
    (0, globals_1.describe)('version registration', () => {
        (0, globals_1.it)('should register default versions on initialization', () => {
            const versions = registry.getAllVersions();
            (0, globals_1.expect)(versions.length).toBeGreaterThan(0);
            const v1 = registry.getVersion('v1');
            (0, globals_1.expect)(v1).toBeDefined();
            (0, globals_1.expect)(v1?.version).toBe('v1');
            (0, globals_1.expect)(v1?.status).toBe('active');
        });
        (0, globals_1.it)('should register a new version', () => {
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
            (0, globals_1.expect)(v3).toBeDefined();
            (0, globals_1.expect)(v3?.version).toBe('v3');
        });
    });
    (0, globals_1.describe)('version status', () => {
        (0, globals_1.it)('should identify active versions', () => {
            const activeVersions = registry.getActiveVersions();
            (0, globals_1.expect)(activeVersions.length).toBeGreaterThan(0);
            (0, globals_1.expect)(activeVersions.every((v) => v.status === 'active')).toBe(true);
        });
        (0, globals_1.it)('should check if version is deprecated', () => {
            const v1 = registry.getVersion('v1');
            (0, globals_1.expect)(registry.isDeprecated('v1')).toBe(false);
            if (v1) {
                registry.deprecateVersion('v1');
                (0, globals_1.expect)(registry.isDeprecated('v1')).toBe(true);
            }
        });
        (0, globals_1.it)('should check if version is sunset', () => {
            (0, globals_1.expect)(registry.isSunset('v1')).toBe(false);
            registry.sunsetVersion('v1');
            (0, globals_1.expect)(registry.isSunset('v1')).toBe(true);
        });
    });
    (0, globals_1.describe)('version compatibility', () => {
        (0, globals_1.it)('should check compatibility between versions', () => {
            const compatible = registry.isCompatible('v1', 'v2');
            (0, globals_1.expect)(typeof compatible).toBe('boolean');
        });
        (0, globals_1.it)('should get compatibility details', () => {
            const compat = registry.getCompatibility('v1', 'v2');
            if (compat) {
                (0, globals_1.expect)(compat.from).toBe('v1');
                (0, globals_1.expect)(compat.to).toBe('v2');
                (0, globals_1.expect)(typeof compat.compatible).toBe('boolean');
                (0, globals_1.expect)(typeof compat.autoMigrate).toBe('boolean');
            }
        });
        (0, globals_1.it)('should generate compatibility matrix', () => {
            const matrix = registry.generateCompatibilityMatrix();
            (0, globals_1.expect)(matrix).toBeDefined();
            (0, globals_1.expect)(typeof matrix).toBe('object');
            // Check diagonal (same version should be compatible with itself)
            const versions = registry.getAllVersions();
            for (const version of versions) {
                (0, globals_1.expect)(matrix[version.version][version.version]).toBe(true);
            }
        });
    });
    (0, globals_1.describe)('changelog', () => {
        (0, globals_1.it)('should get changelog for a version', () => {
            const changelog = registry.getChangelog('v1');
            (0, globals_1.expect)(Array.isArray(changelog)).toBe(true);
        });
        (0, globals_1.it)('should get breaking changes', () => {
            const breakingChanges = registry.getBreakingChanges('v2');
            (0, globals_1.expect)(Array.isArray(breakingChanges)).toBe(true);
            for (const change of breakingChanges) {
                (0, globals_1.expect)(change.type).toBe('breaking');
            }
        });
    });
    (0, globals_1.describe)('deprecation warnings', () => {
        (0, globals_1.it)('should return null for active version', () => {
            const warning = registry.getDeprecationWarning('v1');
            if (registry.isDeprecated('v1')) {
                (0, globals_1.expect)(warning).toBeDefined();
            }
            else {
                (0, globals_1.expect)(warning).toBeNull();
            }
        });
        (0, globals_1.it)('should return warning for deprecated version', () => {
            registry.deprecateVersion('v1', new Date('2025-12-31'));
            const warning = registry.getDeprecationWarning('v1');
            (0, globals_1.expect)(warning).toBeDefined();
            (0, globals_1.expect)(warning).toContain('deprecated');
            (0, globals_1.expect)(warning).toContain('2025-12-31');
        });
    });
    (0, globals_1.describe)('version defaults', () => {
        (0, globals_1.it)('should have a default version', () => {
            const defaultVersion = registry.getDefaultVersion();
            (0, globals_1.expect)(defaultVersion).toBeDefined();
            (0, globals_1.expect)(typeof defaultVersion).toBe('string');
        });
        (0, globals_1.it)('should have a latest version', () => {
            const latestVersion = registry.getLatestVersion();
            (0, globals_1.expect)(latestVersion).toBeDefined();
            (0, globals_1.expect)(typeof latestVersion).toBe('string');
        });
        (0, globals_1.it)('should allow setting default version', () => {
            const v2 = registry.getVersion('v2');
            if (v2) {
                registry.setDefaultVersion('v2');
                (0, globals_1.expect)(registry.getDefaultVersion()).toBe('v2');
            }
        });
        (0, globals_1.it)('should throw error when setting invalid default version', () => {
            (0, globals_1.expect)(() => {
                registry.setDefaultVersion('v999');
            }).toThrow();
        });
    });
});
