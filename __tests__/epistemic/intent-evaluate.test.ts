import { test, describe } from 'node:test';
import * as assert from 'node:assert';
import { evaluateEpistemicIntent, ClaimContext, EpistemicPolicy } from '../../server/src/maestro/epistemic/intent-evaluate';

describe('evaluateEpistemicIntent', () => {
  const policy: EpistemicPolicy = {
    policyId: 'pol-osint-01',
    minIndependentSources: 2,
    maxConflictScore: 0.2,
    minSupportScore: 0.8,
  };

  test('should APPROVE when all conditions are met', () => {
    const ctx: ClaimContext = {
      claimId: 'claim-123',
      evidenceIds: ['ev-1', 'ev-2'],
      independentSourceCount: 2,
      conflictScore: 0.1,
      supportScore: 0.9,
    };
    const decision = evaluateEpistemicIntent(ctx, policy);
    assert.strictEqual(decision.decision, 'APPROVE');
  });

  test('should BLOCK when evidence is missing', () => {
    const ctx: ClaimContext = {
      claimId: 'claim-123',
      evidenceIds: [],
      independentSourceCount: 2,
      conflictScore: 0.1,
      supportScore: 0.9,
    };
    const decision = evaluateEpistemicIntent(ctx, policy);
    assert.strictEqual(decision.decision, 'BLOCK');
    assert.strictEqual(decision.reason, 'missing_evidence');
  });

  test('should ESCALATE when independent sources are insufficient', () => {
    const ctx: ClaimContext = {
      claimId: 'claim-123',
      evidenceIds: ['ev-1'],
      independentSourceCount: 1,
      conflictScore: 0.1,
      supportScore: 0.9,
    };
    const decision = evaluateEpistemicIntent(ctx, policy);
    assert.strictEqual(decision.decision, 'ESCALATE');
    assert.strictEqual(decision.reason, 'insufficient_independent_sources');
  });

  test('should BLOCK when conflict score is too high', () => {
    const ctx: ClaimContext = {
      claimId: 'claim-123',
      evidenceIds: ['ev-1', 'ev-2'],
      independentSourceCount: 2,
      conflictScore: 0.5,
      supportScore: 0.9,
    };
    const decision = evaluateEpistemicIntent(ctx, policy);
    assert.strictEqual(decision.decision, 'BLOCK');
    assert.strictEqual(decision.reason, 'active_conflict');
  });

  test('should DEGRADE when support score is too low', () => {
    const ctx: ClaimContext = {
      claimId: 'claim-123',
      evidenceIds: ['ev-1', 'ev-2'],
      independentSourceCount: 2,
      conflictScore: 0.1,
      supportScore: 0.5,
    };
    const decision = evaluateEpistemicIntent(ctx, policy);
    assert.strictEqual(decision.decision, 'DEGRADE');
    assert.strictEqual(decision.reason, 'low_support');
  });
});
