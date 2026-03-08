"use strict";
/**
 * OPA Policy Bundle Management with Signing
 * Sprint 27D: Secure policy distribution with cryptographic verification
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_ABAC_POLICIES = exports.OPABundleManager = void 0;
const crypto_1 = __importDefault(require("crypto"));
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const tar_1 = __importDefault(require("tar"));
const events_1 = require("events");
class OPABundleManager extends events_1.EventEmitter {
    bundles = new Map();
    signingConfig;
    constructor(signingConfig) {
        super();
        this.signingConfig = signingConfig;
    }
    /**
     * Create a new policy bundle
     */
    async createBundle(name, version, policies, data = [], metadata = {}) {
        // Validate policy syntax
        await this.validatePolicies(policies);
        // Create policy files with hashes
        const policyFiles = policies.map((p) => ({
            path: p.path,
            content: p.content,
            hash: this.calculateHash(p.content),
        }));
        // Create data files with hashes
        const dataFiles = data.map((d) => ({
            path: d.path,
            content: d.content,
            hash: this.calculateHash(JSON.stringify(d.content)),
        }));
        // Create manifest
        const manifest = {
            version,
            metadata: {
                name,
                description: metadata.description || `Policy bundle ${name}`,
                author: metadata.author || 'system',
                created: new Date().toISOString(),
                ...metadata,
            },
            policies: policyFiles.map((p) => ({
                path: p.path,
                hash: p.hash,
                entrypoint: this.isEntrypoint(p.path) ? p.path : undefined,
            })),
            data: dataFiles.map((d) => ({
                path: d.path,
                hash: d.hash,
            })),
            roots: this.extractRoots(policyFiles),
        };
        const bundle = {
            name,
            version,
            policies: policyFiles,
            data: dataFiles,
            manifest,
            created: new Date(),
        };
        // Sign bundle if signing config provided
        if (this.signingConfig) {
            bundle.signature = await this.signBundle(bundle);
        }
        this.bundles.set(`${name}:${version}`, bundle);
        this.emit('bundle_created', {
            name,
            version,
            policiesCount: policies.length,
            dataFilesCount: data.length,
            signed: !!bundle.signature,
        });
        return bundle;
    }
    /**
     * Package bundle as tar.gz file
     */
    async packageBundle(bundle, outputPath) {
        const tempDir = path_1.default.join('/tmp', `bundle-${bundle.name}-${Date.now()}`);
        try {
            // Create temp directory structure
            await promises_1.default.mkdir(tempDir, { recursive: true });
            // Write manifest
            const manifestPath = path_1.default.join(tempDir, '.manifest');
            await promises_1.default.writeFile(manifestPath, JSON.stringify(bundle.manifest, null, 2));
            // Write policies
            for (const policy of bundle.policies) {
                const policyPath = path_1.default.join(tempDir, policy.path);
                await promises_1.default.mkdir(path_1.default.dirname(policyPath), { recursive: true });
                await promises_1.default.writeFile(policyPath, policy.content);
            }
            // Write data files
            for (const dataFile of bundle.data) {
                const dataPath = path_1.default.join(tempDir, dataFile.path);
                await promises_1.default.mkdir(path_1.default.dirname(dataPath), { recursive: true });
                await promises_1.default.writeFile(dataPath, JSON.stringify(dataFile.content, null, 2));
            }
            // Write signature if present
            if (bundle.signature) {
                const signaturePath = path_1.default.join(tempDir, '.signatures.json');
                const signatures = {
                    signatures: [
                        {
                            keyid: this.signingConfig?.keyId || 'default',
                            sig: bundle.signature,
                        },
                    ],
                };
                await promises_1.default.writeFile(signaturePath, JSON.stringify(signatures, null, 2));
            }
            // Create tar.gz archive
            await tar_1.default.create({
                gzip: true,
                file: outputPath,
                cwd: tempDir,
            }, ['.']);
            this.emit('bundle_packaged', {
                name: bundle.name,
                version: bundle.version,
                outputPath,
                size: (await promises_1.default.stat(outputPath)).size,
            });
        }
        finally {
            // Cleanup temp directory
            await promises_1.default.rm(tempDir, { recursive: true, force: true });
        }
    }
    /**
     * Verify and load bundle from file
     */
    async loadBundle(bundlePath) {
        const tempDir = path_1.default.join('/tmp', `verify-${Date.now()}`);
        try {
            // Extract bundle
            await tar_1.default.extract({
                file: bundlePath,
                cwd: tempDir,
            });
            // Load manifest
            const manifestPath = path_1.default.join(tempDir, '.manifest');
            const manifestContent = await promises_1.default.readFile(manifestPath, 'utf-8');
            const manifest = JSON.parse(manifestContent);
            // Load policies
            const policies = [];
            for (const policyInfo of manifest.policies) {
                const policyPath = path_1.default.join(tempDir, policyInfo.path);
                const content = await promises_1.default.readFile(policyPath, 'utf-8');
                const hash = this.calculateHash(content);
                policies.push({
                    path: policyInfo.path,
                    content,
                    hash,
                });
            }
            // Load data files
            const data = [];
            for (const dataInfo of manifest.data) {
                const dataPath = path_1.default.join(tempDir, dataInfo.path);
                const content = JSON.parse(await promises_1.default.readFile(dataPath, 'utf-8'));
                const hash = this.calculateHash(JSON.stringify(content));
                data.push({
                    path: dataInfo.path,
                    content,
                    hash,
                });
            }
            const bundle = {
                name: manifest.metadata.name,
                version: manifest.version,
                policies,
                data,
                manifest,
                created: new Date(manifest.metadata.created),
            };
            // Load and verify signature if present
            let signatureValid = true;
            try {
                const signaturePath = path_1.default.join(tempDir, '.signatures.json');
                const signatureContent = await promises_1.default.readFile(signaturePath, 'utf-8');
                const signatures = JSON.parse(signatureContent);
                if (signatures.signatures && signatures.signatures.length > 0) {
                    bundle.signature = signatures.signatures[0].sig;
                    signatureValid = await this.verifySignature(bundle);
                }
            }
            catch (error) {
                // No signature file or invalid signature
                if (this.signingConfig) {
                    signatureValid = false;
                }
            }
            // Verify manifest integrity
            const manifestValid = await this.verifyManifest(bundle);
            // Verify policy syntax
            const policiesValid = await this.verifyPolicies(bundle.policies);
            const result = {
                valid: signatureValid && manifestValid && policiesValid,
                errors: [],
                bundle,
                signatureValid,
                manifestValid,
                policiesValid,
            };
            if (!signatureValid)
                result.errors.push('Invalid or missing signature');
            if (!manifestValid)
                result.errors.push('Manifest integrity check failed');
            if (!policiesValid)
                result.errors.push('Policy validation failed');
            if (result.valid) {
                this.bundles.set(`${bundle.name}:${bundle.version}`, bundle);
                this.emit('bundle_loaded', {
                    name: bundle.name,
                    version: bundle.version,
                    verified: true,
                });
            }
            return result;
        }
        finally {
            // Cleanup temp directory
            await promises_1.default.rm(tempDir, { recursive: true, force: true });
        }
    }
    /**
     * Get bundle by name and version
     */
    getBundle(name, version) {
        return this.bundles.get(`${name}:${version}`);
    }
    /**
     * List all available bundles
     */
    listBundles() {
        return Array.from(this.bundles.values()).map((bundle) => ({
            name: bundle.name,
            version: bundle.version,
            signed: !!bundle.signature,
            created: bundle.created,
        }));
    }
    /**
     * Update bundle (create new version)
     */
    async updateBundle(name, newVersion, policies, data) {
        // Find latest version of the bundle
        const existingBundles = Array.from(this.bundles.values())
            .filter((b) => b.name === name)
            .sort((a, b) => b.created.getTime() - a.created.getTime());
        const latestBundle = existingBundles[0];
        if (!latestBundle) {
            throw new Error(`Bundle ${name} not found`);
        }
        // Use existing policies/data if not provided
        const updatedPolicies = policies ||
            latestBundle.policies.map((p) => ({
                path: p.path,
                content: p.content,
            }));
        const updatedData = data ||
            latestBundle.data.map((d) => ({
                path: d.path,
                content: d.content,
            }));
        return this.createBundle(name, newVersion, updatedPolicies, updatedData, latestBundle.manifest.metadata);
    }
    async validatePolicies(policies) {
        for (const policy of policies) {
            // Basic Rego syntax validation
            if (!policy.content.includes('package ')) {
                throw new Error(`Policy ${policy.path} missing package declaration`);
            }
            // Additional syntax checks could be added here
            if (policy.content.includes('undefined_rule')) {
                throw new Error(`Policy ${policy.path} contains undefined rule`);
            }
        }
    }
    async verifyPolicies(policies) {
        try {
            for (const policy of policies) {
                // Verify hash
                const calculatedHash = this.calculateHash(policy.content);
                if (calculatedHash !== policy.hash) {
                    return false;
                }
                // Validate syntax
                await this.validatePolicies([
                    {
                        path: policy.path,
                        content: policy.content,
                    },
                ]);
            }
            return true;
        }
        catch (error) {
            return false;
        }
    }
    async verifyManifest(bundle) {
        // Verify all policy hashes
        for (const policyInfo of bundle.manifest.policies) {
            const policy = bundle.policies.find((p) => p.path === policyInfo.path);
            if (!policy || policy.hash !== policyInfo.hash) {
                return false;
            }
        }
        // Verify all data hashes
        for (const dataInfo of bundle.manifest.data) {
            const dataFile = bundle.data.find((d) => d.path === dataInfo.path);
            if (!dataFile || dataFile.hash !== dataInfo.hash) {
                return false;
            }
        }
        return true;
    }
    async signBundle(bundle) {
        if (!this.signingConfig) {
            throw new Error('No signing configuration provided');
        }
        // Create canonical representation for signing
        const canonical = this.createCanonicalBundle(bundle);
        const data = JSON.stringify(canonical);
        switch (this.signingConfig.algorithm) {
            case 'RS256':
                return crypto_1.default
                    .sign('sha256', Buffer.from(data), this.signingConfig.privateKey)
                    .toString('base64');
            case 'ES256':
                return crypto_1.default
                    .sign('sha256', Buffer.from(data), this.signingConfig.privateKey)
                    .toString('base64');
            case 'HS256':
                return crypto_1.default
                    .createHmac('sha256', this.signingConfig.privateKey)
                    .update(data)
                    .digest('base64');
            default:
                throw new Error(`Unsupported signing algorithm: ${this.signingConfig.algorithm}`);
        }
    }
    async verifySignature(bundle) {
        if (!this.signingConfig || !bundle.signature) {
            return false;
        }
        try {
            const canonical = this.createCanonicalBundle(bundle);
            const data = JSON.stringify(canonical);
            const signature = Buffer.from(bundle.signature, 'base64');
            switch (this.signingConfig.algorithm) {
                case 'RS256':
                case 'ES256':
                    return crypto_1.default.verify('sha256', Buffer.from(data), this.signingConfig.publicKey, signature);
                case 'HS256':
                    const expectedSignature = crypto_1.default
                        .createHmac('sha256', this.signingConfig.privateKey)
                        .update(data)
                        .digest('base64');
                    return bundle.signature === expectedSignature;
                default:
                    return false;
            }
        }
        catch (error) {
            return false;
        }
    }
    createCanonicalBundle(bundle) {
        // Create deterministic representation for signing
        return {
            name: bundle.name,
            version: bundle.version,
            manifest: {
                ...bundle.manifest,
                policies: bundle.manifest.policies.sort((a, b) => a.path.localeCompare(b.path)),
                data: bundle.manifest.data.sort((a, b) => a.path.localeCompare(b.path)),
            },
            policies: bundle.policies
                .sort((a, b) => a.path.localeCompare(b.path))
                .map((p) => ({ path: p.path, hash: p.hash })),
            data: bundle.data
                .sort((a, b) => a.path.localeCompare(b.path))
                .map((d) => ({ path: d.path, hash: d.hash })),
        };
    }
    calculateHash(content) {
        return crypto_1.default.createHash('sha256').update(content).digest('hex');
    }
    isEntrypoint(policyPath) {
        // Consider main.rego or policies in root as entrypoints
        return (policyPath === 'main.rego' ||
            (!policyPath.includes('/') && policyPath.endsWith('.rego')));
    }
    extractRoots(policies) {
        const roots = new Set();
        for (const policy of policies) {
            // Extract package name from policy content
            const packageMatch = policy.content.match(/package\s+([a-zA-Z_][a-zA-Z0-9_.]*)/);
            if (packageMatch) {
                const packageName = packageMatch[1];
                const rootPart = packageName.split('.')[0];
                roots.add(rootPart);
            }
        }
        return Array.from(roots).sort();
    }
}
exports.OPABundleManager = OPABundleManager;
// Default ABAC policies for tenant isolation
exports.DEFAULT_ABAC_POLICIES = {
    'authz/main.rego': `
package authz

import future.keywords.if

default allow := false

# Allow if user has required permissions and belongs to correct tenant
allow if {
    user_has_permission
    tenant_matches
    resource_accessible
}

user_has_permission if {
    required_permission := input.action
    user_permissions := data.users[input.user.id].permissions
    required_permission in user_permissions
}

tenant_matches if {
    input.user.tenant_id == input.resource.tenant_id
}

resource_accessible if {
    # Check resource-specific access rules
    input.resource.visibility == "public"
}

resource_accessible if {
    input.resource.visibility == "private"
    input.user.id == input.resource.owner_id
}

# Audit logging
audit_log := {
    "timestamp": time.now_ns(),
    "user": input.user.id,
    "action": input.action,
    "resource": input.resource.id,
    "tenant": input.user.tenant_id,
    "allowed": allow,
    "policy_version": "1.0.0"
}
`,
    'tenant/isolation.rego': `
package tenant.isolation

import future.keywords.if

# Tenant isolation rules
default tenant_isolated := true

# Block cross-tenant access
tenant_isolated := false if {
    input.user.tenant_id != input.resource.tenant_id
    input.resource.visibility != "global"
}

# Allow system admin access
tenant_isolated := true if {
    input.user.role == "system_admin"
}

# Allow shared resources
tenant_isolated := true if {
    input.resource.shared == true
    input.user.tenant_id in input.resource.allowed_tenants
}
`,
    'data/permissions.rego': `
package data.permissions

# Permission definitions
permissions := {
    "read": ["view_data", "export_data"],
    "write": ["create_data", "update_data"],
    "admin": ["read", "write", "delete_data", "manage_users"],
    "super_admin": ["admin", "manage_tenants", "system_config"]
}

# Role mappings
role_permissions := {
    "viewer": ["read"],
    "editor": ["read", "write"],
    "admin": ["read", "write", "admin"],
    "super_admin": ["read", "write", "admin", "super_admin"]
}
`,
};
