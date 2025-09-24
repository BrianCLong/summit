import { describe, expect, it, vi } from 'vitest';
import type { ManifestVerificationResult } from 'prov-ledger';
import { evaluatePublicationAttempt } from '../src/publish';

const baseAttempt = {
  exportId: 'exp-1',
  actor: 'analyst',
  citationsRequired: 2,
  citationsProvided: 2,
  manifestAttached: true
};

describe('publication soft gate', () => {
  it('allows publication when checklist passes', () => {
    const decision = evaluatePublicationAttempt(baseAttempt);
    expect(decision.recommendation).toBe('proceed');
    expect(decision.checklist.missing).toHaveLength(0);
  });

  it('advises remediation when citations are missing', () => {
    const decision = evaluatePublicationAttempt({
      ...baseAttempt,
      citationsProvided: 0
    });
    expect(decision.recommendation).toBe('advise-remediation');
    expect(decision.checklist.missing).toContain('citations');
  });

  it('blocks publication on tampered manifest', () => {
    const verification: ManifestVerificationResult = {
      status: 'tampered',
      issues: ['merkle mismatch'],
      manifest: {
        version: '0.1',
        createdAt: '2025-09-01T00:00:00Z',
        exportId: 'exp-1',
        artifacts: [],
        transforms: [],
        provenance: { source: 'test' },
        policy: { redactions: [] },
        signatures: [],
        merkleRoot: ''
      }
    };
    const decision = evaluatePublicationAttempt(baseAttempt, { verification });
    expect(decision.recommendation).toBe('block');
    expect(decision.reasons).toContain('Manifest verification reported: tampered');
  });

  it('records audit fact when provided', () => {
    const record = vi.fn();
    const decision = evaluatePublicationAttempt(baseAttempt, {
      recordAudit: record
    });
    expect(record).toHaveBeenCalledTimes(1);
    expect(decision.recordedInLedger).toBe(true);
  });
});
