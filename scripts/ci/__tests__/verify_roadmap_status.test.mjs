import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { verifyRoadmapStatus } from '../verify_roadmap_status.mjs';

function withTempFile(content) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'roadmap-status-'));
  const file = path.join(dir, 'STATUS.json');
  fs.writeFileSync(file, JSON.stringify(content, null, 2));
  return file;
}

test('verifyRoadmapStatus passes when summary.total matches initiatives length', () => {
  const file = withTempFile({
    initiatives: [{ id: 'one' }, { id: 'two' }],
    summary: { total: 2 },
  });

  const result = verifyRoadmapStatus(file);

  assert.equal(result.computedTotal, 2);
  assert.equal(result.declaredTotal, 2);
});

test('verifyRoadmapStatus throws when summary.total mismatches initiatives length', () => {
  const file = withTempFile({
    initiatives: [{ id: 'one' }, { id: 'two' }],
    summary: { total: 1 },
  });

  assert.throws(
    () => verifyRoadmapStatus(file),
    /summary.total mismatch: expected 2, received 1/,
  );
});
