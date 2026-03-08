"use strict";
/**
 * Provenance Ledger Enhancements - Test Suite
 * Tests for claim-evidence links, audit chain verification, and hash chaining
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const provenance_ledger_beta_js_1 = require("../services/provenance-ledger-beta.js");
const crypto_1 = __importDefault(require("crypto"));
const runAcceptance = process.env.RUN_ACCEPTANCE === 'true';
const describeIf = runAcceptance ? globals_1.describe : globals_1.describe.skip;
describeIf('Provenance Ledger Enhancements', () => {
    let provenanceLedger;
    let testLicense;
    let testSource;
    let testEvidence;
    let testClaim;
    const userId = 'test-user-enhancements';
    const investigationId = 'test-investigation-enhancements';
    (0, globals_1.beforeAll)(async () => {
        provenanceLedger = provenance_ledger_beta_js_1.ProvenanceLedgerBetaService.getInstance();
        // Create test license
        testLicense = await provenanceLedger.createLicense({
            license_type: 'internal',
            license_terms: 'Test License',
            restrictions: [],
            attribution_required: false,
        });
        // Create test source
        const sourceHash = crypto_1.default.randomBytes(32).toString('hex');
        testSource = await provenanceLedger.registerSource({
            source_hash: sourceHash,
            source_type: 'document',
            origin_url: 'https://example.com/doc.pdf',
            metadata: {
                format: 'PDF',
                size_bytes: 1024,
            },
            license_id: testLicense.id,
            created_by: userId,
        });
        // Create test evidence
        const evidenceHash = crypto_1.default.randomBytes(32).toString('hex');
        testEvidence = await provenanceLedger.registerEvidence({
            evidence_hash: evidenceHash,
            evidence_type: 'document',
            storage_uri: 's3://bucket/evidence.pdf',
            source_id: testSource.id,
            transform_chain: [],
            license_id: testLicense.id,
            registered_by: userId,
        });
        // Create test claim
        testClaim = await provenanceLedger.registerClaim({
            content: 'Test claim for evidence linking',
            claim_type: 'factual',
            confidence: 0.9,
            evidence_ids: [],
            source_id: testSource.id,
            transform_chain: [],
            created_by: userId,
            investigation_id: investigationId,
            license_id: testLicense.id,
        });
    });
    (0, globals_1.describe)('Claim-Evidence Link Management', () => {
        (0, globals_1.it)('should create a SUPPORTS link between claim and evidence', async () => {
            const link = await provenanceLedger.linkClaimToEvidence({
                claim_id: testClaim.id,
                evidence_id: testEvidence.id,
                relation_type: 'SUPPORTS',
                confidence: 0.95,
                created_by: userId,
                notes: 'This evidence directly supports the claim',
            });
            (0, globals_1.expect)(link).toBeDefined();
            (0, globals_1.expect)(link.id).toBeTruthy();
            (0, globals_1.expect)(link.claim_id).toBe(testClaim.id);
            (0, globals_1.expect)(link.evidence_id).toBe(testEvidence.id);
            (0, globals_1.expect)(link.relation_type).toBe('SUPPORTS');
            (0, globals_1.expect)(link.confidence).toBe(0.95);
            (0, globals_1.expect)(link.created_by).toBe(userId);
            (0, globals_1.expect)(link.notes).toBe('This evidence directly supports the claim');
        });
        (0, globals_1.it)('should create a CONTRADICTS link between claim and evidence', async () => {
            // Create another piece of evidence
            const contradictingEvidenceHash = crypto_1.default.randomBytes(32).toString('hex');
            const contradictingEvidence = await provenanceLedger.registerEvidence({
                evidence_hash: contradictingEvidenceHash,
                evidence_type: 'testimony',
                storage_uri: 's3://bucket/testimony.txt',
                source_id: testSource.id,
                transform_chain: [],
                license_id: testLicense.id,
                registered_by: userId,
            });
            const link = await provenanceLedger.linkClaimToEvidence({
                claim_id: testClaim.id,
                evidence_id: contradictingEvidence.id,
                relation_type: 'CONTRADICTS',
                created_by: userId,
                notes: 'This evidence contradicts the claim',
            });
            (0, globals_1.expect)(link).toBeDefined();
            (0, globals_1.expect)(link.relation_type).toBe('CONTRADICTS');
            (0, globals_1.expect)(link.notes).toBe('This evidence contradicts the claim');
        });
        (0, globals_1.it)('should retrieve all evidence links for a claim', async () => {
            const links = await provenanceLedger.getClaimEvidenceLinks(testClaim.id);
            (0, globals_1.expect)(links).toBeDefined();
            (0, globals_1.expect)(Array.isArray(links)).toBe(true);
            (0, globals_1.expect)(links.length).toBeGreaterThanOrEqual(2); // At least SUPPORTS and CONTRADICTS
            const supportsLinks = links.filter((l) => l.relation_type === 'SUPPORTS');
            const contradictsLinks = links.filter((l) => l.relation_type === 'CONTRADICTS');
            (0, globals_1.expect)(supportsLinks.length).toBeGreaterThanOrEqual(1);
            (0, globals_1.expect)(contradictsLinks.length).toBeGreaterThanOrEqual(1);
        });
        (0, globals_1.it)('should retrieve all claim links for evidence', async () => {
            const links = await provenanceLedger.getEvidenceClaimLinks(testEvidence.id);
            (0, globals_1.expect)(links).toBeDefined();
            (0, globals_1.expect)(Array.isArray(links)).toBe(true);
            (0, globals_1.expect)(links.length).toBeGreaterThanOrEqual(1);
            const firstLink = links[0];
            (0, globals_1.expect)(firstLink.evidence_id).toBe(testEvidence.id);
            (0, globals_1.expect)(firstLink.claim_id).toBe(testClaim.id);
        });
        (0, globals_1.it)('should reject link creation for non-existent claim', async () => {
            await (0, globals_1.expect)(provenanceLedger.linkClaimToEvidence({
                claim_id: 'non-existent-claim',
                evidence_id: testEvidence.id,
                relation_type: 'SUPPORTS',
                created_by: userId,
            })).rejects.toThrow();
        });
        (0, globals_1.it)('should reject link creation for non-existent evidence', async () => {
            await (0, globals_1.expect)(provenanceLedger.linkClaimToEvidence({
                claim_id: testClaim.id,
                evidence_id: 'non-existent-evidence',
                relation_type: 'SUPPORTS',
                created_by: userId,
            })).rejects.toThrow();
        });
    });
    (0, globals_1.describe)('Audit Chain Verification', () => {
        (0, globals_1.it)('should verify audit chain integrity', async () => {
            const result = await provenanceLedger.verifyAuditChain();
            (0, globals_1.expect)(result).toBeDefined();
            (0, globals_1.expect)(result.totalRecords).toBeGreaterThan(0);
            (0, globals_1.expect)(result.valid).toBe(true);
            (0, globals_1.expect)(result.verifiedRecords).toBe(result.totalRecords);
            (0, globals_1.expect)(result.errors).toHaveLength(0);
            (0, globals_1.expect)(result.brokenAt).toBeUndefined();
        });
        (0, globals_1.it)('should verify audit chain with date range filter', async () => {
            const now = new Date();
            const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            const result = await provenanceLedger.verifyAuditChain({
                startDate: oneDayAgo,
                endDate: now,
            });
            (0, globals_1.expect)(result).toBeDefined();
            (0, globals_1.expect)(result.valid).toBe(true);
            (0, globals_1.expect)(result.errors).toHaveLength(0);
        });
        (0, globals_1.it)('should verify audit chain with limit', async () => {
            const result = await provenanceLedger.verifyAuditChain({
                limit: 10,
            });
            (0, globals_1.expect)(result).toBeDefined();
            (0, globals_1.expect)(result.totalRecords).toBeLessThanOrEqual(10);
            (0, globals_1.expect)(result.valid).toBe(true);
        });
        (0, globals_1.it)('should detect empty chain as valid', async () => {
            const futureDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
            const result = await provenanceLedger.verifyAuditChain({
                startDate: futureDate,
                endDate: futureDate,
            });
            (0, globals_1.expect)(result).toBeDefined();
            (0, globals_1.expect)(result.valid).toBe(true);
            (0, globals_1.expect)(result.totalRecords).toBe(0);
            (0, globals_1.expect)(result.verifiedRecords).toBe(0);
        });
    });
    (0, globals_1.describe)('Hash Chaining Integrity', () => {
        (0, globals_1.it)('should maintain hash chain across multiple operations', async () => {
            // Perform several operations to build a chain
            const operations = [];
            for (let i = 0; i < 5; i++) {
                const hash = crypto_1.default.randomBytes(32).toString('hex');
                const evidence = await provenanceLedger.registerEvidence({
                    evidence_hash: hash,
                    evidence_type: 'log',
                    storage_uri: `s3://bucket/log-${i}.txt`,
                    source_id: testSource.id,
                    transform_chain: [],
                    license_id: testLicense.id,
                    registered_by: userId,
                });
                operations.push(evidence);
            }
            // Verify the entire chain
            const verification = await provenanceLedger.verifyAuditChain();
            (0, globals_1.expect)(verification.valid).toBe(true);
            (0, globals_1.expect)(verification.totalRecords).toBeGreaterThanOrEqual(5);
            (0, globals_1.expect)(verification.errors).toHaveLength(0);
        });
        (0, globals_1.it)('should record operations in chronological order', async () => {
            const result = await provenanceLedger.verifyAuditChain({
                limit: 100,
            });
            (0, globals_1.expect)(result.valid).toBe(true);
            (0, globals_1.expect)(result.verifiedRecords).toBe(result.totalRecords);
        });
    });
    (0, globals_1.describe)('Export Manifest with Enhanced Features', () => {
        (0, globals_1.it)('should create export manifest including claim-evidence links', async () => {
            const manifest = await provenanceLedger.createExportManifest({
                claim_ids: [testClaim.id],
                export_type: 'INVESTIGATION_PACKAGE',
                classification_level: 'INTERNAL',
                created_by: userId,
            });
            (0, globals_1.expect)(manifest).toBeDefined();
            (0, globals_1.expect)(manifest.manifest_id).toBeTruthy();
            (0, globals_1.expect)(manifest.merkle_root).toBeTruthy();
            (0, globals_1.expect)(manifest.items.length).toBeGreaterThan(0);
            // Check that claims and evidence are included
            const claimItems = manifest.items.filter((item) => item.item_type === 'claim');
            const evidenceItems = manifest.items.filter((item) => item.item_type === 'evidence');
            (0, globals_1.expect)(claimItems.length).toBeGreaterThanOrEqual(1);
            (0, globals_1.expect)(evidenceItems.length).toBeGreaterThanOrEqual(1);
        });
        (0, globals_1.it)('should verify export manifest integrity', async () => {
            const manifest = await provenanceLedger.createExportManifest({
                claim_ids: [testClaim.id],
                export_type: 'DISCLOSURE',
                classification_level: 'INTERNAL',
                created_by: userId,
            });
            const verification = await provenanceLedger.verifyManifest(manifest.manifest_id);
            (0, globals_1.expect)(verification).toBeDefined();
            (0, globals_1.expect)(verification.bundle_valid).toBe(true);
            (0, globals_1.expect)(verification.signature_valid).toBe(true);
            (0, globals_1.expect)(verification.merkle_valid).toBe(true);
            (0, globals_1.expect)(verification.item_verifications).toBeDefined();
            (0, globals_1.expect)(verification.item_verifications.every((v) => v.valid)).toBe(true);
        });
    });
    (0, globals_1.describe)('End-to-End Provenance Flow', () => {
        (0, globals_1.it)('should track complete chain of custody from source to claim with evidence links', async () => {
            // 1. Create a new source
            const sourceHash = crypto_1.default.randomBytes(32).toString('hex');
            const source = await provenanceLedger.registerSource({
                source_hash: sourceHash,
                source_type: 'api',
                origin_url: 'https://api.example.com/data',
                metadata: { api_version: '2.0' },
                license_id: testLicense.id,
                created_by: userId,
            });
            // 2. Create evidence from source
            const evidenceHash = crypto_1.default.randomBytes(32).toString('hex');
            const evidence = await provenanceLedger.registerEvidence({
                evidence_hash: evidenceHash,
                evidence_type: 'database_record',
                storage_uri: 's3://bucket/record.json',
                source_id: source.id,
                transform_chain: [],
                license_id: testLicense.id,
                registered_by: userId,
            });
            // 3. Create a claim
            const claim = await provenanceLedger.registerClaim({
                content: 'Financial transaction detected',
                claim_type: 'factual',
                confidence: 0.85,
                evidence_ids: [],
                source_id: source.id,
                transform_chain: [],
                created_by: userId,
                investigation_id: investigationId,
                license_id: testLicense.id,
            });
            // 4. Link evidence to claim
            const link = await provenanceLedger.linkClaimToEvidence({
                claim_id: claim.id,
                evidence_id: evidence.id,
                relation_type: 'SUPPORTS',
                confidence: 0.9,
                created_by: userId,
            });
            // 5. Get provenance chain
            const provenanceChain = await provenanceLedger.getProvenanceChain(claim.id);
            (0, globals_1.expect)(provenanceChain).toBeDefined();
            (0, globals_1.expect)(provenanceChain.claim).toBeDefined();
            (0, globals_1.expect)(provenanceChain.source).toBeDefined();
            (0, globals_1.expect)(provenanceChain.source?.id).toBe(source.id);
            (0, globals_1.expect)(provenanceChain.evidence).toBeDefined();
            // 6. Create export manifest
            const manifest = await provenanceLedger.createExportManifest({
                claim_ids: [claim.id],
                export_type: 'COMPLETE_CHAIN',
                classification_level: 'INTERNAL',
                created_by: userId,
            });
            (0, globals_1.expect)(manifest).toBeDefined();
            (0, globals_1.expect)(manifest.items.length).toBeGreaterThan(0);
            // 7. Verify manifest
            const verification = await provenanceLedger.verifyManifest(manifest.manifest_id);
            (0, globals_1.expect)(verification.bundle_valid).toBe(true);
            // 8. Verify audit chain
            const auditVerification = await provenanceLedger.verifyAuditChain();
            (0, globals_1.expect)(auditVerification.valid).toBe(true);
        });
    });
});
