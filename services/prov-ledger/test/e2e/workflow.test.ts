/**
 * E2E Test: Full workflow demonstration
 * Demonstrates: ingest → register evidence → generate disclosure bundle → verify hashes
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import axios from 'axios';
import crypto from 'crypto';
import { Pool } from 'pg';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:4010';
const TEST_AUTHORITY = 'e2e-test-authority';
const TEST_REASON = 'e2e workflow testing';

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

describe('E2E: Complete Provenance Workflow', () => {
  let caseId: string;
  let evidenceItems: any[] = [];
  let bundleData: any;

  // Helper to compute SHA-256 checksum
  function computeChecksum(content: string): string {
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  beforeAll(async () => {
    // Wait for service to be ready
    let retries = 5;
    while (retries > 0) {
      try {
        await client.get('/health');
        break;
      } catch (error) {
        retries--;
        if (retries === 0) throw error;
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
  });

  it('Step 1: Create a new case for investigation', async () => {
    caseId = 'case_e2e_' + Date.now();

    await pool.query(
      `INSERT INTO cases (id, title, description, status, created_by)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        caseId,
        'E2E Test Case: Financial Investigation',
        'Testing complete workflow for evidence chain',
        'active',
        TEST_AUTHORITY,
      ],
    );

    // Verify case was created
    const result = await pool.query('SELECT * FROM cases WHERE id = $1', [
      caseId,
    ]);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].title).toContain('E2E Test Case');
  });

  it('Step 2: Ingest and register initial evidence', async () => {
    const rawDocuments = [
      {
        filename: 'transaction_log.csv',
        content: 'date,amount,account\n2024-01-01,1000,ACC001\n2024-01-02,500,ACC002',
        contentType: 'text/csv',
      },
      {
        filename: 'email_correspondence.txt',
        content: 'From: suspect@example.com\nSubject: RE: Transaction\nBody: Please process the transfer.',
        contentType: 'text/plain',
      },
      {
        filename: 'photo_evidence.jpg',
        content: 'binary-image-data-placeholder',
        contentType: 'image/jpeg',
      },
    ];

    for (const doc of rawDocuments) {
      const checksum = computeChecksum(doc.content);

      const evidenceResponse = await client.post('/evidence', {
        caseId,
        sourceRef: `file://${doc.filename}`,
        checksum,
        checksumAlgorithm: 'sha256',
        contentType: doc.contentType,
        fileSize: doc.content.length,
        policyLabels: ['investigation', 'confidential'],
        metadata: {
          originalFilename: doc.filename,
          ingestTimestamp: new Date().toISOString(),
        },
      });

      expect(evidenceResponse.status).toBe(200);
      expect(evidenceResponse.data.id).toMatch(/^evidence_/);
      expect(evidenceResponse.data.checksum).toBe(checksum);

      evidenceItems.push({
        id: evidenceResponse.data.id,
        filename: doc.filename,
        checksum,
        originalContent: doc.content,
      });
    }

    expect(evidenceItems).toHaveLength(3);
  });

  it('Step 3: Register transformed evidence with provenance chain', async () => {
    // Simulate OCR transformation on the image
    const originalImage = evidenceItems.find((e) =>
      e.filename.includes('photo'),
    );
    const extractedText = 'OCR Extracted: Account number 123456789';
    const transformedChecksum = computeChecksum(extractedText);

    const transformedEvidence = await client.post('/evidence', {
      caseId,
      sourceRef: `transformed://${originalImage.filename}_ocr.txt`,
      checksum: transformedChecksum,
      checksumAlgorithm: 'sha256',
      contentType: 'text/plain',
      transformChain: [
        {
          transformType: 'ocr',
          timestamp: new Date().toISOString(),
          actorId: 'ocr-service-v2',
          config: {
            sourceEvidence: originalImage.id,
            method: 'tesseract',
            confidence: 0.95,
          },
        },
      ],
      policyLabels: ['derived', 'investigation'],
      metadata: {
        sourceEvidenceId: originalImage.id,
        transformationType: 'ocr',
      },
    });

    expect(transformedEvidence.status).toBe(200);
    expect(transformedEvidence.data.transformChain).toHaveLength(1);
    expect(transformedEvidence.data.transformChain[0].transformType).toBe(
      'ocr',
    );

    evidenceItems.push({
      id: transformedEvidence.data.id,
      filename: 'ocr_extracted.txt',
      checksum: transformedChecksum,
      isTransformed: true,
    });
  });

  it('Step 4: Generate disclosure bundle manifest', async () => {
    const bundleResponse = await client.get(`/bundles/${caseId}`);

    expect(bundleResponse.status).toBe(200);

    bundleData = bundleResponse.data;

    expect(bundleData.caseId).toBe(caseId);
    expect(bundleData.version).toBe('1.0');
    expect(bundleData.evidence).toHaveLength(4); // 3 original + 1 transformed
    expect(bundleData.hashTree).toHaveLength(4);
    expect(bundleData.merkleRoot).toBeTruthy();
    expect(bundleData.merkleRoot).toMatch(/^[a-f0-9]+$/);
  });

  it('Step 5: Verify hash integrity of all evidence', async () => {
    // Verify each evidence checksum matches what we computed
    for (const evidence of bundleData.evidence) {
      const originalItem = evidenceItems.find((e) => e.id === evidence.id);

      if (originalItem) {
        expect(evidence.checksum).toBe(originalItem.checksum);

        // Verify checksum is in hash tree
        expect(bundleData.hashTree).toContain(evidence.checksum);
      }
    }
  });

  it('Step 6: Verify transform chain provenance', async () => {
    // Find the transformed evidence in the bundle
    const transformedEvidence = bundleData.evidence.find(
      (e: any) => e.transformChain && e.transformChain.length > 0,
    );

    expect(transformedEvidence).toBeDefined();
    expect(transformedEvidence.transformChain).toHaveLength(1);

    const transform = transformedEvidence.transformChain[0];
    expect(transform.transformType).toBe('ocr');
    expect(transform.actorId).toBe('ocr-service-v2');
    expect(transform).toHaveProperty('timestamp');

    // Verify we can trace back to original evidence
    const originalImageId = evidenceItems.find((e) =>
      e.filename.includes('photo'),
    ).id;
    expect(transform.config.sourceEvidence).toBe(originalImageId);
  });

  it('Step 7: Verify hash using verification endpoint', async () => {
    const originalDoc = evidenceItems[0];

    const verifyResponse = await client.post('/hash/verify', {
      content: originalDoc.originalContent,
      expectedHash: originalDoc.checksum,
    });

    expect(verifyResponse.status).toBe(200);
    expect(verifyResponse.data.valid).toBe(true);
    expect(verifyResponse.data.actual_hash).toBe(originalDoc.checksum);
  });

  it('Step 8: Verify bundle can be regenerated with same merkle root', async () => {
    // Generate bundle again
    const bundle2Response = await client.get(`/bundles/${caseId}`);

    expect(bundle2Response.status).toBe(200);

    // Merkle root should be identical (deterministic)
    expect(bundle2Response.data.merkleRoot).toBe(bundleData.merkleRoot);

    // Hash tree should contain same hashes in same order
    expect(bundle2Response.data.hashTree).toEqual(bundleData.hashTree);
  });

  it('Step 9: Register a claim based on the evidence', async () => {
    const claimResponse = await client.post('/claims', {
      content: {
        conclusion: 'Suspicious transaction pattern identified',
        caseId,
        evidenceCount: evidenceItems.length,
        analyzedBy: TEST_AUTHORITY,
      },
      sourceRef: `case://${caseId}`,
      policyLabels: ['investigation', 'findings'],
      metadata: {
        evidenceIds: evidenceItems.map((e) => e.id),
        bundleMerkleRoot: bundleData.merkleRoot,
      },
    });

    expect(claimResponse.status).toBe(200);
    expect(claimResponse.data.id).toMatch(/^claim_/);

    // Create provenance linking claim to evidence
    const provenanceResponse = await client.post('/provenance', {
      claimId: claimResponse.data.id,
      transforms: ['evidence_aggregation', 'analysis'],
      sources: evidenceItems.map((e) => e.id),
      lineage: {
        caseId,
        bundleVersion: '1.0',
        merkleRoot: bundleData.merkleRoot,
      },
    });

    expect(provenanceResponse.status).toBe(200);
    expect(provenanceResponse.data.claim_id).toBe(claimResponse.data.id);
  });

  it('Step 10: Export complete manifest', async () => {
    const manifestResponse = await client.get('/export/manifest');

    expect(manifestResponse.status).toBe(200);
    expect(manifestResponse.data.version).toBeTruthy();
    expect(manifestResponse.data.claims).toBeDefined();
    expect(manifestResponse.data.hash_chain).toBeTruthy();
    expect(manifestResponse.data.generated_at).toBeTruthy();
  });

  afterAll(async () => {
    // Clean up test data
    await pool.query('DELETE FROM case_evidence WHERE case_id = $1', [caseId]);
    await pool.query('DELETE FROM evidence WHERE case_id = $1', [caseId]);
    await pool.query('DELETE FROM cases WHERE id = $1', [caseId]);
    await pool.end();
  });
});
