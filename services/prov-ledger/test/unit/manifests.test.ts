/**
 * Unit tests for Manifest export and verification endpoints
 */

import { describe, it, expect, beforeAll } from '@jest/globals';
import axios from 'axios';
import { Pool } from 'pg';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:4010';
const TEST_AUTHORITY = 'test-authority-001';
const TEST_REASON = 'automated testing';

const client = axios.create({
  baseURL: BASE_URL,
  headers: {
    'x-authority-id': TEST_AUTHORITY,
    'x-reason-for-access': TEST_REASON,
  },
});

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    'postgres://postgres:postgres@localhost:5432/provenance',
});

describe('Manifests API', () => {
  let testCaseId: string;
  let evidenceIds: string[] = [];
  let claimIds: string[] = [];

  beforeAll(async () => {
    // Create a test case
    testCaseId = 'case_manifest_test_' + Date.now();
    await pool.query(
      `INSERT INTO cases (id, title, status, created_by)
       VALUES ($1, $2, $3, $4)`,
      [testCaseId, 'Manifest Test Case', 'active', TEST_AUTHORITY],
    );

    // Register evidence for the case
    const evidenceData = [
      { sourceRef: 'file://manifest-ev-001.pdf', checksum: 'manifest_hash_1_' + Date.now() },
      { sourceRef: 'file://manifest-ev-002.jpg', checksum: 'manifest_hash_2_' + Date.now() },
      { sourceRef: 'file://manifest-ev-003.doc', checksum: 'manifest_hash_3_' + Date.now() },
    ];

    for (const data of evidenceData) {
      const response = await client.post('/evidence', {
        caseId: testCaseId,
        ...data,
      });
      evidenceIds.push(response.data.id);
    }

    // Create claims
    const claimData = [
      { content: { statement: 'Manifest claim 1 ' + Date.now() }, claimType: 'factual' },
      { content: { statement: 'Manifest claim 2 ' + Date.now() }, claimType: 'inferential' },
    ];

    for (const data of claimData) {
      const response = await client.post('/claims', data);
      claimIds.push(response.data.id);
    }
  });

  describe('POST /manifest/export', () => {
    it('should export manifest for a case', async () => {
      const response = await client.post('/manifest/export', {
        caseId: testCaseId,
        manifestType: 'disclosure',
      });

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('manifestId');
      expect(response.data.manifestId).toMatch(/^manifest_/);
      expect(response.data.manifestVersion).toBe('2.0.0');
      expect(response.data.manifestType).toBe('disclosure');
      expect(response.data.caseId).toBe(testCaseId);
      expect(response.data).toHaveProperty('contentHash');
      expect(response.data).toHaveProperty('merkleRoot');
      expect(response.data.merkleRoot).toMatch(/^[a-f0-9]{64}$/);
      expect(Array.isArray(response.data.items)).toBe(true);
      expect(response.data.items.length).toBe(evidenceIds.length);
      expect(Array.isArray(response.data.proofs)).toBe(true);
      expect(response.data.proofs.length).toBe(evidenceIds.length);
    });

    it('should export manifest for specific evidence IDs', async () => {
      const selectedIds = evidenceIds.slice(0, 2);

      const response = await client.post('/manifest/export', {
        evidenceIds: selectedIds,
        manifestType: 'selective',
      });

      expect(response.status).toBe(200);
      expect(response.data.manifestType).toBe('selective');
      expect(response.data.items.length).toBe(2);

      const itemIds = response.data.items.map((i: any) => i.id);
      expect(itemIds).toEqual(expect.arrayContaining(selectedIds));
    });

    it('should export manifest with claims', async () => {
      const response = await client.post('/manifest/export', {
        claimIds: claimIds,
        manifestType: 'audit',
      });

      expect(response.status).toBe(200);
      expect(response.data.manifestType).toBe('audit');
      expect(response.data.items.length).toBe(claimIds.length);

      const claimItems = response.data.items.filter((i: any) => i.type === 'claim');
      expect(claimItems.length).toBe(claimIds.length);
    });

    it('should export mixed manifest with evidence and claims', async () => {
      const response = await client.post('/manifest/export', {
        evidenceIds: [evidenceIds[0]],
        claimIds: [claimIds[0]],
        manifestType: 'chain-of-custody',
      });

      expect(response.status).toBe(200);
      expect(response.data.items.length).toBe(2);

      const types = response.data.items.map((i: any) => i.type);
      expect(types).toContain('evidence');
      expect(types).toContain('claim');
    });

    it('should generate valid Merkle proofs', async () => {
      const response = await client.post('/manifest/export', {
        caseId: testCaseId,
      });

      expect(response.status).toBe(200);

      // Each proof should have the correct structure
      for (const proof of response.data.proofs) {
        expect(proof).toHaveProperty('itemId');
        expect(proof).toHaveProperty('itemType');
        expect(proof).toHaveProperty('leafHash');
        expect(Array.isArray(proof.proof)).toBe(true);

        // Each step in proof should have dir and hash
        for (const step of proof.proof) {
          expect(['L', 'R']).toContain(step.dir);
          expect(step.hash).toMatch(/^[a-f0-9]{64}$/);
        }
      }
    });
  });

  describe('GET /manifest/:manifestId', () => {
    let testManifestId: string;

    beforeAll(async () => {
      const response = await client.post('/manifest/export', {
        caseId: testCaseId,
        manifestType: 'disclosure',
      });
      testManifestId = response.data.manifestId;
    });

    it('should retrieve existing manifest', async () => {
      const response = await client.get(`/manifest/${testManifestId}`);

      expect(response.status).toBe(200);
      expect(response.data.manifestId).toBe(testManifestId);
      expect(response.data.caseId).toBe(testCaseId);
      expect(response.data).toHaveProperty('merkleRoot');
      expect(response.data).toHaveProperty('proofs');
      expect(response.data).toHaveProperty('created_at');
    });

    it('should return 404 for non-existent manifest', async () => {
      try {
        await client.get('/manifest/manifest_nonexistent');
        expect(true).toBe(false);
      } catch (error: any) {
        expect(error.response.status).toBe(404);
      }
    });
  });

  describe('POST /manifest/verify', () => {
    let validManifestId: string;

    beforeAll(async () => {
      const response = await client.post('/manifest/export', {
        caseId: testCaseId,
        manifestType: 'disclosure',
      });
      validManifestId = response.data.manifestId;
    });

    it('should verify valid manifest', async () => {
      const response = await client.post('/manifest/verify', {
        manifestId: validManifestId,
      });

      expect(response.status).toBe(200);
      expect(response.data.valid).toBe(true);
      expect(response.data.manifestId).toBe(validManifestId);
      expect(response.data.merkleValid).toBe(true);
      expect(response.data.itemsVerified).toBeGreaterThan(0);
      expect(response.data.itemsValid).toBe(response.data.itemsVerified);
      expect(response.data).toHaveProperty('verified_at');
    });

    it('should return item verification details', async () => {
      const response = await client.post('/manifest/verify', {
        manifestId: validManifestId,
      });

      expect(Array.isArray(response.data.itemVerifications)).toBe(true);

      for (const verification of response.data.itemVerifications) {
        expect(verification).toHaveProperty('itemId');
        expect(verification).toHaveProperty('itemType');
        expect(verification).toHaveProperty('leafHash');
        expect(verification.valid).toBe(true);
      }
    });

    it('should return 404 for non-existent manifest', async () => {
      try {
        await client.post('/manifest/verify', {
          manifestId: 'manifest_nonexistent',
        });
        expect(true).toBe(false);
      } catch (error: any) {
        expect(error.response.status).toBe(404);
      }
    });
  });

  describe('POST /proof/verify', () => {
    let merkleRoot: string;
    let leafHash: string;
    let proof: any[];

    beforeAll(async () => {
      const response = await client.post('/manifest/export', {
        caseId: testCaseId,
      });
      merkleRoot = response.data.merkleRoot;
      leafHash = response.data.proofs[0].leafHash;
      proof = response.data.proofs[0].proof;
    });

    it('should verify valid Merkle proof', async () => {
      const response = await client.post('/proof/verify', {
        leafHash,
        proof,
        merkleRoot,
      });

      expect(response.status).toBe(200);
      expect(response.data.valid).toBe(true);
      expect(response.data.leafHash).toBe(leafHash);
      expect(response.data.merkleRoot).toBe(merkleRoot);
      expect(response.data.proofLength).toBe(proof.length);
    });

    it('should reject invalid proof', async () => {
      // Modify the leaf hash
      const invalidLeaf = 'x'.repeat(64);

      const response = await client.post('/proof/verify', {
        leafHash: invalidLeaf,
        proof,
        merkleRoot,
      });

      expect(response.status).toBe(200);
      expect(response.data.valid).toBe(false);
    });

    it('should reject proof with wrong merkle root', async () => {
      const wrongRoot = 'y'.repeat(64);

      const response = await client.post('/proof/verify', {
        leafHash,
        proof,
        merkleRoot: wrongRoot,
      });

      expect(response.status).toBe(200);
      expect(response.data.valid).toBe(false);
    });
  });

  describe('GET /bundles/:caseId (enhanced)', () => {
    it('should return merkle proofs in bundle', async () => {
      const response = await client.get(`/bundles/${testCaseId}`);

      expect(response.status).toBe(200);
      expect(response.data.version).toBe('2.0');
      expect(response.data).toHaveProperty('merkleProofs');
      expect(Array.isArray(response.data.merkleProofs)).toBe(true);

      // Each evidence should have a proof
      expect(response.data.merkleProofs.length).toBe(response.data.evidence.length);

      for (const proof of response.data.merkleProofs) {
        expect(proof).toHaveProperty('evidenceId');
        expect(proof).toHaveProperty('leafHash');
        expect(proof).toHaveProperty('proof');
      }
    });

    it('should allow verification of individual evidence in bundle', async () => {
      const bundleResponse = await client.get(`/bundles/${testCaseId}`);
      const bundle = bundleResponse.data;

      // Verify first evidence proof
      const firstProof = bundle.merkleProofs[0];

      const verifyResponse = await client.post('/proof/verify', {
        leafHash: firstProof.leafHash,
        proof: firstProof.proof,
        merkleRoot: bundle.merkleRoot,
      });

      expect(verifyResponse.data.valid).toBe(true);
    });
  });
});
