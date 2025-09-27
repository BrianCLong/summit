import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  DEFAULT_RULE_CATALOG,
  PolicyDelta,
  runLtdim,
  RunOptions,
  RunResult,
  verifyImpactReportSignature
} from '../tools/legal/ltdim/index';

function toSerializableDelta(delta: PolicyDelta) {
  return {
    policyId: delta.policyId,
    ruleId: delta.ruleId,
    clauseId: delta.clauseId,
    changeType: delta.changeType,
    clauseHeading: delta.clauseHeading,
    clauseExcerpt: delta.clauseExcerpt,
    action: delta.action,
    status: delta.status,
    summary: delta.summary,
    beforeState: delta.beforeState ?? null,
    afterState: delta.afterState ?? null,
    obligations: delta.obligations,
    sloImpact: delta.sloImpact
  };
}

const currentDir = path.dirname(fileURLToPath(import.meta.url));

function loadFixture(name: string) {
  return fs.readFileSync(path.join(currentDir, 'fixtures', 'ltdim', name), 'utf8');
}

function loadJsonFixture<T>(name: string): T {
  const raw = loadFixture(name);
  return JSON.parse(raw) as T;
}

const baselineText = loadFixture('baseline.txt');
const revisedText = loadFixture('revised.txt');

const options: RunOptions = {
  baselineDoc: { name: 'IntelGraph DPA', version: '2024.01', text: baselineText },
  revisedDoc: { name: 'IntelGraph DPA', version: '2025.02', text: revisedText },
  catalog: DEFAULT_RULE_CATALOG,
  timestamp: '2025-01-01T00:00:00.000Z'
};

const result: RunResult = runLtdim(options);

const expectedPolicyDeltas = loadJsonFixture<Array<ReturnType<typeof toSerializableDelta>>>(
  'expected-policy-deltas.json'
);
const expectedImpactSummary = loadJsonFixture<typeof result.impactSummary>('expected-impact-summary.json');
const expectedPolicyPr = loadJsonFixture<typeof result.pullRequest>('expected-policy-pr.json');

test('maps clause changes to deterministic policy deltas', () => {
  const actual = result.policyDeltas.map(toSerializableDelta);
  assert.deepStrictEqual(actual, expectedPolicyDeltas);
});

test('simulator impact matches golden snapshot', () => {
  assert.deepStrictEqual(result.impactSummary, expectedImpactSummary);
});

test('generates a policy PR view with structured diffs', () => {
  assert.deepStrictEqual(result.pullRequest, expectedPolicyPr);
});

test('produces a signed impact report that verifies offline', () => {
  const { canonicalPayload, signature, publicKey } = result.signedReport;
  assert.ok(verifyImpactReportSignature(canonicalPayload, signature, publicKey));
});

test('is deterministic for seeded clause changes', () => {
  const rerun = runLtdim(options);
  assert.strictEqual(rerun.signedReport.canonicalPayload, result.signedReport.canonicalPayload);
  assert.deepStrictEqual(rerun.policyDeltas.map(toSerializableDelta), result.policyDeltas.map(toSerializableDelta));
});
