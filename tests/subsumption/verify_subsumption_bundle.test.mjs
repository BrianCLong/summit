import { describe, test } from 'node:test';
import assert from 'node:assert';
import { execSync } from 'node:child_process';
import path from 'node:path';

const script = path.resolve('scripts/ci/verify_subsumption_bundle.mjs');
const validManifest = path.resolve('subsumption/azure-turin-v7/manifest.yaml');
const denyFixture = path.resolve('subsumption/azure-turin-v7/policy/fixtures/deny/unknown-claim.yaml');

describe('verify_subsumption_bundle', () => {
  test('passes on valid manifest', () => {
    // Should exit code 0
    execSync(`node ${script} ${validManifest}`);
  });

  test('fails on deny fixture', () => {
    try {
      execSync(`node ${script} ${denyFixture}`, { stdio: 'pipe' });
      assert.fail('Should have failed');
    } catch (e) {
      assert.notStrictEqual(e.status, 0);
    }
  });
});
