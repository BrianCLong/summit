"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MARKETPLACE_SCHEMA = exports.PluginManager = void 0;
const postgres_js_1 = require("../db/postgres.js");
const otel_tracing_js_1 = require("../middleware/observability/otel-tracing.js");
const crypto_1 = require("crypto");
const zod_1 = require("zod");
const child_process_1 = require("child_process");
const util_1 = require("util");
const execAsync = (0, util_1.promisify)(child_process_1.execFile);
const PluginManifestSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(100),
    version: zod_1.z.string().regex(/^\d+\.\d+\.\d+$/),
    author: zod_1.z.string().min(1),
    description: zod_1.z.string().min(10).max(1000),
    signer: zod_1.z.string().min(1),
    scopes: zod_1.z.array(zod_1.z.enum([
        'read',
        'transform',
        'egress:http',
        'egress:domain',
        'exec:container',
        'exec:function',
        'storage:write',
        'auth:impersonate',
    ])),
    sbomHash: zod_1.z.string().regex(/^[a-f0-9]{64}$/i), // SHA-256 hash
    signature: zod_1.z.string().min(1),
    buildProvenance: zod_1.z.object({
        buildType: zod_1.z.string(),
        builder: zod_1.z.string(),
        buildTime: zod_1.z.string(),
        sourceRepo: zod_1.z.string().url(),
        commitHash: zod_1.z.string().regex(/^[a-f0-9]{40}$/i),
    }),
    authorityBinding: zod_1.z
        .object({
        dpia: zod_1.z.boolean(),
        reasonForAccess: zod_1.z.array(zod_1.z.string()),
        retentionClass: zod_1.z.string(),
        piiCategories: zod_1.z.array(zod_1.z.string()),
    })
        .optional(),
});
const RevocationSchema = zod_1.z.object({
    pluginId: zod_1.z.string(),
    reason: zod_1.z.enum(['security', 'policy', 'compliance', 'malware', 'sanctions']),
    scope: zod_1.z.enum(['global', 'tenant', 'signer']),
    affectedVersions: zod_1.z.array(zod_1.z.string()),
    effectiveDate: zod_1.z.string().datetime(),
    details: zod_1.z.string().optional(),
});
class PluginManager {
    trustedSigners = new Set();
    revokedPlugins = new Map();
    exportControlList = new Set();
    constructor() {
        this.initializeTrustedSigners();
        this.loadRevocationFeeds();
        this.loadExportControlList();
    }
    initializeTrustedSigners() {
        // Load from config or environment
        const signers = process.env.TRUSTED_PLUGIN_SIGNERS?.split(',') || [
            'intelgraph-official',
            'verified-partner-tier1',
            'community-verified',
        ];
        signers.forEach((signer) => this.trustedSigners.add(signer));
    }
    async loadRevocationFeeds() {
        // In production, fetch from trusted revocation service
        setInterval(async () => {
            try {
                await this.updateRevocationList();
            }
            catch (error) {
                console.error('Failed to update revocation list:', error);
            }
        }, 60000); // Check every minute
    }
    async loadExportControlList() {
        // Load and update export control restrictions
        const exportControlEntities = [
            // Placeholder for actual export control entities
            'sanctioned-entity-1',
            'restricted-domain.com',
            'blocked-author',
        ];
        exportControlEntities.forEach((entity) => this.exportControlList.add(entity));
    }
    /**
     * Verify and load plugin according to Chair's synthesis
     */
    async verifyAndLoad(manifest, tenantPolicy) {
        const span = otel_tracing_js_1.otelService.createSpan('marketplace.verify-and-load');
        try {
            // Validate manifest schema
            const validatedManifest = PluginManifestSchema.parse(manifest);
            // Check export controls (Starkey's requirement)
            if (this.isExportControlled(manifest)) {
                throw new Error('export-control-violation');
            }
            // Check signer allowlist
            if (!tenantPolicy.allowedSigners.includes(manifest.signer)) {
                throw new Error('signer-denied');
            }
            // Check capability scopes
            const unauthorizedScopes = manifest.scopes.filter((scope) => !tenantPolicy.allowedScopes.includes(scope));
            if (unauthorizedScopes.length > 0) {
                throw new Error(`scope-denied: ${unauthorizedScopes.join(', ')}`);
            }
            // Verify signature and SBOM
            await this.verifySignature(manifest);
            await this.verifySBOM(manifest);
            // Check revocation status
            if (this.isRevoked(manifest)) {
                throw new Error('plugin-revoked');
            }
            // Calculate action risk score
            const riskScore = this.calculateActionRiskScore(manifest, tenantPolicy);
            const requiresApproval = riskScore >= 0.35; // From Chair's OPA policy
            // Authority Binding check (Foster's requirement)
            if (tenantPolicy.requireAuthorityBinding &&
                this.hasHighRiskActions(manifest.scopes)) {
                if (!manifest.authorityBinding?.dpia) {
                    throw new Error('dpia-required');
                }
                if (!manifest.authorityBinding?.reasonForAccess.length) {
                    throw new Error('reason-for-access-required');
                }
            }
            // Store verification audit
            const audit = {
                signer: manifest.signer,
                scopes: manifest.scopes,
                riskScore,
                verificationTime: new Date().toISOString(),
                sbomVerified: true,
                signatureVerified: true,
                exportControlChecked: true,
                authorityBindingPresent: !!manifest.authorityBinding,
            };
            await this.storeVerificationAudit(manifest, audit);
            otel_tracing_js_1.otelService.addSpanAttributes({
                'marketplace.plugin_name': manifest.name,
                'marketplace.plugin_version': manifest.version,
                'marketplace.signer': manifest.signer,
                'marketplace.risk_score': riskScore,
                'marketplace.requires_approval': requiresApproval,
            });
            return { loaded: true, audit, riskScore, requiresApproval };
        }
        catch (error) {
            console.error('Plugin verification failed:', error);
            otel_tracing_js_1.otelService.recordException(error);
            throw error;
        }
        finally {
            span?.end();
        }
    }
    /**
     * Publish plugin to marketplace with Authority Binding checks
     */
    async publishPlugin(manifest, sbomFile, pluginBundle) {
        const span = otel_tracing_js_1.otelService.createSpan('marketplace.publish-plugin');
        try {
            const validatedManifest = PluginManifestSchema.parse(manifest);
            const pool = (0, postgres_js_1.getPostgresPool)();
            const pluginId = `plugin-${manifest.name}-${manifest.version}-${Date.now()}`;
            // Store SBOM and verify hash
            const sbomHash = (0, crypto_1.createHash)('sha256').update(sbomFile).digest('hex');
            if (sbomHash !== manifest.sbomHash) {
                throw new Error('sbom-hash-mismatch');
            }
            // Store plugin data
            await pool.query(`INSERT INTO marketplace_plugins (
          id, name, version, author, description, signer, scopes, sbom_hash,
          signature, build_provenance, authority_binding, plugin_data, sbom_data,
          status, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, now())`, [
                pluginId,
                manifest.name,
                manifest.version,
                manifest.author,
                manifest.description,
                manifest.signer,
                JSON.stringify(manifest.scopes),
                manifest.sbomHash,
                manifest.signature,
                JSON.stringify(manifest.buildProvenance),
                JSON.stringify(manifest.authorityBinding || null),
                pluginBundle,
                sbomFile,
                'pending-review',
            ]);
            // Create review queue entry if needed
            if (this.requiresReview(manifest)) {
                await pool.query(`INSERT INTO plugin_reviews (
            plugin_id, review_type, priority, metadata, created_at
          ) VALUES ($1, $2, $3, $4, now())`, [
                    pluginId,
                    this.getReviewType(manifest),
                    this.getReviewPriority(manifest),
                    JSON.stringify({
                        scopes: manifest.scopes,
                        authorityBinding: manifest.authorityBinding,
                        riskFactors: this.identifyRiskFactors(manifest),
                    }),
                ]);
            }
            return pluginId;
        }
        catch (error) {
            console.error('Plugin publication failed:', error);
            throw error;
        }
        finally {
            span?.end();
        }
    }
    /**
     * Revoke plugin with kill-switch capability
     */
    async revokePlugin(revocation) {
        const span = otel_tracing_js_1.otelService.createSpan('marketplace.revoke-plugin');
        try {
            const validatedRevocation = RevocationSchema.parse(revocation);
            const pool = (0, postgres_js_1.getPostgresPool)();
            // Add to revocation list
            await pool.query(`INSERT INTO plugin_revocations (
          plugin_id, reason, scope, affected_versions, effective_date, details, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, now())`, [
                validatedRevocation.pluginId,
                validatedRevocation.reason,
                validatedRevocation.scope,
                JSON.stringify(validatedRevocation.affectedVersions),
                validatedRevocation.effectiveDate,
                validatedRevocation.details || '',
            ]);
            // Update local revocation cache
            this.revokedPlugins.set(validatedRevocation.pluginId, validatedRevocation);
            // Immediate kill-switch: disable plugin across all tenants if global
            if (validatedRevocation.scope === 'global') {
                await pool.query('UPDATE marketplace_plugins SET status = $1 WHERE id = $2', ['revoked', validatedRevocation.pluginId]);
                // Send revocation notification to all active installations
                await this.notifyPluginRevocation(validatedRevocation);
            }
            // Create audit entry
            await pool.query(`INSERT INTO marketplace_audit (
          action, plugin_id, metadata, created_at
        ) VALUES ($1, $2, $3, now())`, [
                'plugin_revoked',
                validatedRevocation.pluginId,
                JSON.stringify(validatedRevocation),
            ]);
            otel_tracing_js_1.otelService.addSpanAttributes({
                'marketplace.revocation_reason': validatedRevocation.reason,
                'marketplace.revocation_scope': validatedRevocation.scope,
                'marketplace.plugin_id': validatedRevocation.pluginId,
            });
        }
        catch (error) {
            console.error('Plugin revocation failed:', error);
            throw error;
        }
        finally {
            span?.end();
        }
    }
    /**
     * Calculate action risk score per Chair's OPA policy
     */
    calculateActionRiskScore(manifest, tenantPolicy) {
        // Implement Chair's risk formula: sensitivity × blast × reversibility × tenant
        let sensitivity = 0.1; // Base sensitivity
        let blastRadius = 0.1; // Base blast radius
        let reversibility = 0.1; // Base irreversibility (lower is more reversible)
        // Scope-based scoring
        manifest.scopes.forEach((scope) => {
            switch (scope) {
                case 'read':
                    sensitivity += 0.1;
                    break;
                case 'transform':
                    sensitivity += 0.2;
                    blastRadius += 0.1;
                    break;
                case 'egress:http':
                case 'egress:domain':
                    sensitivity += 0.3;
                    blastRadius += 0.2;
                    reversibility += 0.2;
                    break;
                case 'exec:container':
                case 'exec:function':
                    sensitivity += 0.4;
                    blastRadius += 0.3;
                    reversibility += 0.3;
                    break;
                case 'storage:write':
                    sensitivity += 0.3;
                    blastRadius += 0.2;
                    reversibility += 0.4; // Hard to reverse data writes
                    break;
                case 'auth:impersonate':
                    sensitivity += 0.5;
                    blastRadius += 0.4;
                    reversibility += 0.5;
                    break;
            }
        });
        // Authority binding reduces risk
        if (manifest.authorityBinding?.dpia) {
            sensitivity *= 0.9;
        }
        // PII handling increases risk
        if (manifest.authorityBinding?.piiCategories?.length) {
            sensitivity += manifest.authorityBinding.piiCategories.length * 0.1;
        }
        // Tenant posture (simplified - in production, get from tenant config)
        const tenantPosture = tenantPolicy.maxRiskScore / 10; // Normalize to 0-0.1 range
        // Chair's formula
        const riskScore = Math.min(1.0, sensitivity * blastRadius * reversibility * (1 + tenantPosture));
        return riskScore;
    }
    async verifySignature(manifest) {
        // In production, use cosign or similar tool
        try {
            const contentToVerify = this.getSignableContent(manifest);
            const publicKey = await this.getSignerPublicKey(manifest.signer);
            const verifier = (0, crypto_1.createVerify)('RSA-SHA256');
            verifier.update(contentToVerify);
            const isValid = verifier.verify(publicKey, manifest.signature, 'base64');
            if (!isValid) {
                throw new Error('invalid-signature');
            }
        }
        catch (error) {
            console.error('Signature verification failed:', error);
            throw new Error('signature-verification-failed');
        }
    }
    async verifySBOM(manifest) {
        // In production, validate SBOM format and content
        try {
            // Placeholder for SBOM validation
            // Would validate CycloneDX/SPDX format, check for known vulnerabilities, etc.
            if (!manifest.sbomHash || manifest.sbomHash.length !== 64) {
                throw new Error('invalid-sbom-hash');
            }
        }
        catch (error) {
            console.error('SBOM verification failed:', error);
            throw error;
        }
    }
    isExportControlled(manifest) {
        // Check against export control lists
        if (this.exportControlList.has(manifest.author))
            return true;
        if (this.exportControlList.has(manifest.signer))
            return true;
        // Check build provenance
        if (manifest.buildProvenance.sourceRepo) {
            const repoHost = new URL(manifest.buildProvenance.sourceRepo).hostname;
            if (this.exportControlList.has(repoHost))
                return true;
        }
        return false;
    }
    isRevoked(manifest) {
        const pluginKey = `${manifest.name}:${manifest.version}`;
        return this.revokedPlugins.has(pluginKey);
    }
    hasHighRiskActions(scopes) {
        const highRiskScopes = [
            'exec:container',
            'exec:function',
            'auth:impersonate',
            'egress:domain',
        ];
        return scopes.some((scope) => highRiskScopes.includes(scope));
    }
    requiresReview(manifest) {
        // Require review for high-risk plugins or new signers
        return (this.hasHighRiskActions(manifest.scopes) ||
            !this.trustedSigners.has(manifest.signer) ||
            (!!manifest.authorityBinding &&
                manifest.authorityBinding.piiCategories.length > 0));
    }
    getReviewType(manifest) {
        if (this.hasHighRiskActions(manifest.scopes))
            return 'security-review';
        if (!this.trustedSigners.has(manifest.signer))
            return 'signer-verification';
        if (manifest.authorityBinding?.piiCategories?.length)
            return 'privacy-review';
        return 'standard-review';
    }
    getReviewPriority(manifest) {
        const riskScore = this.calculateActionRiskScore(manifest, {
            allowedScopes: manifest.scopes,
            allowedSigners: [manifest.signer],
            requireAuthorityBinding: false,
            highRiskApprovalRequired: false,
            maxRiskScore: 1.0,
        });
        if (riskScore >= 0.7)
            return 'high';
        if (riskScore >= 0.35)
            return 'medium';
        return 'low';
    }
    identifyRiskFactors(manifest) {
        const riskFactors = [];
        if (manifest.scopes.includes('exec:container'))
            riskFactors.push('container-execution');
        if (manifest.scopes.includes('auth:impersonate'))
            riskFactors.push('privilege-escalation');
        if (manifest.scopes.some((s) => s.startsWith('egress:')))
            riskFactors.push('data-exfiltration');
        if (manifest.authorityBinding?.piiCategories?.length)
            riskFactors.push('pii-processing');
        if (!this.trustedSigners.has(manifest.signer))
            riskFactors.push('untrusted-signer');
        return riskFactors;
    }
    getSignableContent(manifest) {
        // Create deterministic content for signature verification
        return `${manifest.name}:${manifest.version}:${manifest.sbomHash}:${manifest.scopes.sort().join(',')}`;
    }
    async getSignerPublicKey(signer) {
        // In production, fetch from trusted key registry
        // For now, use placeholder
        return `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...
-----END PUBLIC KEY-----`;
    }
    async updateRevocationList() {
        // Fetch latest revocations from trusted feed
        try {
            // In production, fetch from official revocation service
            const pool = (0, postgres_js_1.getPostgresPool)();
            const result = await pool.query("SELECT plugin_id, reason, scope FROM plugin_revocations WHERE created_at > now() - interval '1 hour'");
            result.rows.forEach((row) => {
                this.revokedPlugins.set(row.plugin_id, row);
            });
        }
        catch (error) {
            console.error('Failed to update revocation list:', error);
        }
    }
    async notifyPluginRevocation(revocation) {
        // Send notifications to all tenants with active installations
        const pool = (0, postgres_js_1.getPostgresPool)();
        await pool.query(`INSERT INTO plugin_notifications (
        plugin_id, notification_type, message, created_at
      ) VALUES ($1, $2, $3, now())`, [
            revocation.pluginId,
            'revocation',
            `Plugin ${revocation.pluginId} has been revoked due to: ${revocation.reason}`,
        ]);
    }
    async storeVerificationAudit(manifest, audit) {
        const pool = (0, postgres_js_1.getPostgresPool)();
        await pool.query(`INSERT INTO plugin_verification_audit (
        plugin_id, plugin_name, plugin_version, signer, verification_result, created_at
      ) VALUES ($1, $2, $3, $4, $5, now())`, [
            `${manifest.name}-${manifest.version}`,
            manifest.name,
            manifest.version,
            manifest.signer,
            JSON.stringify(audit),
        ]);
    }
}
exports.PluginManager = PluginManager;
// Database schema for marketplace
exports.MARKETPLACE_SCHEMA = `
CREATE TABLE IF NOT EXISTS marketplace_plugins (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  version TEXT NOT NULL,
  author TEXT NOT NULL,
  description TEXT NOT NULL,
  signer TEXT NOT NULL,
  scopes JSONB NOT NULL,
  sbom_hash TEXT NOT NULL,
  signature TEXT NOT NULL,
  build_provenance JSONB NOT NULL,
  authority_binding JSONB,
  plugin_data BYTEA NOT NULL,
  sbom_data BYTEA NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending-review', 'approved', 'rejected', 'revoked')),
  downloads INTEGER DEFAULT 0,
  rating DECIMAL(3,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS plugin_reviews (
  id SERIAL PRIMARY KEY,
  plugin_id TEXT NOT NULL,
  review_type TEXT NOT NULL,
  priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in-progress', 'completed')),
  reviewer TEXT,
  notes TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS plugin_revocations (
  id SERIAL PRIMARY KEY,
  plugin_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  scope TEXT NOT NULL CHECK (scope IN ('global', 'tenant', 'signer')),
  affected_versions JSONB NOT NULL,
  effective_date TIMESTAMP NOT NULL,
  details TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS plugin_installations (
  id SERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  plugin_id TEXT NOT NULL,
  installed_version TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled', 'revoked')),
  configuration JSONB,
  installed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_used_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS plugin_notifications (
  id SERIAL PRIMARY KEY,
  plugin_id TEXT NOT NULL,
  notification_type TEXT NOT NULL,
  message TEXT NOT NULL,
  acknowledged BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS plugin_verification_audit (
  id SERIAL PRIMARY KEY,
  plugin_id TEXT NOT NULL,
  plugin_name TEXT NOT NULL,
  plugin_version TEXT NOT NULL,
  signer TEXT NOT NULL,
  verification_result JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS marketplace_audit (
  id SERIAL PRIMARY KEY,
  action TEXT NOT NULL,
  plugin_id TEXT,
  tenant_id TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_marketplace_plugins_name_version ON marketplace_plugins(name, version);
CREATE INDEX IF NOT EXISTS idx_marketplace_plugins_signer ON marketplace_plugins(signer);
CREATE INDEX IF NOT EXISTS idx_plugin_reviews_status ON plugin_reviews(status);
CREATE INDEX IF NOT EXISTS idx_plugin_revocations_plugin_id ON plugin_revocations(plugin_id);
CREATE INDEX IF NOT EXISTS idx_plugin_installations_tenant ON plugin_installations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_plugin_verification_audit_plugin ON plugin_verification_audit(plugin_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_audit_plugin ON marketplace_audit(plugin_id);
`;
exports.default = PluginManager;
