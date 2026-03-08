"use strict";
/**
 * Provenance Ledger Beta Service
 * Unified service for source tracking, transform chains, evidence registration,
 * claim management, and verifiable export manifests with Merkle trees
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProvenanceLedgerBetaService = void 0;
const crypto_1 = __importDefault(require("crypto"));
const timescale_js_1 = require("../db/timescale.js");
const logger_js_1 = __importDefault(require("../utils/logger.js"));
const merkle_tree_js_1 = require("../utils/merkle-tree.js");
class ProvenanceLedgerBetaService {
    static instance;
    signingKey;
    constructor() {
        this.signingKey =
            process.env.LEDGER_SIGNING_KEY || crypto_1.default.randomBytes(32).toString('hex');
    }
    static getInstance() {
        if (!ProvenanceLedgerBetaService.instance) {
            ProvenanceLedgerBetaService.instance =
                new ProvenanceLedgerBetaService();
        }
        return ProvenanceLedgerBetaService.instance;
    }
    // ============================================================================
    // LICENSE MANAGEMENT
    // ============================================================================
    async createLicense(input) {
        const id = `license-${crypto_1.default.randomUUID()}`;
        const now = new Date();
        try {
            await (0, timescale_js_1.query)(`
        INSERT INTO licenses (
          id, license_type, license_terms, restrictions,
          attribution_required, expiration_date, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
                id,
                input.license_type,
                input.license_terms || null,
                input.restrictions || [],
                input.attribution_required ?? true,
                input.expiration_date || null,
                now,
                now,
            ]);
            logger_js_1.default.info({
                message: 'License created',
                license_id: id,
                license_type: input.license_type,
            });
            return {
                id,
                ...input,
                restrictions: input.restrictions || [],
                attribution_required: input.attribution_required ?? true,
                created_at: now,
                updated_at: now,
            };
        }
        catch (error) {
            logger_js_1.default.error({
                message: 'Failed to create license',
                error: error instanceof Error ? error.message : String(error),
            });
            throw new Error('License creation failed');
        }
    }
    async getLicense(licenseId) {
        const result = await (0, timescale_js_1.query)('SELECT * FROM licenses WHERE id = $1', [licenseId]);
        if (result.rows.length === 0) {
            return null;
        }
        return result.rows[0];
    }
    // ============================================================================
    // SOURCE MANAGEMENT
    // ============================================================================
    async registerSource(input) {
        const id = `source-${crypto_1.default.randomUUID()}`;
        const now = new Date();
        try {
            await (0, timescale_js_1.query)(`
        INSERT INTO sources (
          id, source_hash, source_type, origin_url, ingestion_timestamp,
          metadata, license_id, custody_chain, retention_policy,
          created_by, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `, [
                id,
                input.source_hash,
                input.source_type,
                input.origin_url || null,
                now,
                JSON.stringify(input.metadata || {}),
                input.license_id,
                [input.created_by],
                input.retention_policy || 'STANDARD',
                input.created_by,
                now,
            ]);
            // Record in provenance chain
            await this.recordProvenanceEntry({
                operation_type: 'SOURCE_REGISTERED',
                actor_id: input.created_by,
                metadata: {
                    source_id: id,
                    source_hash: input.source_hash,
                    source_type: input.source_type,
                },
            });
            logger_js_1.default.info({
                message: 'Source registered',
                source_id: id,
                source_hash: input.source_hash,
                source_type: input.source_type,
            });
            return {
                id,
                ingestion_timestamp: now,
                custody_chain: [input.created_by],
                created_at: now,
                metadata: input.metadata || {},
                ...input,
            };
        }
        catch (error) {
            logger_js_1.default.error({
                message: 'Failed to register source',
                error: error instanceof Error ? error.message : String(error),
            });
            throw new Error('Source registration failed');
        }
    }
    async getSource(sourceId) {
        const result = await (0, timescale_js_1.query)('SELECT * FROM sources WHERE id = $1', [sourceId]);
        if (result.rows.length === 0) {
            return null;
        }
        const row = result.rows[0];
        return {
            ...row,
            metadata: row.metadata,
        };
    }
    // ============================================================================
    // TRANSFORM MANAGEMENT
    // ============================================================================
    async registerTransform(input) {
        const id = `transform-${crypto_1.default.randomUUID()}`;
        const now = new Date();
        try {
            await (0, timescale_js_1.query)(`
        INSERT INTO transforms (
          id, transform_type, input_hash, output_hash, algorithm, version,
          parameters, execution_timestamp, duration_ms, executed_by,
          confidence, parent_transforms, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      `, [
                id,
                input.transform_type,
                input.input_hash,
                input.output_hash,
                input.algorithm,
                input.version,
                JSON.stringify(input.parameters || {}),
                now,
                input.duration_ms,
                input.executed_by,
                input.confidence || null,
                input.parent_transforms || [],
                now,
            ]);
            // Record in provenance chain
            await this.recordProvenanceEntry({
                operation_type: 'TRANSFORM_EXECUTED',
                actor_id: input.executed_by,
                metadata: {
                    transform_id: id,
                    transform_type: input.transform_type,
                    algorithm: input.algorithm,
                    input_hash: input.input_hash,
                    output_hash: input.output_hash,
                },
            });
            logger_js_1.default.info({
                message: 'Transform registered',
                transform_id: id,
                transform_type: input.transform_type,
                algorithm: input.algorithm,
            });
            return {
                id,
                execution_timestamp: now,
                parameters: input.parameters || {},
                parent_transforms: input.parent_transforms || [],
                created_at: now,
                ...input,
            };
        }
        catch (error) {
            logger_js_1.default.error({
                message: 'Failed to register transform',
                error: error instanceof Error ? error.message : String(error),
            });
            throw new Error('Transform registration failed');
        }
    }
    async getTransform(transformId) {
        const result = await (0, timescale_js_1.query)('SELECT * FROM transforms WHERE id = $1', [transformId]);
        if (result.rows.length === 0) {
            return null;
        }
        return result.rows[0];
    }
    async getTransformChain(transformIds) {
        if (transformIds.length === 0) {
            return [];
        }
        const placeholders = transformIds.map((_, i) => `$${i + 1}`).join(', ');
        const result = await (0, timescale_js_1.query)(`SELECT * FROM transforms WHERE id IN (${placeholders}) ORDER BY execution_timestamp ASC`, transformIds);
        return result.rows;
    }
    // ============================================================================
    // EVIDENCE MANAGEMENT
    // ============================================================================
    async registerEvidence(input) {
        const id = `evidence-${crypto_1.default.randomUUID()}`;
        const now = new Date();
        try {
            await (0, timescale_js_1.query)(`
        INSERT INTO evidence_artifacts (
          id, sha256, artifact_type, storage_uri, source_id, transform_chain,
          license_id, classification_level, content_preview, registered_by,
          created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `, [
                id,
                input.evidence_hash,
                input.evidence_type,
                input.storage_uri,
                input.source_id,
                input.transform_chain,
                input.license_id,
                input.classification_level || 'INTERNAL',
                input.content_preview || null,
                input.registered_by,
                now,
            ]);
            // Record in provenance chain
            await this.recordProvenanceEntry({
                operation_type: 'EVIDENCE_REGISTERED',
                actor_id: input.registered_by,
                metadata: {
                    evidence_id: id,
                    evidence_hash: input.evidence_hash,
                    evidence_type: input.evidence_type,
                    source_id: input.source_id,
                    transform_count: input.transform_chain.length,
                },
            });
            logger_js_1.default.info({
                message: 'Evidence registered',
                evidence_id: id,
                evidence_hash: input.evidence_hash,
                source_id: input.source_id,
            });
            return {
                id,
                collected_at: now,
                classification_level: input.classification_level || 'INTERNAL',
                metadata: input.metadata || {},
                ...input,
            };
        }
        catch (error) {
            logger_js_1.default.error({
                message: 'Failed to register evidence',
                error: error instanceof Error ? error.message : String(error),
            });
            throw new Error('Evidence registration failed');
        }
    }
    async getEvidence(evidenceId) {
        const result = await (0, timescale_js_1.query)('SELECT * FROM evidence_artifacts WHERE id = $1', [evidenceId]);
        if (result.rows.length === 0) {
            return null;
        }
        return result.rows[0];
    }
    // ============================================================================
    // CLAIM MANAGEMENT
    // ============================================================================
    async registerClaim(input) {
        const id = `claim-${crypto_1.default.randomUUID()}`;
        const content_hash = this.computeHash(input.content);
        const now = new Date();
        try {
            await (0, timescale_js_1.query)(`
        INSERT INTO claims_registry (
          id, content_hash, content, claim_type, confidence, evidence_hashes,
          created_at, created_by, investigation_id, source_id, transform_chain,
          license_id, contradicts, corroborates, extracted_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      `, [
                id,
                content_hash,
                input.content,
                input.claim_type,
                input.confidence,
                JSON.stringify(input.evidence_ids),
                now,
                input.created_by,
                input.investigation_id || null,
                input.source_id,
                input.transform_chain,
                input.license_id,
                input.contradicts || [],
                input.corroborates || [],
                now,
            ]);
            // Record in provenance chain
            await this.recordProvenanceEntry({
                operation_type: 'CLAIM_REGISTERED',
                actor_id: input.created_by,
                metadata: {
                    claim_id: id,
                    content_hash,
                    claim_type: input.claim_type,
                    confidence: input.confidence,
                    evidence_count: input.evidence_ids.length,
                },
            });
            logger_js_1.default.info({
                message: 'Claim registered',
                claim_id: id,
                content_hash,
                claim_type: input.claim_type,
            });
            return {
                id,
                content_hash,
                extracted_at: now,
                created_at: now,
                // evidence_ids: input.evidence_ids,
                contradicts: input.contradicts || [],
                corroborates: input.corroborates || [],
                ...input,
            };
        }
        catch (error) {
            logger_js_1.default.error({
                message: 'Failed to register claim',
                error: error instanceof Error ? error.message : String(error),
            });
            throw new Error('Claim registration failed');
        }
    }
    async getClaim(claimId) {
        const result = await (0, timescale_js_1.query)('SELECT * FROM claims_registry WHERE id = $1', [claimId]);
        if (result.rows.length === 0) {
            return null;
        }
        const row = result.rows[0];
        return {
            ...row,
            evidence_ids: Array.isArray(row.evidence_hashes)
                ? row.evidence_hashes
                : JSON.parse(row.evidence_hashes || '[]'),
        };
    }
    async queryClaims(filters) {
        let whereClause = '1=1';
        const params = [];
        if (filters.investigation_id) {
            params.push(filters.investigation_id);
            whereClause += ` AND investigation_id = $${params.length}`;
        }
        if (filters.created_by) {
            params.push(filters.created_by);
            whereClause += ` AND created_by = $${params.length}`;
        }
        if (filters.claim_type) {
            params.push(filters.claim_type);
            whereClause += ` AND claim_type = $${params.length}`;
        }
        if (filters.confidence_min !== undefined) {
            params.push(filters.confidence_min);
            whereClause += ` AND confidence >= $${params.length}`;
        }
        if (filters.confidence_max !== undefined) {
            params.push(filters.confidence_max);
            whereClause += ` AND confidence <= $${params.length}`;
        }
        if (filters.source_id) {
            params.push(filters.source_id);
            whereClause += ` AND source_id = $${params.length}`;
        }
        if (filters.time_range) {
            params.push(filters.time_range.start, filters.time_range.end);
            whereClause += ` AND created_at BETWEEN $${params.length - 1} AND $${params.length}`;
        }
        const result = await (0, timescale_js_1.query)(`SELECT * FROM claims_registry WHERE ${whereClause} ORDER BY created_at DESC LIMIT 1000`, params);
        return result.rows.map((row) => ({
            ...row,
            evidence_ids: Array.isArray(row.evidence_hashes)
                ? row.evidence_hashes
                : JSON.parse(row.evidence_hashes || '[]'),
        }));
    }
    // ============================================================================
    // CLAIM-EVIDENCE LINK MANAGEMENT
    // ============================================================================
    async linkClaimToEvidence(input) {
        const id = `link-${crypto_1.default.randomUUID()}`;
        const now = new Date();
        try {
            // Verify claim and evidence exist
            const claim = await this.getClaim(input.claim_id);
            if (!claim) {
                throw new Error(`Claim ${input.claim_id} not found`);
            }
            const evidence = await this.getEvidence(input.evidence_id);
            if (!evidence) {
                throw new Error(`Evidence ${input.evidence_id} not found`);
            }
            await (0, timescale_js_1.query)(`
        INSERT INTO claim_evidence_links (
          id, claim_id, evidence_id, relation_type, confidence,
          created_by, created_at, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
                id,
                input.claim_id,
                input.evidence_id,
                input.relation_type,
                input.confidence || null,
                input.created_by,
                now,
                input.notes || null,
            ]);
            // Record in provenance chain
            await this.recordProvenanceEntry({
                operation_type: 'CLAIM_EVIDENCE_LINK_CREATED',
                actor_id: input.created_by,
                metadata: {
                    link_id: id,
                    claim_id: input.claim_id,
                    evidence_id: input.evidence_id,
                    relation_type: input.relation_type,
                },
            });
            logger_js_1.default.info({
                message: 'Claim-evidence link created',
                link_id: id,
                claim_id: input.claim_id,
                evidence_id: input.evidence_id,
                relation_type: input.relation_type,
            });
            return {
                id,
                created_at: now,
                ...input,
            };
        }
        catch (error) {
            logger_js_1.default.error({
                message: 'Failed to create claim-evidence link',
                error: error instanceof Error ? error.message : String(error),
            });
            throw new Error('Claim-evidence link creation failed');
        }
    }
    async getClaimEvidenceLinks(claimId) {
        const result = await (0, timescale_js_1.query)('SELECT * FROM claim_evidence_links WHERE claim_id = $1 ORDER BY created_at DESC', [claimId]);
        return result.rows;
    }
    async getEvidenceClaimLinks(evidenceId) {
        const result = await (0, timescale_js_1.query)('SELECT * FROM claim_evidence_links WHERE evidence_id = $1 ORDER BY created_at DESC', [evidenceId]);
        return result.rows;
    }
    // ============================================================================
    // PROVENANCE CHAIN
    // ============================================================================
    async getLastAuditHash() {
        try {
            const result = await (0, timescale_js_1.query)(`SELECT content_hash FROM provenance_chain
         ORDER BY timestamp DESC, id DESC
         LIMIT 1`, []);
            if (result.rows.length === 0) {
                return null;
            }
            return result.rows[0].content_hash;
        }
        catch (error) {
            logger_js_1.default.error({
                message: 'Failed to get last audit hash',
                error: error instanceof Error ? error.message : String(error),
            });
            return null;
        }
    }
    async recordProvenanceEntry(entry) {
        const id = crypto_1.default.randomUUID();
        const timestamp = new Date();
        // Get the previous hash for chaining
        const prevHash = await this.getLastAuditHash();
        // Compute content hash including previous hash for chain integrity
        const content_hash = this.computeHash({
            ...entry,
            timestamp,
            prev_hash: prevHash,
        });
        const signature = this.generateSignature({
            id,
            content_hash,
            prev_hash: prevHash,
            ...entry,
            timestamp,
        });
        await (0, timescale_js_1.query)(`
      INSERT INTO provenance_chain (
        id, parent_hash, content_hash, operation_type, actor_id,
        timestamp, metadata, signature
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [
            id,
            prevHash || null,
            content_hash,
            entry.operation_type,
            entry.actor_id,
            timestamp,
            JSON.stringify({ ...entry.metadata, prev_hash: prevHash }),
            signature,
        ]);
        return id;
    }
    async verifyAuditChain(options) {
        try {
            let query = `
        SELECT id, parent_hash, content_hash, operation_type, actor_id,
               timestamp, metadata, signature
        FROM provenance_chain
        WHERE 1=1
      `;
            const params = [];
            if (options?.startDate) {
                params.push(options.startDate);
                query += ` AND timestamp >= $${params.length}`;
            }
            if (options?.endDate) {
                params.push(options.endDate);
                query += ` AND timestamp <= $${params.length}`;
            }
            query += ` ORDER BY timestamp ASC, id ASC`;
            if (options?.limit) {
                params.push(options.limit);
                query += ` LIMIT $${params.length}`;
            }
            const result = await (0, timescale_js_1.query)(query, params);
            const records = result.rows;
            if (records.length === 0) {
                return {
                    valid: true,
                    totalRecords: 0,
                    verifiedRecords: 0,
                    errors: [],
                };
            }
            let previousHash = null;
            let verifiedCount = 0;
            const errors = [];
            let brokenAt;
            for (const record of records) {
                // Check that parent_hash matches the previous record's content_hash
                if (previousHash !== null && record.parent_hash !== previousHash) {
                    errors.push({
                        recordId: record.id,
                        error: `Hash chain broken: expected parent_hash=${previousHash}, got ${record.parent_hash}`,
                    });
                    if (!brokenAt) {
                        brokenAt = record.id;
                    }
                }
                else {
                    // Recompute the content hash to verify integrity
                    const metadata = typeof record.metadata === 'string'
                        ? JSON.parse(record.metadata)
                        : record.metadata;
                    const expectedHash = this.computeHash({
                        operation_type: record.operation_type,
                        actor_id: record.actor_id,
                        metadata: {
                            ...metadata,
                        },
                        timestamp: record.timestamp,
                        prev_hash: record.parent_hash,
                    });
                    if (expectedHash !== record.content_hash) {
                        errors.push({
                            recordId: record.id,
                            error: `Content hash mismatch: expected ${expectedHash}, got ${record.content_hash}`,
                        });
                        if (!brokenAt) {
                            brokenAt = record.id;
                        }
                    }
                    else {
                        verifiedCount++;
                    }
                }
                previousHash = record.content_hash;
            }
            const valid = errors.length === 0;
            logger_js_1.default.info({
                message: 'Audit chain verification completed',
                valid,
                totalRecords: records.length,
                verifiedRecords: verifiedCount,
                errorCount: errors.length,
            });
            return {
                valid,
                totalRecords: records.length,
                verifiedRecords: verifiedCount,
                brokenAt,
                errors,
            };
        }
        catch (error) {
            logger_js_1.default.error({
                message: 'Failed to verify audit chain',
                error: error instanceof Error ? error.message : String(error),
            });
            throw new Error('Audit chain verification failed');
        }
    }
    async getProvenanceChain(itemId) {
        // Determine item type
        const claim = await this.getClaim(itemId);
        if (claim) {
            const source = claim.source_id ? await this.getSource(claim.source_id) : undefined;
            const transforms = await this.getTransformChain(claim.transform_chain);
            const evidence = await Promise.all(claim.evidence_ids.map((id) => this.getEvidence(id)));
            const licenses = await Promise.all([
                claim.license_id ? this.getLicense(claim.license_id) : null,
                source?.license_id ? this.getLicense(source.license_id) : null,
            ]);
            return {
                item_id: itemId,
                item_type: 'claim',
                claim,
                source: source || undefined,
                transforms,
                evidence: evidence.filter((e) => e !== null),
                licenses: licenses.filter((l) => l !== null),
                custody_chain: source?.custody_chain || [],
            };
        }
        // Could extend to other item types (evidence, source, etc.)
        throw new Error(`Item ${itemId} not found or unsupported type`);
    }
    // ============================================================================
    // EXPORT MANIFESTS
    // ============================================================================
    async createExportManifest(bundleInput) {
        const manifest_id = `manifest-${crypto_1.default.randomUUID()}`;
        const bundle_id = `bundle-${crypto_1.default.randomUUID()}`;
        const now = new Date();
        // 1. Gather all items
        let claims = [];
        if (bundleInput.claim_ids && bundleInput.claim_ids.length > 0) {
            claims = await Promise.all(bundleInput.claim_ids.map((id) => this.getClaim(id))).then((results) => results.filter((c) => c !== null));
        }
        else if (bundleInput.investigation_id) {
            claims = await this.queryClaims({
                investigation_id: bundleInput.investigation_id,
            });
        }
        // 2. Gather evidence, sources, transforms
        const evidenceIds = [...new Set(claims.flatMap((c) => c.evidence_ids))];
        const evidence = await Promise.all(evidenceIds.map((id) => this.getEvidence(id))).then((results) => results.filter((e) => e !== null));
        const sourceIds = [
            ...new Set([
                ...claims.map((c) => c.source_id),
                ...evidence.map((e) => e.source_id),
            ]),
        ];
        const sources = await Promise.all(sourceIds.map((id) => this.getSource(id))).then((results) => results.filter((s) => s !== null));
        const transformIds = [
            ...new Set([
                ...claims.flatMap((c) => c.transform_chain),
                ...evidence.flatMap((e) => e.transform_chain),
            ]),
        ];
        const transforms = await this.getTransformChain(transformIds);
        // 3. Build manifest items
        const items = [
            ...claims.map((c) => ({
                id: c.id,
                item_type: 'claim',
                content_hash: c.content_hash,
                merkle_proof: [],
                source_id: c.source_id,
                transform_chain: c.transform_chain,
                license_id: c.license_id,
            })),
            ...evidence.map((e) => ({
                id: e.id,
                item_type: 'evidence',
                content_hash: e.evidence_hash,
                merkle_proof: [],
                source_id: e.source_id,
                transform_chain: e.transform_chain,
                license_id: e.license_id,
            })),
            ...sources.map((s) => ({
                id: s.id,
                item_type: 'source',
                content_hash: s.source_hash,
                merkle_proof: [],
                transform_chain: [],
                license_id: s.license_id,
            })),
            ...transforms.map((t) => ({
                id: t.id,
                item_type: 'transform',
                content_hash: this.computeHash(t),
                merkle_proof: [],
                transform_chain: t.parent_transforms,
                license_id: '',
            })),
        ];
        // 4. Build Merkle tree
        const { root, proofs } = (0, merkle_tree_js_1.buildMerkleTreeWithProofs)(items);
        // Add proofs to items
        items.forEach((item) => {
            item.merkle_proof = proofs.get(item.content_hash) || [];
        });
        // 5. Collect licenses
        const licenseIds = [...new Set(items.map((i) => i.license_id).filter(Boolean))];
        const licenses = await Promise.all(licenseIds.map((id) => this.getLicense(id))).then((results) => results.filter((l) => l !== null));
        // 6. Create chain of custody
        const custody_chain = [
            {
                actor_id: bundleInput.created_by,
                action: 'EXPORT_CREATED',
                timestamp: now,
                signature: '',
                justification: `Export for ${bundleInput.export_type}`,
            },
        ];
        // 7. Create manifest
        const manifest = {
            manifest_id,
            manifest_version: '1.0.0',
            created_at: now,
            created_by: bundleInput.created_by,
            bundle_id,
            merkle_root: root,
            hash_algorithm: 'SHA-256',
            items,
            custody_chain,
            export_type: bundleInput.export_type,
            classification_level: bundleInput.classification_level,
            retention_policy: 'REGULATORY_STANDARD',
            signature: '',
            public_key_id: '',
            licenses,
            data_sources: sourceIds,
            transformation_chain: transformIds,
            authority_basis: bundleInput.authority_basis || [],
        };
        // 8. Sign manifest
        const signature = this.generateSignature(manifest);
        manifest.signature = signature;
        manifest.public_key_id = 'default-key';
        // 9. Store manifest
        try {
            await (0, timescale_js_1.query)(`
        INSERT INTO export_manifests (
          manifest_id, manifest_version, bundle_id, merkle_root, hash_algorithm,
          export_type, data_sources, transformation_chain, authority_basis,
          classification_level, retention_policy, chain_of_custody,
          signature, public_key_id, items, licenses, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      `, [
                manifest_id,
                manifest.manifest_version,
                bundle_id,
                root,
                manifest.hash_algorithm,
                manifest.export_type,
                JSON.stringify(manifest.data_sources),
                JSON.stringify(manifest.transformation_chain),
                JSON.stringify(manifest.authority_basis),
                manifest.classification_level,
                manifest.retention_policy,
                JSON.stringify(custody_chain),
                signature,
                manifest.public_key_id,
                JSON.stringify(items),
                JSON.stringify(licenses),
                bundleInput.created_by,
            ]);
            // Record in provenance chain
            await this.recordProvenanceEntry({
                operation_type: 'EXPORT_MANIFEST_CREATED',
                actor_id: bundleInput.created_by,
                metadata: {
                    manifest_id,
                    bundle_id,
                    merkle_root: root,
                    item_count: items.length,
                },
            });
            logger_js_1.default.info({
                message: 'Export manifest created',
                manifest_id,
                bundle_id,
                merkle_root: root,
                item_count: items.length,
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
    async verifyManifest(manifestId) {
        const result = await (0, timescale_js_1.query)('SELECT * FROM export_manifests WHERE manifest_id = $1', [manifestId]);
        if (result.rows.length === 0) {
            throw new Error(`Manifest ${manifestId} not found`);
        }
        const row = result.rows[0];
        const manifest = {
            ...row,
            items: typeof row.items === 'string' ? JSON.parse(row.items) : row.items,
            licenses: typeof row.licenses === 'string' ? JSON.parse(row.licenses) : row.licenses,
            custody_chain: typeof row.chain_of_custody === 'string' ? JSON.parse(row.chain_of_custody) : row.chain_of_custody,
        };
        // 1. Verify signature
        const expectedSignature = this.generateSignature({
            ...manifest,
            signature: '',
            public_key_id: '',
        });
        const signature_valid = manifest.signature === expectedSignature;
        // 2. Verify Merkle root
        const recomputedRoot = merkle_tree_js_1.MerkleTreeBuilder.buildFromItems(manifest.items).root;
        const merkle_valid = recomputedRoot === manifest.merkle_root;
        // 3. Verify each item's proof
        const item_verifications = manifest.items.map((item) => {
            const valid = merkle_tree_js_1.MerkleTreeBuilder.verifyProof(item.content_hash, item.merkle_proof, manifest.merkle_root);
            return {
                item_id: item.id,
                item_type: item.item_type,
                valid,
                error: valid ? undefined : 'Merkle proof verification failed',
            };
        });
        // 4. Verify transform chains
        const chain_verifications = [];
        // Simplified - could be expanded to verify each claim's transform chain
        // 5. Check license conflicts
        const license_issues = [];
        // Simplified - could check for conflicting license terms
        const bundle_valid = signature_valid &&
            merkle_valid &&
            item_verifications.every((v) => v.valid);
        const report = {
            manifest_id: manifestId,
            bundle_valid,
            signature_valid,
            merkle_valid,
            item_verifications,
            chain_verifications,
            license_issues,
            verified_at: new Date(),
        };
        // Store verification log
        await (0, timescale_js_1.query)(`
      INSERT INTO verification_logs (
        id, manifest_id, verified_at, bundle_valid, signature_valid,
        merkle_valid, items_valid, items_total, verification_details
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `, [
            `verify-${crypto_1.default.randomUUID()}`,
            manifestId,
            report.verified_at,
            bundle_valid,
            signature_valid,
            merkle_valid,
            item_verifications.filter((v) => v.valid).length,
            item_verifications.length,
            JSON.stringify(report),
        ]);
        return report;
    }
    // ============================================================================
    // UTILITY METHODS
    // ============================================================================
    computeHash(data) {
        const normalized = typeof data === 'string' ? data : JSON.stringify(data, Object.keys(data).sort());
        return crypto_1.default.createHash('sha256').update(normalized, 'utf8').digest('hex');
    }
    generateSignature(data) {
        const content = typeof data === 'string' ? data : JSON.stringify(data, Object.keys(data).sort());
        const hmac = crypto_1.default.createHmac('sha256', this.signingKey);
        return hmac.update(content).digest('hex');
    }
}
exports.ProvenanceLedgerBetaService = ProvenanceLedgerBetaService;
exports.default = ProvenanceLedgerBetaService;
