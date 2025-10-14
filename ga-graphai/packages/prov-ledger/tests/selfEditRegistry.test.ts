import { describe, expect, it, beforeEach } from 'vitest';
import { SelfEditRegistry } from '../src/selfEditRegistry';
import type { SelfEditProposal } from 'common-types';

describe('SelfEditRegistry', () => {
  let now: Date;
  let registry: SelfEditRegistry;

  const proposal: SelfEditProposal = {
    instruction: 'Refine classification heuristic for threat actor clustering.',
    expectedOutput: 'Updated clustering pipeline with lower false positive rate.',
    rationale: 'Sandbox replay shows drift on finance tenants.',
    modelId: 'graphai-respond-001',
    baseCheckpoint: 'ckpt-main-2025-09-30',
    domain: 'threat-intel',
    ttlMs: 60_000,
  };

  beforeEach(() => {
    now = new Date('2025-10-14T00:00:00.000Z');
    registry = new SelfEditRegistry({
      clock: () => now,
      defaultTtlMs: 120_000,
      passScoreThreshold: 0.9,
      minVerifierCount: 2,
    });
  });

  it('registers proposals with derived expiry and initial status', () => {
    const record = registry.register(proposal);

    expect(record.status).toBe('proposed');
    expect(record.expiresAt).toBe('2025-10-14T00:01:00.000Z');
    expect(record.verifierScores).toHaveLength(0);
  });

  it('promotes self-edits to approved when verifiers succeed', () => {
    const record = registry.register(proposal);

    registry.recordVerifierScore(record.id, { verifier: 'baseline-regression', score: 0.93, passed: true });
    now = new Date('2025-10-14T00:00:10.000Z');
    const updated = registry.recordVerifierScore(record.id, {
      verifier: 'safety-sweeps',
      score: 0.95,
      passed: true,
      rationale: 'No jailbreak regressions detected.',
    });

    expect(updated.status).toBe('approved');
    const card = registry.getScorecard(record.id);
    expect(card.ready).toBe(true);
    expect(card.averageScore).toBeCloseTo(0.94, 2);
  });

  it('rejects self-edits when any verifier fails', () => {
    const record = registry.register(proposal);

    registry.recordVerifierScore(record.id, { verifier: 'sandbox-metrics', score: 0.78, passed: false });
    const card = registry.getScorecard(record.id);

    expect(card.failedChecks).toBe(1);
    expect(card.ready).toBe(false);
    const stored = registry.get(record.id);
    expect(stored?.status).toBe('rejected');
  });

  it('expires proposals after the TTL elapses', () => {
    const record = registry.register(proposal);

    now = new Date('2025-10-14T00:02:00.000Z');
    registry.sweepExpired();
    const expired = registry.get(record.id);

    expect(expired?.status).toBe('expired');
  });
});
