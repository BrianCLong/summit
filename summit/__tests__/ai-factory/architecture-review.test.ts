import test from 'node:test';
import assert from 'node:assert';
import { reviewTouchedPaths } from '../../agents/factory/architecture-review';

test('reviewTouchedPaths identifies violations correctly', () => {
  const allowlist = ['agents/factory/', 'docs/'];

  const resultPass = reviewTouchedPaths(['agents/factory/types.ts', 'docs/README.md'], allowlist);
  assert.strictEqual(resultPass.passed, true);
  assert.strictEqual(resultPass.violations.length, 0);

  const resultFail = reviewTouchedPaths(['agents/factory/types.ts', 'unauthorized/file.ts'], allowlist);
  assert.strictEqual(resultFail.passed, false);
  assert.strictEqual(resultFail.violations.length, 1);
  assert.strictEqual(resultFail.violations[0], 'unauthorized/file.ts');
});
