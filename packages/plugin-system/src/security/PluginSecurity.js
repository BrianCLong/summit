"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PluginSecurity = void 0;
const crypto_1 = __importDefault(require("crypto"));
const plugin_js_1 = require("../types/plugin.js");
/**
 * Plugin security framework
 */
class PluginSecurity {
    trustedPublishers = new Set();
    blacklistedPlugins = new Set();
    permissionPolicies = new Map();
    constructor() {
        this.initializeDefaultPolicies();
    }
    /**
     * Verify plugin signature
     */
    async verifySignature(pluginId, content, signature, publicKey) {
        try {
            const verify = crypto_1.default.createVerify('RSA-SHA256');
            verify.update(content);
            verify.end();
            return verify.verify(publicKey, signature, 'base64');
        }
        catch (error) {
            return false;
        }
    }
    /**
     * Scan plugin for vulnerabilities
     */
    async scanPlugin(pluginPath, manifest) {
        const vulnerabilities = [];
        const warnings = [];
        // Check if plugin is blacklisted
        if (this.blacklistedPlugins.has(manifest.id)) {
            vulnerabilities.push({
                severity: 'critical',
                type: 'blacklisted',
                message: `Plugin ${manifest.id} is blacklisted`,
                cve: undefined,
            });
        }
        // Check publisher trust
        if (!this.trustedPublishers.has(manifest.author.email || '')) {
            warnings.push(`Publisher ${manifest.author.name} is not in trusted list`);
        }
        // Scan for dangerous patterns
        const dangerousPatterns = await this.scanForDangerousPatterns(pluginPath);
        vulnerabilities.push(...dangerousPatterns);
        // Check permissions
        const permissionIssues = await this.analyzePermissions(manifest);
        warnings.push(...permissionIssues);
        // Scan dependencies for known vulnerabilities
        const depVulnerabilities = await this.scanDependencies(manifest);
        vulnerabilities.push(...depVulnerabilities);
        return {
            safe: vulnerabilities.filter(v => v.severity === 'critical').length === 0,
            vulnerabilities,
            warnings,
            scannedAt: new Date(),
        };
    }
    /**
     * Check if permission is allowed for plugin
     */
    checkPermission(manifest, permission, context) {
        // Check if permission requested
        if (!manifest.permissions.includes(permission)) {
            return {
                allowed: false,
                reason: 'Permission not requested in manifest',
            };
        }
        // Get policy for permission
        const policy = this.permissionPolicies.get(permission);
        if (!policy) {
            return {
                allowed: true,
            };
        }
        // Apply policy rules
        const policyResult = policy.evaluate(manifest, context);
        if (!policyResult.allowed) {
            return policyResult;
        }
        return {
            allowed: true,
        };
    }
    /**
     * Apply resource quota enforcement
     */
    enforceResourceQuota(manifest) {
        const requested = manifest.resources || {
            maxMemoryMB: 256,
            maxCpuPercent: 50,
            maxStorageMB: 100,
            maxNetworkMbps: 10,
        };
        // Apply maximum limits
        const quota = {
            maxMemoryMB: Math.min(requested.maxMemoryMB, 2048),
            maxCpuPercent: Math.min(requested.maxCpuPercent, 100),
            maxStorageMB: Math.min(requested.maxStorageMB, 1024),
            maxNetworkMbps: Math.min(requested.maxNetworkMbps, 1000),
        };
        return quota;
    }
    /**
     * Add trusted publisher
     */
    addTrustedPublisher(email) {
        this.trustedPublishers.add(email);
    }
    /**
     * Blacklist a plugin
     */
    blacklistPlugin(pluginId, reason) {
        this.blacklistedPlugins.add(pluginId);
    }
    /**
     * Scan for dangerous code patterns
     */
    async scanForDangerousPatterns(pluginPath) {
        const vulnerabilities = [];
        // Would implement static analysis here:
        // - eval() usage
        // - dynamic require()
        // - child_process usage
        // - network requests to suspicious domains
        // - file system manipulation
        // - crypto mining patterns
        return vulnerabilities;
    }
    /**
     * Analyze requested permissions
     */
    async analyzePermissions(manifest) {
        const warnings = [];
        const dangerousPermissions = [
            plugin_js_1.PluginPermission.FILE_SYSTEM,
            plugin_js_1.PluginPermission.DATABASE_ACCESS,
            plugin_js_1.PluginPermission.EXECUTE_QUERIES,
        ];
        for (const permission of manifest.permissions) {
            if (dangerousPermissions.includes(permission)) {
                warnings.push(`Plugin requests dangerous permission: ${permission}. Review carefully.`);
            }
        }
        return warnings;
    }
    /**
     * Scan dependencies for vulnerabilities
     */
    async scanDependencies(manifest) {
        const vulnerabilities = [];
        // Would integrate with vulnerability databases like:
        // - npm audit
        // - Snyk
        // - GitHub Security Advisories
        return vulnerabilities;
    }
    /**
     * Initialize default permission policies
     */
    initializeDefaultPolicies() {
        // Example: Network access requires approval for unknown publishers
        this.permissionPolicies.set(plugin_js_1.PluginPermission.NETWORK_ACCESS, {
            evaluate: (manifest, context) => {
                if (!this.trustedPublishers.has(manifest.author.email || '')) {
                    return {
                        allowed: false,
                        reason: 'Network access requires trusted publisher for first-time plugins',
                        requiresApproval: true,
                    };
                }
                return { allowed: true };
            },
        });
        // File system access is restricted
        this.permissionPolicies.set(plugin_js_1.PluginPermission.FILE_SYSTEM, {
            evaluate: (manifest, context) => {
                return {
                    allowed: false,
                    reason: 'File system access is restricted',
                    requiresApproval: true,
                };
            },
        });
    }
}
exports.PluginSecurity = PluginSecurity;
