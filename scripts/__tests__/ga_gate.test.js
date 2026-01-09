import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import yaml from 'js-yaml';

test('GA Gate Workflow Configuration', (t) => {
  const fileContents = fs.readFileSync('.github/workflows/ci.yml', 'utf8');
  const workflow = yaml.load(fileContents);

  // 1. Job Existence
  assert.ok(workflow.jobs.ga_gate, 'ga_gate job must exist');

  // 2. Job Name
  assert.strictEqual(workflow.jobs.ga_gate.name, 'ga / gate', 'Job name must be "ga / gate"');

  // 3. Dependencies
  const required = [
    'format-check',
    'lint',
    'verify',
    'test',
    'golden-path',
    'reproducible-build',
    'governance',
    'provenance',
    'schema-diff',
    'ecosystem-exports',
    'security',
    'ga-risk-gate',
    'build-server-image'
  ];
  const actual = workflow.jobs.ga_gate.needs;
  required.forEach(req => {
     assert.ok(actual.includes(req), `ga_gate must depend on ${req}`);
  });

  // 4. Always Run
  assert.strictEqual(workflow.jobs.ga_gate.if, 'always()');

  // 5. No paths-ignore in pull_request
  if (workflow.on.pull_request) {
    assert.strictEqual(workflow.on.pull_request['paths-ignore'], undefined, 'pull_request should not have paths-ignore');
  }
});

test('Branch Protection Script', (t) => {
   const script = fs.readFileSync('scripts/setup-branch-protection.sh', 'utf8');
   assert.match(script, /"ga \/ gate"/, 'Script must require "ga / gate"');
   assert.doesNotMatch(script, /"🔍 PR Validation"/, 'Script must not require old checks');
});
