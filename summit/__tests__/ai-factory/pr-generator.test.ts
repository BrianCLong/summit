import test from 'node:test';
import assert from 'node:assert';
import { generatePRWorkItem } from '../../agents/factory/pr-generator';
import fs from 'node:fs';

test('generatePRWorkItem produces expected artifacts', () => {
  fs.mkdirSync('artifacts/test-gen', { recursive: true });
  generatePRWorkItem('test-item', 'artifacts/test-gen');

  assert.ok(fs.existsSync('artifacts/test-gen/diff.patch'));
  assert.ok(fs.existsSync('artifacts/test-gen/metrics.json'));
  assert.ok(fs.existsSync('artifacts/test-gen/stamp.json'));
  assert.ok(fs.existsSync('artifacts/test-gen/evidence.json'));
});
