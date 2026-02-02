import assert from 'node:assert/strict';
import { test, describe } from 'node:test';
import yaml from 'js-yaml';
import { scanTimestampKeys, scanTimestampValues } from '../lib/evidence_id_consistency.mjs';

describe('YAML timestamp scanning', () => {
  test('detects timestamps in anchored values', () => {
    const doc = `
shared: &ts
  created_at: 2026-01-01T00:00:00Z
entry:
  meta: *ts
`;
    const parsed = yaml.load(doc);
    assert.deepEqual(scanTimestampKeys(parsed), [
      'shared.created_at',
      'entry.meta.created_at',
    ]);
  });

  test('detects timestamp values in anchored strings', () => {
    const doc = `
shared: &log "Started at 2026-01-01T00:00:00Z"
entry:
  message: *log
`;
    const parsed = yaml.load(doc);
    assert.deepEqual(scanTimestampValues(parsed), [
      'shared',
      'entry.message',
    ]);
  });
});
