import assert from 'node:assert/strict';
import test from 'node:test';
import path from 'node:path';

import { runReportGate } from '../enforce_report_from_claims.mjs';

const fixturesRoot = path.join('scripts', 'gates', '__tests__', 'fixtures');

test('runReportGate passes clean reporting fixtures', () => {
  const violations = runReportGate({
    scanDirs: [path.join(fixturesRoot, 'reporting-good')],
    allowlist: [],
  });

  assert.deepEqual(violations, []);
});

test('runReportGate reports raw context violations', () => {
  const violations = runReportGate({
    scanDirs: [path.join(fixturesRoot, 'reporting-bad')],
    allowlist: [],
  });

  assert.equal(violations.length, 2);
  assert.ok(violations.every((violation) => violation.file.endsWith('bad-report.ts')));
});
