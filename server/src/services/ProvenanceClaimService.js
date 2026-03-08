"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProvenanceClaimService = void 0;
// @ts-nocheck
const pg_js_1 = require("../db/pg.js");
const ledger_js_1 = require("../provenance/ledger.js");
const crypto_1 = __importDefault(require("crypto"));
class ProvenanceClaimService {
    static instance;
    static getInstance() {
        if (!ProvenanceClaimService.instance) {
            ProvenanceClaimService.instance = new ProvenanceClaimService();
        }
        return ProvenanceClaimService.instance;
    }
    async registerEvidence(input) {
        const client = await pg_js_1.pool.connect();
        try {
            await client.query('BEGIN');
            // 1. Insert into evidence_artifacts
            const res = await client.query(`INSERT INTO evidence_artifacts
        (sha256, artifact_type, storage_uri, source_id, transform_chain, license_id, classification_level, content_preview, registered_by, tenant_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *`, [
                input.evidence_hash,
                input.evidence_type,
                input.storage_uri,
                input.source_id,
                input.transform_chain || [],
                input.license_id,
                input.classification_level || 'INTERNAL',
                input.content_preview,
                input.registered_by,
                input.tenant_id
            ]);
            const evidence = res.rows[0];
            // 2. Record to Immutable Ledger
            await ledger_js_1.provenanceLedger.appendEntry({
                tenantId: input.tenant_id,
                actionType: 'REGISTER_EVIDENCE',
                resourceType: 'Evidence',
                resourceId: evidence.id,
                actorId: input.registered_by,
                actorType: 'user',
                payload: {
                    evidence_hash: input.evidence_hash,
                    storage_uri: input.storage_uri,
                    license_id: input.license_id
                },
                metadata: {
                    classification: [evidence.classification_level]
                }
            });
            await client.query('COMMIT');
            return evidence;
        }
        catch (e) {
            await client.query('ROLLBACK');
            throw e;
        }
        finally {
            client.release();
        }
    }
    async registerClaim(input) {
        const client = await pg_js_1.pool.connect();
        try {
            await client.query('BEGIN');
            const contentHash = crypto_1.default.createHash('sha256').update(input.content).digest('hex');
            const evidenceHashes = []; // In a real impl, fetch these from DB or input
            // 1. Insert into claims_registry
            const res = await client.query(`INSERT INTO claims_registry
        (content_hash, content, subject, predicate, object, effective_date, location, extraction_method, claim_type, confidence, evidence_hashes, source_id, transform_chain, license_id, created_by, investigation_id, tenant_id, extracted_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, NOW())
        RETURNING *`, [
                contentHash,
                input.content,
                input.subject,
                input.predicate,
                input.object,
                input.effective_date,
                input.location ? JSON.stringify(input.location) : null,
                input.extraction_method,
                input.claim_type,
                input.confidence,
                JSON.stringify(evidenceHashes),
                input.source_id,
                input.transform_chain || [],
                input.license_id,
                input.created_by,
                input.investigation_id,
                input.tenant_id
            ]);
            const claim = res.rows[0];
            // 2. Link initial evidence if provided
            if (input.evidence_ids && input.evidence_ids.length > 0) {
                for (const eid of input.evidence_ids) {
                    await this.linkClaimToEvidenceInternal(client, {
                        claim_id: claim.id,
                        evidence_id: eid,
                        relation_type: 'SUPPORTS', // Default for initial evidence
                        created_by: input.created_by,
                        tenant_id: input.tenant_id
                    });
                }
            }
            // 3. Record to Ledger
            await ledger_js_1.provenanceLedger.appendEntry({
                tenantId: input.tenant_id,
                actionType: 'REGISTER_CLAIM',
                resourceType: 'Claim',
                resourceId: claim.id,
                actorId: input.created_by,
                actorType: 'user',
                payload: {
                    content_hash: contentHash,
                    claim_type: input.claim_type,
                    confidence: input.confidence,
                    investigation_id: input.investigation_id
                },
                metadata: { purpose: 'intelligence_analysis' }
            });
            await client.query('COMMIT');
            return claim;
        }
        catch (e) {
            await client.query('ROLLBACK');
            throw e;
        }
        finally {
            client.release();
        }
    }
    async linkClaimToEvidence(input) {
        const client = await pg_js_1.pool.connect();
        try {
            await client.query('BEGIN');
            const link = await this.linkClaimToEvidenceInternal(client, input);
            await client.query('COMMIT');
            return link;
        }
        catch (e) {
            await client.query('ROLLBACK');
            throw e;
        }
        finally {
            client.release();
        }
    }
    async linkClaimToEvidenceInternal(client, input) {
        // Check if exists
        const check = await client.query(`SELECT id FROM claim_evidence_links WHERE claim_id=$1 AND evidence_id=$2 AND relation_type=$3`, [input.claim_id, input.evidence_id, input.relation_type]);
        if (check.rows.length > 0)
            return check.rows[0];
        const res = await client.query(`INSERT INTO claim_evidence_links
      (claim_id, evidence_id, relation_type, confidence, offset_start, offset_end, page_number, bbox, segment_text, created_by, notes, tenant_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *`, [
            input.claim_id,
            input.evidence_id,
            input.relation_type,
            input.confidence || 1.0,
            input.offset_start,
            input.offset_end,
            input.page_number,
            input.bbox ? JSON.stringify(input.bbox) : null,
            input.segment_text,
            input.created_by,
            input.notes,
            input.tenant_id
        ]);
        const link = res.rows[0];
        // Ledger entry for link
        await ledger_js_1.provenanceLedger.appendEntry({
            tenantId: input.tenant_id,
            actionType: 'LINK_EVIDENCE',
            resourceType: 'ClaimEvidenceLink',
            resourceId: link.id,
            actorId: input.created_by,
            actorType: 'user',
            payload: {
                claim_id: input.claim_id,
                evidence_id: input.evidence_id,
                relation_type: input.relation_type
            },
            metadata: {}
        });
        return link;
    }
    async createExportManifest(input) {
        // 1. Fetch Claims and their Provenance
        // This is a simplified implementation. Real implementation would fetch the full graph.
        const client = await pg_js_1.pool.connect();
        try {
            const claimsRes = await client.query(`SELECT * FROM claims_registry WHERE id = ANY($1) AND tenant_id = $2`, [input.claim_ids, input.tenant_id]);
            const claims = claimsRes.rows;
            const items = claims.map((c) => ({
                id: c.id,
                type: 'claim',
                hash: c.content_hash,
                content: c.content
            }));
            // Calculate Merkle Root
            const hashes = items.map((i) => i.hash).sort();
            const merkleRoot = this.computeMerkleRoot(hashes);
            const bundleId = `bundle-${crypto_1.default.randomUUID()}`;
            // Insert Manifest
            const res = await client.query(`INSERT INTO export_manifests
        (manifest_version, bundle_id, merkle_root, items, custody_chain, export_type, classification_level, authority_basis, created_by, tenant_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *`, [
                '1.0.0',
                bundleId,
                merkleRoot,
                JSON.stringify(items),
                JSON.stringify([]), // Initial custody chain
                input.export_type,
                input.classification_level,
                input.authority_basis,
                input.created_by,
                input.tenant_id
            ]);
            const manifest = res.rows[0];
            // Ledger Entry
            await ledger_js_1.provenanceLedger.appendEntry({
                tenantId: input.tenant_id,
                actionType: 'CREATE_MANIFEST',
                resourceType: 'ExportManifest',
                resourceId: manifest.id,
                actorId: input.created_by,
                actorType: 'user',
                payload: {
                    bundle_id: bundleId,
                    merkle_root: merkleRoot,
                    item_count: items.length
                },
                metadata: { classification: [input.classification_level] }
            });
            return manifest;
        }
        finally {
            client.release();
        }
    }
    computeMerkleRoot(hashes) {
        if (hashes.length === 0)
            return '';
        if (hashes.length === 1)
            return hashes[0];
        const nextLevel = [];
        for (let i = 0; i < hashes.length; i += 2) {
            const left = hashes[i];
            const right = i + 1 < hashes.length ? hashes[i + 1] : left;
            const combined = crypto_1.default.createHash('sha256').update(left + right).digest('hex');
            nextLevel.push(combined);
        }
        return this.computeMerkleRoot(nextLevel);
    }
}
exports.ProvenanceClaimService = ProvenanceClaimService;
