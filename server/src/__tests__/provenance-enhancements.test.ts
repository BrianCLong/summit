/**
 * Provenance Ledger Enhancements - Test Suite
 * Tests for claim-evidence links, audit chain verification, and hash chaining
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { ProvenanceLedgerBetaService } from '../services/provenance-ledger-beta.js';
import crypto from 'crypto';
import type {
  License,
  Source,
  Evidence,
  Claim,
  ClaimEvidenceLink,
} from '../types/provenance-beta.js';

describe('Provenance Ledger Enhancements', () => {
  let provenanceLedger: ProvenanceLedgerBetaService;
  let testLicense: License;
  let testSource: Source;
  let testEvidence: Evidence;
  let testClaim: Claim;
  const userId = 'test-user-enhancements';
  const investigationId = 'test-investigation-enhancements';

  beforeAll(async () => {
    provenanceLedger = ProvenanceLedgerBetaService.getInstance();

    // Create test license
    testLicense = await provenanceLedger.createLicense({
      license_type: 'internal',
      license_terms: 'Test License',
      restrictions: [],
      attribution_required: false,
    });

    // Create test source
    const sourceHash = crypto.randomBytes(32).toString('hex');
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
    const evidenceHash = crypto.randomBytes(32).toString('hex');
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

  describe('Claim-Evidence Link Management', () => {
    it('should create a SUPPORTS link between claim and evidence', async () => {
      const link = await provenanceLedger.linkClaimToEvidence({
        claim_id: testClaim.id,
        evidence_id: testEvidence.id,
        relation_type: 'SUPPORTS',
        confidence: 0.95,
        created_by: userId,
        notes: 'This evidence directly supports the claim',
      });

      expect(link).toBeDefined();
      expect(link.id).toBeTruthy();
      expect(link.claim_id).toBe(testClaim.id);
      expect(link.evidence_id).toBe(testEvidence.id);
      expect(link.relation_type).toBe('SUPPORTS');
      expect(link.confidence).toBe(0.95);
      expect(link.created_by).toBe(userId);
      expect(link.notes).toBe('This evidence directly supports the claim');
    });

    it('should create a CONTRADICTS link between claim and evidence', async () => {
      // Create another piece of evidence
      const contradictingEvidenceHash = crypto.randomBytes(32).toString('hex');
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

      expect(link).toBeDefined();
      expect(link.relation_type).toBe('CONTRADICTS');
      expect(link.notes).toBe('This evidence contradicts the claim');
    });

    it('should retrieve all evidence links for a claim', async () => {
      const links = await provenanceLedger.getClaimEvidenceLinks(testClaim.id);

      expect(links).toBeDefined();
      expect(Array.isArray(links)).toBe(true);
      expect(links.length).toBeGreaterThanOrEqual(2); // At least SUPPORTS and CONTRADICTS

      const supportsLinks = links.filter((l) => l.relation_type === 'SUPPORTS');
      const contradictsLinks = links.filter(
        (l) => l.relation_type === 'CONTRADICTS',
      );

      expect(supportsLinks.length).toBeGreaterThanOrEqual(1);
      expect(contradictsLinks.length).toBeGreaterThanOrEqual(1);
    });

    it('should retrieve all claim links for evidence', async () => {
      const links = await provenanceLedger.getEvidenceClaimLinks(
        testEvidence.id,
      );

      expect(links).toBeDefined();
      expect(Array.isArray(links)).toBe(true);
      expect(links.length).toBeGreaterThanOrEqual(1);

      const firstLink = links[0];
      expect(firstLink.evidence_id).toBe(testEvidence.id);
      expect(firstLink.claim_id).toBe(testClaim.id);
    });

    it('should reject link creation for non-existent claim', async () => {
      await expect(
        provenanceLedger.linkClaimToEvidence({
          claim_id: 'non-existent-claim',
          evidence_id: testEvidence.id,
          relation_type: 'SUPPORTS',
          created_by: userId,
        }),
      ).rejects.toThrow();
    });

    it('should reject link creation for non-existent evidence', async () => {
      await expect(
        provenanceLedger.linkClaimToEvidence({
          claim_id: testClaim.id,
          evidence_id: 'non-existent-evidence',
          relation_type: 'SUPPORTS',
          created_by: userId,
        }),
      ).rejects.toThrow();
    });
  });

  describe('Audit Chain Verification', () => {
    it('should verify audit chain integrity', async () => {
      const result = await provenanceLedger.verifyAuditChain();

      expect(result).toBeDefined();
      expect(result.totalRecords).toBeGreaterThan(0);
      expect(result.valid).toBe(true);
      expect(result.verifiedRecords).toBe(result.totalRecords);
      expect(result.errors).toHaveLength(0);
      expect(result.brokenAt).toBeUndefined();
    });

    it('should verify audit chain with date range filter', async () => {
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const result = await provenanceLedger.verifyAuditChain({
        startDate: oneDayAgo,
        endDate: now,
      });

      expect(result).toBeDefined();
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should verify audit chain with limit', async () => {
      const result = await provenanceLedger.verifyAuditChain({
        limit: 10,
      });

      expect(result).toBeDefined();
      expect(result.totalRecords).toBeLessThanOrEqual(10);
      expect(result.valid).toBe(true);
    });

    it('should detect empty chain as valid', async () => {
      const futureDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

      const result = await provenanceLedger.verifyAuditChain({
        startDate: futureDate,
        endDate: futureDate,
      });

      expect(result).toBeDefined();
      expect(result.valid).toBe(true);
      expect(result.totalRecords).toBe(0);
      expect(result.verifiedRecords).toBe(0);
    });
  });

  describe('Hash Chaining Integrity', () => {
    it('should maintain hash chain across multiple operations', async () => {
      // Perform several operations to build a chain
      const operations = [];

      for (let i = 0; i < 5; i++) {
        const hash = crypto.randomBytes(32).toString('hex');
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

      expect(verification.valid).toBe(true);
      expect(verification.totalRecords).toBeGreaterThanOrEqual(5);
      expect(verification.errors).toHaveLength(0);
    });

    it('should record operations in chronological order', async () => {
      const result = await provenanceLedger.verifyAuditChain({
        limit: 100,
      });

      expect(result.valid).toBe(true);
      expect(result.verifiedRecords).toBe(result.totalRecords);
    });
  });

  describe('Export Manifest with Enhanced Features', () => {
    it('should create export manifest including claim-evidence links', async () => {
      const manifest = await provenanceLedger.createExportManifest({
        claim_ids: [testClaim.id],
        export_type: 'INVESTIGATION_PACKAGE',
        classification_level: 'INTERNAL',
        created_by: userId,
      });

      expect(manifest).toBeDefined();
      expect(manifest.manifest_id).toBeTruthy();
      expect(manifest.merkle_root).toBeTruthy();
      expect(manifest.items.length).toBeGreaterThan(0);

      // Check that claims and evidence are included
      const claimItems = manifest.items.filter(
        (item) => item.item_type === 'claim',
      );
      const evidenceItems = manifest.items.filter(
        (item) => item.item_type === 'evidence',
      );

      expect(claimItems.length).toBeGreaterThanOrEqual(1);
      expect(evidenceItems.length).toBeGreaterThanOrEqual(1);
    });

    it('should verify export manifest integrity', async () => {
      const manifest = await provenanceLedger.createExportManifest({
        claim_ids: [testClaim.id],
        export_type: 'DISCLOSURE',
        classification_level: 'INTERNAL',
        created_by: userId,
      });

      const verification = await provenanceLedger.verifyManifest(
        manifest.manifest_id,
      );

      expect(verification).toBeDefined();
      expect(verification.bundle_valid).toBe(true);
      expect(verification.signature_valid).toBe(true);
      expect(verification.merkle_valid).toBe(true);
      expect(verification.item_verifications).toBeDefined();
      expect(
        verification.item_verifications.every((v) => v.valid),
      ).toBe(true);
    });
  });

  describe('End-to-End Provenance Flow', () => {
    it('should track complete chain of custody from source to claim with evidence links', async () => {
      // 1. Create a new source
      const sourceHash = crypto.randomBytes(32).toString('hex');
      const source = await provenanceLedger.registerSource({
        source_hash: sourceHash,
        source_type: 'api',
        origin_url: 'https://api.example.com/data',
        metadata: { api_version: '2.0' },
        license_id: testLicense.id,
        created_by: userId,
      });

      // 2. Create evidence from source
      const evidenceHash = crypto.randomBytes(32).toString('hex');
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
      const provenanceChain = await provenanceLedger.getProvenanceChain(
        claim.id,
      );

      expect(provenanceChain).toBeDefined();
      expect(provenanceChain.claim).toBeDefined();
      expect(provenanceChain.source).toBeDefined();
      expect(provenanceChain.source?.id).toBe(source.id);
      expect(provenanceChain.evidence).toBeDefined();

      // 6. Create export manifest
      const manifest = await provenanceLedger.createExportManifest({
        claim_ids: [claim.id],
        export_type: 'COMPLETE_CHAIN',
        classification_level: 'INTERNAL',
        created_by: userId,
      });

      expect(manifest).toBeDefined();
      expect(manifest.items.length).toBeGreaterThan(0);

      // 7. Verify manifest
      const verification = await provenanceLedger.verifyManifest(
        manifest.manifest_id,
      );

      expect(verification.bundle_valid).toBe(true);

      // 8. Verify audit chain
      const auditVerification = await provenanceLedger.verifyAuditChain();

      expect(auditVerification.valid).toBe(true);
    });
  });
});
