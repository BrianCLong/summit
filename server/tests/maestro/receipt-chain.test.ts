import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import crypto from 'crypto';
import {
  buildReceiptSignature,
  verifyReceiptSignature,
} from '../../src/maestro/evidence/receipt-signing.js';
import {
  EvidenceProvenanceService,
} from '../../src/maestro/evidence/provenance-service.js';

const mockQuery = jest.fn();

jest.mock('../../src/db/postgres.js', () => ({
  getPostgresPool: () => ({
    query: mockQuery,
  }),
}));

describe('maestro receipt chain verification', () => {
  beforeEach(() => {
    mockQuery.mockReset();
    delete process.env.EVIDENCE_SIGNING_KEYS;
    delete process.env.EVIDENCE_SIGNER_KID;
    delete process.env.EVIDENCE_SIGNING_SECRET;
    delete process.env.EVIDENCE_SIGNING_KEY;
  });

  it('verifies receipts signed with rotated keys', () => {
    process.env.EVIDENCE_SIGNING_KEYS = JSON.stringify({
      kidA: 'alpha',
      kidB: 'bravo',
    });
    process.env.EVIDENCE_SIGNER_KID = 'kidB';

    const payload = {
      spec_version: '1.0.0',
      id: 'receipt-1',
      timestamp: '2026-01-02T00:00:00Z',
      correlation_id: 'run-1',
      tenant_id: 'tenant-1',
      actor: { id: 'system', principal_type: 'system' },
      action: 'maestro.task.started',
      resource: { id: 'task-1', type: 'maestro.task' },
      policy: {
        decision_id: 'decision-1',
        policy_set: 'maestro.policy.guard.v1',
        evaluation_timestamp: '2026-01-02T00:00:00Z',
      },
      result: { status: 'success' },
    };

    const signature = buildReceiptSignature(payload);
    expect(signature.key_id).toBe('kidB');
    expect(verifyReceiptSignature(payload, signature)).toBe(true);
  });

  it('verifies receipt chain traversal and signatures', async () => {
    process.env.EVIDENCE_SIGNING_KEY = 'chain-secret';
    const service = new EvidenceProvenanceService();

    const chainData1 = JSON.stringify({
      artifactId: 'receipt-1',
      previousHash: null,
      currentHash: 'hash-1',
      timestamp: '2026-01-02T00:00:01Z',
      runId: 'run-1',
    });
    const chainData2 = JSON.stringify({
      artifactId: 'receipt-2',
      previousHash: 'hash-1',
      currentHash: 'hash-2',
      timestamp: '2026-01-02T00:00:02Z',
      runId: 'run-1',
    });

    const signature1 = crypto
      .createHmac('sha256', process.env.EVIDENCE_SIGNING_KEY)
      .update(chainData1)
      .digest('hex');
    const signature2 = crypto
      .createHmac('sha256', process.env.EVIDENCE_SIGNING_KEY)
      .update(chainData2)
      .digest('hex');

    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          artifact_id: 'receipt-1',
          sha256_hash: 'hash-1',
          created_at: '2026-01-02T00:00:01Z',
          previous_hash: null,
          current_hash: 'hash-1',
          signature: signature1,
          chain_data: chainData1,
        },
        {
          artifact_id: 'receipt-2',
          sha256_hash: 'hash-2',
          created_at: '2026-01-02T00:00:02Z',
          previous_hash: 'hash-1',
          current_hash: 'hash-2',
          signature: signature2,
          chain_data: chainData2,
        },
      ],
    });

    const verification = await service.verifyReceiptChain('run-1');
    expect(verification.valid).toBe(true);
    expect(verification.errors).toHaveLength(0);
    expect(verification.chain).toHaveLength(2);
  });
});
