import test from 'node:test';
import assert from 'node:assert';
import { generateRunId } from '../runid.js';

test('generateRunId returns a valid uuid', (t) => {
  const runId = generateRunId();
  assert.strictEqual(typeof runId, 'string');
  assert.strictEqual(runId.length, 36);
});
