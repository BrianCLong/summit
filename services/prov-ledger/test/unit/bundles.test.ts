/**
 * Unit tests for Bundle endpoints
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

describe('Bundles API', () => {
  let testCaseId: string;
  let evidenceIds: string[] = [];

  beforeAll(async () => {
    // Create a test case
    testCaseId = 'case_bundle_test_' + Date.now();
    await pool.query(
      `INSERT INTO cases (id, title, description, status, created_by)
       VALUES ($1, $2, $3, $4, $5)`,
      [testCaseId, 'Test Case for Bundles', 'Test description', 'active', TEST_AUTHORITY],
    );

    // Register multiple evidence items for the case
    const evidenceData = [
      {
        sourceRef: 'file://evidence-001.pdf',
        checksum: 'checksum_bundle_1_' + Date.now(),
        transformChain: [
          {
            transformType: 'extraction',
            timestamp: new Date().toISOString(),
            actorId: 'system',
          },
        ],
      },
      {
        sourceRef: 'file://evidence-002.jpg',
        checksum: 'checksum_bundle_2_' + Date.now(),
        transformChain: [
          {
            transformType: 'enhancement',
            timestamp: new Date().toISOString(),
            actorId: 'analyst',
          },
        ],
      },
      {
        sourceRef: 'file://evidence-003.doc',
        checksum: 'checksum_bundle_3_' + Date.now(),
        transformChain: [],
      },
    ];

    for (const data of evidenceData) {
      const response = await client.post('/evidence', {
        caseId: testCaseId,
        ...data,
      });
      evidenceIds.push(response.data.id);
    }
  });

  describe('GET /bundles/:caseId', () => {
    it('should generate disclosure bundle for a case', async () => {
      const response = await client.get(`/bundles/${testCaseId}`);

      expect(response.status).toBe(200);
      expect(response.data.caseId).toBe(testCaseId);
      expect(response.data.version).toBe('1.0');
      expect(response.data.evidence).toHaveLength(3);
      expect(response.data).toHaveProperty('hashTree');
      expect(response.data).toHaveProperty('merkleRoot');
      expect(response.data).toHaveProperty('generated_at');
    });

    it('should include all evidence with checksums and transform chains', async () => {
      const response = await client.get(`/bundles/${testCaseId}`);

      const bundle = response.data;

      // Verify each evidence item
      bundle.evidence.forEach((item: any) => {
        expect(item).toHaveProperty('id');
        expect(item).toHaveProperty('sourceRef');
        expect(item).toHaveProperty('checksum');
        expect(item).toHaveProperty('transformChain');
        expect(Array.isArray(item.transformChain)).toBe(true);
      });
    });

    it('should build correct hash tree', async () => {
      const response = await client.get(`/bundles/${testCaseId}`);

      const bundle = response.data;

      expect(bundle.hashTree).toHaveLength(3);
      expect(Array.isArray(bundle.hashTree)).toBe(true);

      // All entries should be hex strings
      bundle.hashTree.forEach((hash: string) => {
        expect(typeof hash).toBe('string');
        expect(hash.length).toBeGreaterThan(0);
      });
    });

    it('should compute merkle root', async () => {
      const response = await client.get(`/bundles/${testCaseId}`);

      const bundle = response.data;

      expect(bundle.merkleRoot).toBeTruthy();
      expect(typeof bundle.merkleRoot).toBe('string');
      // Merkle root should be a hash (64 hex chars for SHA-256)
      expect(bundle.merkleRoot).toMatch(/^[a-f0-9]+$/);
    });

    it('should return 404 for non-existent case', async () => {
      try {
        await client.get('/bundles/case_nonexistent');
        expect(true).toBe(false); // Should not reach here
      } catch (error: any) {
        expect(error.response.status).toBe(404);
        expect(error.response.data.error).toContain('not found');
      }
    });

    it('should handle case with no evidence', async () => {
      // Create a case with no evidence
      const emptyCaseId = 'case_empty_' + Date.now();
      await pool.query(
        `INSERT INTO cases (id, title, status, created_by)
         VALUES ($1, $2, $3, $4)`,
        [emptyCaseId, 'Empty Case', 'active', TEST_AUTHORITY],
      );

      const response = await client.get(`/bundles/${emptyCaseId}`);

      expect(response.status).toBe(200);
      expect(response.data.evidence).toHaveLength(0);
      expect(response.data.hashTree).toHaveLength(0);
      expect(response.data.merkleRoot).toBe('');
    });
  });

  describe('Bundle verification', () => {
    it('should allow verification of evidence in bundle', async () => {
      const bundleResponse = await client.get(`/bundles/${testCaseId}`);
      const bundle = bundleResponse.data;

      // Pick first evidence
      const evidence = bundle.evidence[0];

      // Get the full evidence details
      const evidenceResponse = await client.get(`/evidence/${evidence.id}`);
      const fullEvidence = evidenceResponse.data;

      // Verify checksum matches
      expect(fullEvidence.checksum).toBe(evidence.checksum);

      // Verify it's in the hash tree
      expect(bundle.hashTree).toContain(evidence.checksum);
    });
  });
});
