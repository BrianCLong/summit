import test from 'node:test';
import assert from 'node:assert';
import { generateManifest, computeDigest } from '../manifest.js';

test('generateManifest creates a valid manifest', (t) => {
  const runId = 'test-run-id';
  const manifest = generateManifest(runId, [], []);
  assert.strictEqual(manifest.runId, runId);
  assert.strictEqual(manifest.version, '1.0.0');
});

test('computeDigest returns a valid sha256', (t) => {
  const content = 'hello world';
  const digest = computeDigest(content);
  assert.strictEqual(digest, 'b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9');
});
