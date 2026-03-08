"use strict";
/**
 * CompanyOS Identity Fabric - Policy Bundle Manager
 *
 * Manages OPA policy bundles including:
 * - Bundle structure and organization
 * - Version control and rollout
 * - Testing and validation
 * - Hot-reload support
 *
 * @module identity-fabric/policy
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PolicyBundleManager = exports.BUNDLE_STRUCTURE = void 0;
const events_1 = require("events");
const crypto_1 = __importDefault(require("crypto"));
// ============================================================================
// BUNDLE DIRECTORY STRUCTURE
// ============================================================================
/**
 * Standard bundle directory layout:
 *
 * bundles/
 * ├── access-control/
 * │   ├── policies/
 * │   │   ├── abac.rego           # Attribute-based access control
 * │   │   ├── rbac.rego           # Role-based access control
 * │   │   ├── tenant.rego         # Tenant isolation
 * │   │   └── clearance.rego      # Clearance level checks
 * │   ├── data/
 * │   │   ├── roles.json          # Role definitions
 * │   │   ├── permissions.json    # Permission mappings
 * │   │   └── clearance.json      # Clearance hierarchy
 * │   ├── tests/
 * │   │   ├── abac_test.rego
 * │   │   ├── rbac_test.rego
 * │   │   └── fixtures/
 * │   └── manifest.json
 * │
 * ├── data-residency/
 * │   ├── policies/
 * │   │   ├── residency.rego      # Region enforcement
 * │   │   ├── export.rego         # Export controls
 * │   │   └── sovereignty.rego    # Sovereign cloud rules
 * │   ├── data/
 * │   │   ├── regions.json
 * │   │   └── export_rules.json
 * │   ├── tests/
 * │   └── manifest.json
 * │
 * ├── dlp/
 * │   ├── policies/
 * │   │   ├── classification.rego # Data classification
 * │   │   ├── pii.rego            # PII detection
 * │   │   └── secrets.rego        # Secret detection
 * │   ├── data/
 * │   │   ├── patterns.json
 * │   │   └── classifications.json
 * │   ├── tests/
 * │   └── manifest.json
 * │
 * ├── redaction/
 * │   ├── policies/
 * │   │   ├── redact.rego         # Redaction rules
 * │   │   └── masking.rego        # Masking strategies
 * │   ├── data/
 * │   │   └── redaction_rules.json
 * │   ├── tests/
 * │   └── manifest.json
 * │
 * └── step-up-auth/
 *     ├── policies/
 *     │   ├── stepup.rego         # Step-up requirements
 *     │   └── risk.rego           # Risk-based auth
 *     ├── data/
 *     │   ├── sensitive_ops.json
 *     │   └── risk_thresholds.json
 *     ├── tests/
 *     └── manifest.json
 */
exports.BUNDLE_STRUCTURE = {
    'access-control': {
        description: 'ABAC/RBAC access control policies',
        policies: ['abac.rego', 'rbac.rego', 'tenant.rego', 'clearance.rego'],
        data: ['roles.json', 'permissions.json', 'clearance.json'],
    },
    'data-residency': {
        description: 'Data residency and sovereignty policies',
        policies: ['residency.rego', 'export.rego', 'sovereignty.rego'],
        data: ['regions.json', 'export_rules.json'],
    },
    'dlp': {
        description: 'Data loss prevention policies',
        policies: ['classification.rego', 'pii.rego', 'secrets.rego'],
        data: ['patterns.json', 'classifications.json'],
    },
    'redaction': {
        description: 'Data redaction and masking policies',
        policies: ['redact.rego', 'masking.rego'],
        data: ['redaction_rules.json'],
    },
    'step-up-auth': {
        description: 'Step-up authentication and risk policies',
        policies: ['stepup.rego', 'risk.rego'],
        data: ['sensitive_ops.json', 'risk_thresholds.json'],
    },
};
const DEFAULT_CONFIG = {
    bundleDir: './bundles',
    opaUrl: 'http://localhost:8181',
    verifySignatures: true,
    autoReload: true,
    reloadIntervalMs: 60000,
    testBeforeLoad: true,
};
class PolicyBundleManager extends events_1.EventEmitter {
    config;
    loadedBundles;
    bundleVersions;
    reloadInterval;
    constructor(config = {}) {
        super();
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.loadedBundles = new Map();
        this.bundleVersions = new Map();
        if (this.config.autoReload) {
            this.startAutoReload();
        }
    }
    // ==========================================================================
    // BUNDLE OPERATIONS
    // ==========================================================================
    /**
     * Load all bundles from the bundle directory.
     */
    async loadAllBundles() {
        const bundles = new Map();
        for (const bundleName of Object.keys(exports.BUNDLE_STRUCTURE)) {
            try {
                const bundle = await this.loadBundle(bundleName);
                bundles.set(bundleName, bundle);
            }
            catch (error) {
                this.emit('bundle:error', {
                    bundle: bundleName,
                    error: error instanceof Error ? error.message : String(error),
                });
            }
        }
        return bundles;
    }
    /**
     * Load a specific bundle.
     */
    async loadBundle(bundleName) {
        const bundlePath = `${this.config.bundleDir}/${bundleName}`;
        // Load manifest
        const manifest = await this.loadManifest(bundlePath);
        // Load policies
        const policies = await this.loadPolicies(bundlePath);
        // Load data
        const data = await this.loadData(bundlePath);
        // Calculate revision
        const revision = this.calculateRevision(policies, data);
        const bundle = {
            name: bundleName,
            version: manifest.metadata.version,
            revision,
            roots: manifest.roots,
            policies,
            data,
            manifest,
        };
        // Verify signature if required
        if (this.config.verifySignatures && bundle.signature) {
            const valid = await this.verifySignature(bundle);
            if (!valid) {
                throw new Error(`Bundle ${bundleName} has invalid signature`);
            }
        }
        // Run tests if required
        if (this.config.testBeforeLoad) {
            const testResult = await this.runBundleTests(bundlePath);
            if (!testResult.passed) {
                throw new Error(`Bundle ${bundleName} tests failed: ${testResult.failures.join(', ')}`);
            }
        }
        // Push to OPA
        await this.pushToOPA(bundle);
        // Track loaded bundle
        this.loadedBundles.set(bundleName, bundle);
        this.bundleVersions.set(bundleName, revision);
        this.emit('bundle:loaded', {
            bundle: bundleName,
            version: manifest.metadata.version,
            revision,
        });
        return bundle;
    }
    /**
     * Reload a bundle if it has changed.
     */
    async reloadBundle(bundleName) {
        const bundlePath = `${this.config.bundleDir}/${bundleName}`;
        // Check for changes
        const policies = await this.loadPolicies(bundlePath);
        const data = await this.loadData(bundlePath);
        const newRevision = this.calculateRevision(policies, data);
        const currentRevision = this.bundleVersions.get(bundleName);
        if (currentRevision === newRevision) {
            return false; // No changes
        }
        // Reload the bundle
        await this.loadBundle(bundleName);
        return true;
    }
    /**
     * Unload a bundle from OPA.
     */
    async unloadBundle(bundleName) {
        const bundle = this.loadedBundles.get(bundleName);
        if (!bundle) {
            return;
        }
        // Remove from OPA
        for (const policy of bundle.policies) {
            const policyPath = policy.path.replace('.rego', '').replace(/\//g, '.');
            await this.deleteFromOPA(`/v1/policies/${policyPath}`);
        }
        for (const dataFile of bundle.data) {
            const dataPath = dataFile.path.replace('.json', '').replace(/\//g, '/');
            await this.deleteFromOPA(`/v1/data/${dataPath}`);
        }
        this.loadedBundles.delete(bundleName);
        this.bundleVersions.delete(bundleName);
        this.emit('bundle:unloaded', { bundle: bundleName });
    }
    // ==========================================================================
    // BUNDLE CREATION
    // ==========================================================================
    /**
     * Create a new bundle from policy files.
     */
    createBundle(name, policies, data, metadata) {
        const policyFiles = policies.map(p => ({
            path: p.path,
            content: p.content,
            hash: this.hashContent(p.content),
        }));
        const dataFiles = data.map(d => ({
            path: d.path,
            content: d.content,
            hash: this.hashContent(JSON.stringify(d.content)),
        }));
        const revision = this.calculateRevision(policyFiles, dataFiles);
        const manifest = {
            revision,
            roots: [name],
            metadata: {
                name,
                version: metadata.version || '1.0.0',
                description: metadata.description || '',
                author: metadata.author || 'companyos',
                createdAt: new Date().toISOString(),
                environment: metadata.environment || ['development', 'staging', 'production'],
                classification: metadata.classification || 'internal',
                tags: metadata.tags || [],
            },
            dependencies: [],
        };
        return {
            name,
            version: manifest.metadata.version,
            revision,
            roots: manifest.roots,
            policies: policyFiles,
            data: dataFiles,
            manifest,
        };
    }
    /**
     * Sign a bundle for integrity verification.
     */
    async signBundle(bundle, privateKey) {
        const content = this.getBundleSigningContent(bundle);
        const signature = crypto_1.default.sign('sha256', Buffer.from(content), privateKey).toString('base64');
        return {
            ...bundle,
            signature: {
                algorithm: 'RS256',
                keyId: this.getKeyId(privateKey),
                signature,
                signedAt: new Date().toISOString(),
            },
        };
    }
    // ==========================================================================
    // TESTING
    // ==========================================================================
    /**
     * Run tests for a bundle.
     */
    async runBundleTests(bundlePath) {
        const testPath = `${bundlePath}/tests`;
        const failures = [];
        try {
            // Use OPA test command
            const response = await fetch(`${this.config.opaUrl}/v1/data/test`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ input: { path: testPath } }),
            });
            if (!response.ok) {
                failures.push(`OPA test request failed: ${response.status}`);
                return { passed: false, failures };
            }
            const result = await response.json();
            const testResults = result.result || [];
            for (const test of testResults) {
                if (!test.pass) {
                    failures.push(`${test.name}: ${test.message || 'failed'}`);
                }
            }
            return { passed: failures.length === 0, failures };
        }
        catch (error) {
            failures.push(`Test execution error: ${error instanceof Error ? error.message : String(error)}`);
            return { passed: false, failures };
        }
    }
    /**
     * Validate bundle structure.
     */
    validateBundleStructure(bundle) {
        const errors = [];
        if (!bundle.name) {
            errors.push('Bundle name is required');
        }
        if (!bundle.version) {
            errors.push('Bundle version is required');
        }
        if (!bundle.policies || bundle.policies.length === 0) {
            errors.push('Bundle must contain at least one policy');
        }
        for (const policy of bundle.policies) {
            if (!policy.path.endsWith('.rego')) {
                errors.push(`Invalid policy file extension: ${policy.path}`);
            }
            // Basic Rego syntax check
            if (!policy.content.includes('package ')) {
                errors.push(`Policy ${policy.path} missing package declaration`);
            }
        }
        for (const dataFile of bundle.data) {
            if (!dataFile.path.endsWith('.json')) {
                errors.push(`Invalid data file extension: ${dataFile.path}`);
            }
            try {
                if (typeof dataFile.content === 'string') {
                    JSON.parse(dataFile.content);
                }
            }
            catch {
                errors.push(`Invalid JSON in data file: ${dataFile.path}`);
            }
        }
        return { valid: errors.length === 0, errors };
    }
    // ==========================================================================
    // OPA INTEGRATION
    // ==========================================================================
    /**
     * Push bundle to OPA.
     */
    async pushToOPA(bundle) {
        // Push policies
        for (const policy of bundle.policies) {
            const policyId = `${bundle.name}/${policy.path}`.replace(/\//g, '_').replace('.rego', '');
            await fetch(`${this.config.opaUrl}/v1/policies/${policyId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'text/plain' },
                body: policy.content,
            });
        }
        // Push data
        for (const dataFile of bundle.data) {
            const dataPath = `${bundle.name}/${dataFile.path}`.replace('.json', '').replace(/\//g, '/');
            await fetch(`${this.config.opaUrl}/v1/data/${dataPath}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dataFile.content),
            });
        }
    }
    async deleteFromOPA(path) {
        await fetch(`${this.config.opaUrl}${path}`, { method: 'DELETE' });
    }
    // ==========================================================================
    // HELPER METHODS
    // ==========================================================================
    async loadManifest(bundlePath) {
        // In a real implementation, this would read from filesystem
        // For now, return a default manifest
        return {
            revision: '',
            roots: [],
            metadata: {
                name: bundlePath.split('/').pop() || 'unknown',
                version: '1.0.0',
                description: '',
                author: 'companyos',
                createdAt: new Date().toISOString(),
                environment: ['development', 'staging', 'production'],
                classification: 'internal',
                tags: [],
            },
            dependencies: [],
        };
    }
    async loadPolicies(bundlePath) {
        // In a real implementation, this would read from filesystem
        return [];
    }
    async loadData(bundlePath) {
        // In a real implementation, this would read from filesystem
        return [];
    }
    calculateRevision(policies, data) {
        const hashes = [...policies.map(p => p.hash), ...data.map(d => d.hash)].sort();
        return crypto_1.default.createHash('sha256').update(hashes.join('')).digest('hex').substring(0, 16);
    }
    hashContent(content) {
        return crypto_1.default.createHash('sha256').update(content).digest('hex');
    }
    async verifySignature(bundle) {
        if (!bundle.signature) {
            return false;
        }
        // In a real implementation, this would verify against a public key
        return true;
    }
    getBundleSigningContent(bundle) {
        return JSON.stringify({
            name: bundle.name,
            version: bundle.version,
            revision: bundle.revision,
            roots: bundle.roots,
            policies: bundle.policies.map(p => ({ path: p.path, hash: p.hash })),
            data: bundle.data.map(d => ({ path: d.path, hash: d.hash })),
        });
    }
    getKeyId(privateKey) {
        return crypto_1.default.createHash('sha256').update(privateKey).digest('hex').substring(0, 8);
    }
    startAutoReload() {
        this.reloadInterval = setInterval(async () => {
            for (const bundleName of this.loadedBundles.keys()) {
                try {
                    const reloaded = await this.reloadBundle(bundleName);
                    if (reloaded) {
                        this.emit('bundle:reloaded', { bundle: bundleName });
                    }
                }
                catch (error) {
                    this.emit('bundle:error', {
                        bundle: bundleName,
                        error: error instanceof Error ? error.message : String(error),
                    });
                }
            }
        }, this.config.reloadIntervalMs);
    }
    /**
     * Stop auto-reload.
     */
    stopAutoReload() {
        if (this.reloadInterval) {
            clearInterval(this.reloadInterval);
            this.reloadInterval = undefined;
        }
    }
    /**
     * Get loaded bundle info.
     */
    getLoadedBundles() {
        return Array.from(this.loadedBundles.values()).map(b => ({
            name: b.name,
            version: b.version,
            revision: b.revision,
        }));
    }
}
exports.PolicyBundleManager = PolicyBundleManager;
