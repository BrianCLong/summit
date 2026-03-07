import test from 'node:test';
import assert from 'node:assert/strict';

import { evaluatePolicyContext } from '../../../src/companyos/policy/localEvaluator.js';

const baseContext = {
  orgId: 'org-1',
  actorId: 'analyst-1',
  action: 'TOOL_INVOKE',
  toolName: 'intel.search',
  tokenEstimate: 200,
  riskTier: 'med',
};

test('denies by default when no policies are provided', () => {
  const decision = evaluatePolicyContext(baseContext, []);

  assert.equal(decision.allowed, false);
  assert.deepEqual(decision.policyIds, []);
  assert.ok(decision.reasons.includes('deny_by_default'));
});

test('allows when a rule fully matches context', () => {
  const policies = [
    {
      policyId: 'policy-allow-1',
      orgId: 'org-1',
      actions: ['TOOL_INVOKE'],
      actorIds: ['analyst-1'],
      allowedTools: ['intel.search'],
      maxTokenEstimate: 500,
      requiredRiskTierAtMost: 'high',
    },
  ];

  const decision = evaluatePolicyContext(baseContext, policies);

  assert.equal(decision.allowed, true);
  assert.deepEqual(decision.policyIds, ['policy-allow-1']);
  assert.deepEqual(decision.reasons, ['allow']);
});

test('denies when token estimate exceeds policy budget', () => {
  const policies = [
    {
      policyId: 'policy-budget-1',
      orgId: 'org-1',
      actions: ['TOOL_INVOKE'],
      allowedTools: ['intel.search'],
      maxTokenEstimate: 100,
    },
  ];

  const decision = evaluatePolicyContext(baseContext, policies);

  assert.equal(decision.allowed, false);
  assert.ok(decision.reasons.includes('deny_by_default'));
});

test('produces deterministic decision id for same input', () => {
  const policies = [
    {
      policyId: 'policy-allow-1',
      orgId: 'org-1',
      actions: ['TOOL_INVOKE'],
      allowedTools: ['intel.search'],
      maxTokenEstimate: 500,
    },
  ];

  const first = evaluatePolicyContext(baseContext, policies);
  const second = evaluatePolicyContext(baseContext, policies);

  assert.equal(first.decisionId, second.decisionId);
});
