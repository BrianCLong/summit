import test from 'node:test';
import assert from 'node:assert/strict';

import {
  type PolicyDocument,
  validatePolicySemantics,
} from '../../summit/agents/policy/validate-semantics';

const skillRegistry = {
  'release.approve': {
    name: 'release.approve',
    risk: 'high' as const,
    scopes: ['repo.write'],
  },
  'builder.secret.read': {
    name: 'builder.secret.read',
    risk: 'medium' as const,
    scopes: ['secrets.read'],
  },
};

test('semantic validator catches missing approvals for high-risk prod allow', () => {
  const policy: PolicyDocument = {
    default: 'deny',
    rules: [
      {
        id: 'prod-high-risk-no-approval',
        effect: 'allow',
        env: ['prod'],
        agent_role: 'governance',
        skills: ['release.approve'],
        scopes: ['repo.write'],
      },
    ],
  };

  const result = validatePolicySemantics(policy, skillRegistry);

  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => error.code === 'PROD_HIGH_RISK_APPROVALS'));
});

test('semantic validator denies builder with secrets scope in prod', () => {
  const policy: PolicyDocument = {
    default: 'deny',
    rules: [
      {
        id: 'builder-secret-prod',
        effect: 'allow',
        env: ['prod'],
        agent_role: 'builder',
        skills: ['builder.secret.read'],
        scopes: ['secrets.read'],
        annotations: {
          approvals: ['governance'],
        },
      },
    ],
  };

  const result = validatePolicySemantics(policy, skillRegistry);

  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => error.code === 'BUILDER_PROD_SECRETS_SCOPE'));
});
