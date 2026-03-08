"use strict";
/**
 * API Version Registry
 * Central registry for managing API versions, deprecation, and compatibility
 *
 * MIT License
 * Copyright (c) 2025 IntelGraph
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.versionRegistry = exports.VersionRegistry = void 0;
const luxon_1 = require("luxon");
class VersionRegistry {
    versions = new Map();
    compatibility = new Map();
    defaultVersion = 'v1';
    constructor() {
        this.registerDefaultVersions();
    }
    /**
     * Register default API versions
     */
    registerDefaultVersions() {
        // Version 1.0 - Initial release
        this.registerVersion({
            version: 'v1',
            status: 'active',
            releaseDate: new Date('2025-01-01'),
            description: 'Initial API version with core entity and investigation features',
            breaking: false,
            changelog: [
                {
                    type: 'feature',
                    description: 'Initial GraphQL API release',
                    date: new Date('2025-01-01'),
                },
                {
                    type: 'feature',
                    description: 'Entity and Relationship management',
                    date: new Date('2025-01-01'),
                },
                {
                    type: 'feature',
                    description: 'Investigation and hypothesis tracking',
                    date: new Date('2025-01-01'),
                },
                {
                    type: 'feature',
                    description: 'AI Copilot integration',
                    date: new Date('2025-01-01'),
                },
            ],
            compatibleWith: [],
        });
        // Version 2.0 - Enhanced features (planned)
        this.registerVersion({
            version: 'v2',
            status: 'active',
            releaseDate: new Date('2025-06-01'),
            description: 'Enhanced analytics and performance improvements',
            breaking: true,
            changelog: [
                {
                    type: 'breaking',
                    description: 'Changed entity confidence field to use percentage (0-100) instead of decimal (0-1)',
                    date: new Date('2025-06-01'),
                    migration: 'Multiply all confidence values by 100',
                },
                {
                    type: 'feature',
                    description: 'Advanced graph analytics algorithms',
                    date: new Date('2025-06-01'),
                },
                {
                    type: 'feature',
                    description: 'Real-time collaboration enhancements',
                    date: new Date('2025-06-01'),
                },
                {
                    type: 'deprecation',
                    description: 'Deprecated globalSearch in favor of structured search endpoints',
                    date: new Date('2025-06-01'),
                },
            ],
            compatibleWith: ['v1'],
        });
        // Set up compatibility mappings
        this.registerCompatibility({
            from: 'v1',
            to: 'v2',
            compatible: true,
            autoMigrate: true,
            migrationPath: '/docs/migrations/v1-to-v2',
            warnings: [
                'Confidence values will be automatically converted from decimal to percentage',
                'globalSearch is deprecated, please use searchEntities instead',
            ],
        });
        this.registerCompatibility({
            from: 'v2',
            to: 'v1',
            compatible: true,
            autoMigrate: true,
            migrationPath: '/docs/migrations/v2-to-v1',
            warnings: [
                'Some v2 features may not be available in v1',
                'Confidence values will be converted back to decimal format',
            ],
        });
    }
    /**
     * Register a new API version
     */
    registerVersion(version) {
        this.versions.set(version.version, version);
    }
    /**
     * Register compatibility between versions
     */
    registerCompatibility(compatibility) {
        const key = compatibility.from;
        const existing = this.compatibility.get(key) || [];
        existing.push(compatibility);
        this.compatibility.set(key, existing);
    }
    /**
     * Get version information
     */
    getVersion(version) {
        return this.versions.get(version);
    }
    /**
     * Get all registered versions
     */
    getAllVersions() {
        return Array.from(this.versions.values()).sort((a, b) => {
            return b.releaseDate.getTime() - a.releaseDate.getTime();
        });
    }
    /**
     * Get active (non-deprecated, non-sunset) versions
     */
    getActiveVersions() {
        return this.getAllVersions().filter((v) => v.status === 'active');
    }
    /**
     * Get deprecated versions
     */
    getDeprecatedVersions() {
        return this.getAllVersions().filter((v) => v.status === 'deprecated');
    }
    /**
     * Get the default API version
     */
    getDefaultVersion() {
        return this.defaultVersion;
    }
    /**
     * Set the default API version
     */
    setDefaultVersion(version) {
        if (!this.versions.has(version)) {
            throw new Error(`Version ${version} is not registered`);
        }
        this.defaultVersion = version;
    }
    /**
     * Get the latest API version
     */
    getLatestVersion() {
        const versions = this.getActiveVersions();
        return versions[0]?.version || this.defaultVersion;
    }
    /**
     * Check if a version is deprecated
     */
    isDeprecated(version) {
        const versionInfo = this.getVersion(version);
        return versionInfo?.status === 'deprecated';
    }
    /**
     * Check if a version is sunset (no longer supported)
     */
    isSunset(version) {
        const versionInfo = this.getVersion(version);
        return versionInfo?.status === 'sunset';
    }
    /**
     * Get deprecation warning for a version
     */
    getDeprecationWarning(version) {
        const versionInfo = this.getVersion(version);
        if (!versionInfo || versionInfo.status !== 'deprecated') {
            return null;
        }
        const sunsetDate = versionInfo.sunsetDate
            ? luxon_1.DateTime.fromJSDate(versionInfo.sunsetDate).toFormat('yyyy-MM-dd')
            : 'a future date';
        return `API version ${version} is deprecated and will be sunset on ${sunsetDate}. Please migrate to ${this.getLatestVersion()}.`;
    }
    /**
     * Check compatibility between versions
     */
    isCompatible(fromVersion, toVersion) {
        const compatList = this.compatibility.get(fromVersion);
        if (!compatList)
            return false;
        const compat = compatList.find((c) => c.to === toVersion);
        return compat?.compatible ?? false;
    }
    /**
     * Get compatibility info between versions
     */
    getCompatibility(fromVersion, toVersion) {
        const compatList = this.compatibility.get(fromVersion);
        return compatList?.find((c) => c.to === toVersion);
    }
    /**
     * Get all compatibility mappings for a version
     */
    getCompatibilityMappings(version) {
        return this.compatibility.get(version) || [];
    }
    /**
     * Get changelog for a version
     */
    getChangelog(version) {
        const versionInfo = this.getVersion(version);
        return versionInfo?.changelog || [];
    }
    /**
     * Get breaking changes for a version
     */
    getBreakingChanges(version) {
        return this.getChangelog(version).filter((c) => c.type === 'breaking');
    }
    /**
     * Deprecate a version
     */
    deprecateVersion(version, sunsetDate) {
        const versionInfo = this.getVersion(version);
        if (!versionInfo) {
            throw new Error(`Version ${version} not found`);
        }
        versionInfo.status = 'deprecated';
        versionInfo.deprecationDate = new Date();
        versionInfo.sunsetDate = sunsetDate;
        this.versions.set(version, versionInfo);
    }
    /**
     * Sunset a version (mark as no longer supported)
     */
    sunsetVersion(version) {
        const versionInfo = this.getVersion(version);
        if (!versionInfo) {
            throw new Error(`Version ${version} not found`);
        }
        versionInfo.status = 'sunset';
        versionInfo.sunsetDate = new Date();
        this.versions.set(version, versionInfo);
    }
    /**
     * Generate version compatibility matrix
     */
    generateCompatibilityMatrix() {
        const matrix = {};
        const versions = this.getAllVersions().map((v) => v.version);
        for (const from of versions) {
            matrix[from] = {};
            for (const to of versions) {
                if (from === to) {
                    matrix[from][to] = true;
                }
                else {
                    matrix[from][to] = this.isCompatible(from, to);
                }
            }
        }
        return matrix;
    }
}
exports.VersionRegistry = VersionRegistry;
// Singleton instance
exports.versionRegistry = new VersionRegistry();
