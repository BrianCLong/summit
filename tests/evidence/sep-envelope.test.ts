import { describe, it } from 'node:test';
import assert from 'node:assert';
import { EvidenceEnvelope } from '../../src/evidence/schema/evidenceEnvelope';

describe('EvidenceEnvelope', () => {
  it('should be structured correctly', () => {
    const envelope: EvidenceEnvelope = {
      evidenceId: 'EVID:sec:10k-2025-acme:7fa92d',
      sourceType: 'sec',
      sourceId: '10k-2025-acme',
      locator: 'page 42',
      contentHash: '7fa92d',
      normalizedText: 'Revenue increased by 40%',
      citation: {
        sourceName: 'ACME 10-K',
        locator: 'page 42',
        retrievedVia: 'connector-sec',
        verificationStatus: 'verified'
      },
      links: [],
      trust: {
        score: 0.8,
        reasons: [],
        modelVersion: 'sep-trust-v1'
      }
    };
    assert.strictEqual(envelope.evidenceId, 'EVID:sec:10k-2025-acme:7fa92d');
  });
});
