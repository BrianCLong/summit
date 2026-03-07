import { test, describe } from 'node:test';
import * as assert from 'node:assert';
import { evaluateEpistemicIntent, ClaimContext, EpistemicPolicy } from '../src/epistemic';

describe('Epistemic Intent Evaluation', () => {
  const policy: EpistemicPolicy = {
    policyId: 'osint-high-impact',
    minSupportScore: 0.8,
    maxEpistemicUncertainty: 0.3,
    minIndependentSources: 2,
    maxConflictScore: 0.1,
  };

  test('blocks when evidence is missing', () => {
    const ctx: ClaimContext = {
      claimId: 'claim-1',
      supportScore: 0.9,
      epistemicUncertainty: 0.1,
      conflictScore: 0,
      independentSourceCount: 3,
      evidenceIds: [],
    };
    const result = evaluateEpistemicIntent(ctx, policy);
    assert.strictEqual(result.decision, 'BLOCK');
    assert.strictEqual(result.rationale, 'missing_evidence');
  });

  test('escalates on insufficient independent sources', () => {
    const ctx: ClaimContext = {
      claimId: 'claim-2',
      supportScore: 0.9,
      epistemicUncertainty: 0.1,
      conflictScore: 0,
      independentSourceCount: 1,
      evidenceIds: ['ev-1'],
    };
    const result = evaluateEpistemicIntent(ctx, policy);
    assert.strictEqual(result.decision, 'ESCALATE');
    assert.strictEqual(result.rationale, 'insufficient_independent_sources');
  });

  test('blocks on active conflict', () => {
    const ctx: ClaimContext = {
      claimId: 'claim-3',
      supportScore: 0.9,
      epistemicUncertainty: 0.1,
      conflictScore: 0.5,
      independentSourceCount: 3,
      evidenceIds: ['ev-1', 'ev-2', 'ev-3'],
    };
    const result = evaluateEpistemicIntent(ctx, policy);
    assert.strictEqual(result.decision, 'BLOCK');
    assert.strictEqual(result.rationale, 'active_conflict');
  });

  test('degrades on low support score', () => {
    const ctx: ClaimContext = {
      claimId: 'claim-4',
      supportScore: 0.6,
      epistemicUncertainty: 0.1,
      conflictScore: 0,
      independentSourceCount: 3,
      evidenceIds: ['ev-1', 'ev-2', 'ev-3'],
    };
    const result = evaluateEpistemicIntent(ctx, policy);
    assert.strictEqual(result.decision, 'DEGRADE');
    assert.strictEqual(result.rationale, 'low_support');
  });

  test('escalates on high epistemic uncertainty', () => {
    const ctx: ClaimContext = {
      claimId: 'claim-5',
      supportScore: 0.9,
      epistemicUncertainty: 0.5,
      conflictScore: 0,
      independentSourceCount: 3,
      evidenceIds: ['ev-1', 'ev-2', 'ev-3'],
    };
    const result = evaluateEpistemicIntent(ctx, policy);
    assert.strictEqual(result.decision, 'ESCALATE');
    assert.strictEqual(result.rationale, 'high_epistemic_uncertainty');
  });

  test('approves when all policy thresholds are met', () => {
    const ctx: ClaimContext = {
      claimId: 'claim-6',
      supportScore: 0.9,
      epistemicUncertainty: 0.2,
      conflictScore: 0,
      independentSourceCount: 3,
      evidenceIds: ['ev-1', 'ev-2', 'ev-3'],
    };
    const result = evaluateEpistemicIntent(ctx, policy);
    assert.strictEqual(result.decision, 'APPROVE');
    assert.strictEqual(result.rationale, 'policy_satisfied');
  });
});
