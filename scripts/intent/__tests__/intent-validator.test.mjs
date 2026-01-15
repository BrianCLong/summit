import { describe, test } from 'node:test';
import assert from 'node:assert';
import {
  evaluateChangeContracts,
  isSensitiveChange,
  validateIntentSpec
} from '../intent-validator.mjs';

const baseIntent = {
  problem_statement: 'Ensure intent specs validate for governance gates.',
  user_impact: 'Reviewers get consistent intent metadata for changes.',
  non_goals: ['Implement provenance ledger in this step.'],
  constraints: [
    { category: 'security', detail: 'Do not log secrets in validation output.' }
  ],
  invariants: ['Intent specs must remain machine-validated.'],
  acceptance_tests: [
    {
      id: 'intent-validate',
      description: 'Run intent validator against sample spec.',
      type: 'automated',
      command: 'node scripts/intent/summit-intent.mjs validate'
    }
  ],
  risk_level: {
    level: 'low',
    rationale: 'Validation-only changes with no runtime impact.'
  }
};

describe('intent-validator', () => {
  test('accepts valid intent specs', () => {
    const result = validateIntentSpec(baseIntent);
    assert.strictEqual(result.valid, true);
    assert.deepStrictEqual(result.errors, []);
  });

  test('flags missing required fields', () => {
    const { valid, errors } = validateIntentSpec({});
    assert.strictEqual(valid, false);
    assert.ok(errors.length > 0);
  });

  test('detects sensitive change contracts missing automated tests', () => {
    const intent = {
      ...baseIntent,
      acceptance_tests: [
        {
          description: 'Manual inspection only.',
          type: 'manual'
        }
      ]
    };

    const findings = evaluateChangeContracts(intent, ['server/src/security/audit.ts']);
    assert.ok(findings.length > 0);
  });

  test('matches sensitive file globs', () => {
    assert.strictEqual(isSensitiveChange(['server/src/security/audit.ts']), true);
    assert.strictEqual(isSensitiveChange(['docs/intent-spec.md']), false);
  });
});
