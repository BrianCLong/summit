"use strict";
// @ts-nocheck
/**
 * IntelGraph GA-Core Provenance Ledger Service
 * Committee Requirements: Hash manifests, immutable disclosure bundles, claim constraints
 * Addresses Starkey dissent: verifiable export manifests with chain of custody
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProvenanceLedgerService = void 0;
const crypto_1 = __importDefault(require("crypto"));
const timescale_js_1 = require("../db/timescale.js");
const logger_js_1 = __importDefault(require("../utils/logger.js"));
class ProvenanceLedgerService {
    static instance;
    static getInstance() {
        if (!ProvenanceLedgerService.instance) {
            ProvenanceLedgerService.instance = new ProvenanceLedgerService();
        }
        return ProvenanceLedgerService.instance;
    }
    // Committee requirement: Content hashing for integrity
    generateContentHash(content) {
        const normalizedContent = JSON.stringify(content, Object.keys(content).sort());
        return crypto_1.default
            .createHash('sha256')
            .update(normalizedContent, 'utf8')
            .digest('hex');
    }
    // Committee requirement: Cryptographic signatures for immutability
    generateSignature(data, privateKey) {
        // In production, use actual cryptographic signing
        const content = JSON.stringify(data, Object.keys(data).sort());
        const hmac = crypto_1.default.createHmac('sha256', privateKey || process.env.LEDGER_SIGNING_KEY || 'default-key');
        return hmac.update(content).digest('hex');
    }
    // Starkey dissent requirement: Immutable provenance chain recording
    async recordProvenanceEntry(entry) {
        const id = crypto_1.default.randomUUID();
        const timestamp = new Date();
        const content_hash = this.generateContentHash({ ...entry, timestamp });
        const signature = this.generateSignature({
            id,
            content_hash,
            ...entry,
            timestamp,
        });
        const provenanceEntry = {
            id,
            content_hash,
            timestamp,
            signature,
            ...entry,
        };
        try {
            // Store in TimescaleDB for temporal analysis
            await (0, timescale_js_1.query)(`
        INSERT INTO provenance_chain (
          id, parent_hash, content_hash, operation_type, actor_id, 
          timestamp, metadata, signature
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
                id,
                entry.parent_hash,
                content_hash,
                entry.operation_type,
                entry.actor_id,
                timestamp,
                JSON.stringify(entry.metadata),
                signature,
            ]);
            logger_js_1.default.info({
                message: 'Provenance entry recorded',
                provenance_id: id,
                operation_type: entry.operation_type,
                actor_id: entry.actor_id,
                content_hash,
            });
            return id;
        }
        catch (error) {
            logger_js_1.default.error({
                message: 'Failed to record provenance entry',
                error: error instanceof Error ? error.message : String(error),
                operation_type: entry.operation_type,
            });
            throw new Error('Provenance recording failed');
        }
    }
    // Committee requirement: Claim registration with hash verification
    async registerClaim(claimData) {
        const id = crypto_1.default.randomUUID();
        const content_hash = this.generateContentHash(claimData.content);
        const created_at = new Date();
        const claim = {
            id,
            content_hash,
            created_at,
            ...claimData,
        };
        try {
            // Store claim in TimescaleDB
            await (0, timescale_js_1.query)(`
        INSERT INTO claims_registry (
          id, content_hash, content, confidence, evidence_hashes,
          created_at, created_by, investigation_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
                id,
                content_hash,
                claimData.content,
                claimData.confidence,
                JSON.stringify(claimData.evidence_hashes),
                created_at,
                claimData.created_by,
                claimData.investigation_id,
            ]);
            // Record provenance entry
            await this.recordProvenanceEntry({
                operation_type: 'CLAIM_REGISTERED',
                actor_id: claimData.created_by,
                metadata: {
                    claim_id: id,
                    claim_hash: content_hash,
                    confidence: claimData.confidence,
                    evidence_count: claimData.evidence_hashes.length,
                },
            });
            logger_js_1.default.info({
                message: 'Claim registered in provenance ledger',
                claim_id: id,
                content_hash,
                created_by: claimData.created_by,
            });
            return claim;
        }
        catch (error) {
            logger_js_1.default.error({
                message: 'Failed to register claim',
                error: error instanceof Error ? error.message : String(error),
            });
            throw new Error('Claim registration failed');
        }
    }
    // Starkey dissent requirement: Export manifest creation
    async createExportManifest(manifestData) {
        const manifest_id = crypto_1.default.randomUUID();
        const manifest_hash = this.generateContentHash(manifestData);
        const manifest = {
            manifest_id,
            manifest_hash,
            ...manifestData,
        };
        try {
            // Store manifest
            await (0, timescale_js_1.query)(`
        INSERT INTO export_manifests (
          manifest_id, manifest_hash, export_type, data_sources,
          transformation_chain, authority_basis, classification_level,
          retention_policy, chain_of_custody
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [
                manifest_id,
                manifest_hash,
                manifestData.export_type,
                JSON.stringify(manifestData.data_sources),
                JSON.stringify(manifestData.transformation_chain),
                JSON.stringify(manifestData.authority_basis),
                manifestData.classification_level,
                manifestData.retention_policy,
                JSON.stringify(manifestData.chain_of_custody),
            ]);
            // Record in provenance chain
            await this.recordProvenanceEntry({
                operation_type: 'EXPORT_MANIFEST_CREATED',
                actor_id: manifestData.chain_of_custody[0]?.actor_id || 'system',
                metadata: {
                    manifest_id,
                    export_type: manifestData.export_type,
                    data_source_count: manifestData.data_sources.length,
                },
            });
            return manifest;
        }
        catch (error) {
            logger_js_1.default.error({
                message: 'Failed to create export manifest',
                error: error instanceof Error ? error.message : String(error),
            });
            throw new Error('Export manifest creation failed');
        }
    }
    // Committee requirement: Immutable disclosure bundle creation
    async createDisclosureBundle(bundleData) {
        const bundle_id = crypto_1.default.randomUUID();
        const created_at = new Date();
        // Create export manifest
        const export_manifest = await this.createExportManifest({
            export_type: bundleData.export_type,
            data_sources: bundleData.claims.map((c) => c.id),
            transformation_chain: ['claim_aggregation', 'evidence_correlation'],
            authority_basis: bundleData.authority_basis,
            classification_level: bundleData.classification_level,
            retention_policy: 'REGULATORY_STANDARD',
            chain_of_custody: [
                {
                    actor_id: bundleData.actor_id,
                    action: 'BUNDLE_CREATED',
                    timestamp: created_at,
                    signature: this.generateSignature({ bundle_id, created_at }),
                    justification: 'Disclosure bundle creation with immutable seal',
                },
            ],
        });
        // Get provenance chain for all claims
        const provenance_chain = await this.getProvenanceChain(bundleData.claims.map((c) => c.id));
        // Create bundle hash
        const bundle_content = {
            bundle_id,
            claims: bundleData.claims,
            evidence_references: bundleData.evidence_references,
            export_manifest,
            created_at,
        };
        const bundle_hash = this.generateContentHash(bundle_content);
        // Generate immutable seal (Starkey dissent requirement)
        const immutable_seal = this.generateSignature({
            bundle_hash,
            manifest_hash: export_manifest.manifest_hash,
            claim_hashes: bundleData.claims.map((c) => c.content_hash),
            timestamp: created_at,
        });
        const disclosure_bundle = {
            bundle_id,
            bundle_hash,
            claims: bundleData.claims,
            evidence_references: bundleData.evidence_references,
            provenance_chain,
            export_manifest,
            created_at,
            immutable_seal,
        };
        try {
            // Store disclosure bundle
            await (0, timescale_js_1.query)(`
        INSERT INTO disclosure_bundles (
          bundle_id, bundle_hash, claims, evidence_references,
          provenance_chain, export_manifest, created_at, immutable_seal
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
                bundle_id,
                bundle_hash,
                JSON.stringify(bundleData.claims),
                JSON.stringify(bundleData.evidence_references),
                JSON.stringify(provenance_chain),
                JSON.stringify(export_manifest),
                created_at,
                immutable_seal,
            ]);
            // Final provenance entry
            await this.recordProvenanceEntry({
                operation_type: 'DISCLOSURE_BUNDLE_SEALED',
                actor_id: bundleData.actor_id,
                metadata: {
                    bundle_id,
                    bundle_hash,
                    claim_count: bundleData.claims.length,
                    immutable_seal,
                },
            });
            logger_js_1.default.info({
                message: 'Immutable disclosure bundle created - Starkey dissent compliance',
                bundle_id,
                bundle_hash,
                immutable_seal,
            });
            return disclosure_bundle;
        }
        catch (error) {
            logger_js_1.default.error({
                message: 'Failed to create disclosure bundle',
                error: error instanceof Error ? error.message : String(error),
            });
            throw new Error('Disclosure bundle creation failed');
        }
    }
    // Committee requirement: Provenance chain verification
    async verifyProvenanceChain(entityIds) {
        const errors = [];
        try {
            for (const entityId of entityIds) {
                const result = await (0, timescale_js_1.query)(`
          SELECT * FROM provenance_chain 
          WHERE metadata::jsonb ->> 'claim_id' = $1
          ORDER BY timestamp ASC
        `, [entityId]);
                if (result.rows.length === 0) {
                    errors.push(`No provenance chain found for entity ${entityId}`);
                    continue;
                }
                // Verify chain integrity
                for (const row of result.rows) {
                    const expected_hash = this.generateContentHash({
                        operation_type: row.operation_type,
                        actor_id: row.actor_id,
                        metadata: row.metadata,
                        timestamp: row.timestamp,
                    });
                    if (row.content_hash !== expected_hash) {
                        errors.push(`Hash mismatch in provenance chain for ${entityId}`);
                    }
                }
            }
            return {
                valid: errors.length === 0,
                errors,
            };
        }
        catch (error) {
            logger_js_1.default.error({
                message: 'Provenance chain verification failed',
                error: error instanceof Error ? error.message : String(error),
            });
            return {
                valid: false,
                errors: ['Verification process failed'],
            };
        }
    }
    // Helper method to get provenance chain
    async getProvenanceChain(entityIds) {
        const placeholders = entityIds.map((_, i) => `$${i + 1}`).join(', ');
        const result = await (0, timescale_js_1.query)(`
      SELECT * FROM provenance_chain
      WHERE metadata::jsonb ->> 'claim_id' IN (${placeholders})
      ORDER BY timestamp ASC
    `, entityIds);
        return result.rows.map((row) => ({
            id: row.id,
            parent_hash: row.parent_hash,
            content_hash: row.content_hash,
            operation_type: row.operation_type,
            actor_id: row.actor_id,
            timestamp: row.timestamp,
            metadata: row.metadata,
            signature: row.signature,
        }));
    }
    // Committee requirement: Audit trail queries
    async getAuditTrail(filters) {
        let whereClause = '1=1';
        const params = [];
        if (filters.actor_id) {
            params.push(filters.actor_id);
            whereClause += ` AND actor_id = $${params.length}`;
        }
        if (filters.operation_type) {
            params.push(filters.operation_type);
            whereClause += ` AND operation_type = $${params.length}`;
        }
        if (filters.time_range) {
            params.push(filters.time_range.start, filters.time_range.end);
            whereClause += ` AND timestamp BETWEEN $${params.length - 1} AND $${params.length}`;
        }
        const result = await (0, timescale_js_1.query)(`
      SELECT * FROM provenance_chain 
      WHERE ${whereClause}
      ORDER BY timestamp DESC
      LIMIT 1000
    `, params);
        return result.rows.map((row) => ({
            id: row.id,
            parent_hash: row.parent_hash,
            content_hash: row.content_hash,
            operation_type: row.operation_type,
            actor_id: row.actor_id,
            timestamp: row.timestamp,
            metadata: row.metadata,
            signature: row.signature,
        }));
    }
}
exports.ProvenanceLedgerService = ProvenanceLedgerService;
exports.default = ProvenanceLedgerService;
