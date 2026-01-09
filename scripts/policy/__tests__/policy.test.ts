
import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { execSync } from 'child_process';

const POLICY_PATH = 'policies/promotion-policy.yml';
const SCRIPT_PATH = 'scripts/policy/evaluate_promotion_policy.ts';

test('Policy Evaluation Logic', async (t) => {
  const policyContent = fs.readFileSync(POLICY_PATH, 'utf8');
  const policy = yaml.load(policyContent) as any;

  // Helper to run script
  function runEvaluation(context: any): any {
    const env = { ...process.env, PROMOTION_CONTEXT: JSON.stringify(context), OUTPUT_PATH: 'test_output.json' };
    try {
        execSync(`npx tsx ${SCRIPT_PATH}`, { env, stdio: 'pipe' });
    } catch (e: any) {
        // Script exits with 1 on DENY, which is fine, we want to check output
    }
    if (fs.existsSync('test_output.json')) {
        const output = JSON.parse(fs.readFileSync('test_output.json', 'utf8'));
        fs.unlinkSync('test_output.json');
        return output;
    }
    return null;
  }

  await t.test('DENY: Outside change window', () => {
    // Construct a time outside the window (e.g., Saturday)
    const context = {
        environment: 'production',
        actor: 'dev',
        approvals: ['approver1', 'approver2'],
        checks_status: { "Release Promotion Guard": "success", "CI Core": "success", "Security Scan": "success" },
        commit_sha: 'abc',
        version: '1.0.0',
        timestamp: '2023-10-28T12:00:00Z', // Saturday
        workflow_metadata: { run_id: '1', url: 'url' }
    };

    const result = runEvaluation(context);
    assert.strictEqual(result.evaluation_result.verdict, 'DENY');
    assert.ok(result.evaluation_result.reasons.some((r: any) => r.code === 'OUTSIDE_CHANGE_WINDOW'));
  });

  await t.test('DENY: Missing approvals', () => {
    const context = {
        environment: 'production',
        actor: 'dev',
        approvals: ['approver1'], // Only 1, need 2
        checks_status: { "Release Promotion Guard": "success", "CI Core": "success", "Security Scan": "success" },
        commit_sha: 'abc',
        version: '1.0.0',
        timestamp: '2023-10-25T12:00:00Z', // Wednesday (Valid day)
        workflow_metadata: { run_id: '1', url: 'url' }
    };

    const result = runEvaluation(context);
    assert.strictEqual(result.evaluation_result.verdict, 'DENY');
    assert.ok(result.evaluation_result.reasons.some((r: any) => r.code === 'INSUFFICIENT_APPROVALS'));
  });

   await t.test('DENY: Missing checks', () => {
    const context = {
        environment: 'production',
        actor: 'dev',
        approvals: ['approver1', 'approver2'],
        checks_status: { "Release Promotion Guard": "success" }, // Missing others
        commit_sha: 'abc',
        version: '1.0.0',
        timestamp: '2023-10-25T12:00:00Z',
        workflow_metadata: { run_id: '1', url: 'url' }
    };

    const result = runEvaluation(context);
    assert.strictEqual(result.evaluation_result.verdict, 'DENY');
    assert.ok(result.evaluation_result.reasons.some((r: any) => r.code === 'CHECK_FAILED'));
  });

  await t.test('ALLOW: Happy path', () => {
    const context = {
        environment: 'production',
        actor: 'dev',
        approvals: ['approver1', 'approver2'],
        checks_status: { "Release Promotion Guard": "success", "CI Core": "success", "Security Scan": "success" },
        commit_sha: 'abc',
        version: '1.0.0',
        timestamp: '2023-10-25T12:00:00Z', // Wednesday 12:00 UTC (Valid)
        workflow_metadata: { run_id: '1', url: 'url' }
    };

    const result = runEvaluation(context);
    assert.strictEqual(result.evaluation_result.verdict, 'ALLOW');
  });

  await t.test('ALLOW: Emergency Override', () => {
    const context = {
        environment: 'production',
        actor: 'dev',
        approvals: ['a1', 'a2', 'a3'], // Need 3 for override
        checks_status: {},
        commit_sha: 'abc',
        version: '1.0.0',
        timestamp: '2023-10-28T12:00:00Z', // Saturday (Invalid window, but override)
        workflow_metadata: { run_id: '1', url: 'url' },
        override: {
            active: true,
            justification: "Fixing prod",
            approvers: ['a1', 'a2', 'a3']
        }
    };

    const result = runEvaluation(context);
    assert.strictEqual(result.evaluation_result.verdict, 'ALLOW');
    assert.ok(result.evaluation_result.reasons.some((r: any) => r.code === 'OVERRIDE_ACCEPTED'));
  });
});
