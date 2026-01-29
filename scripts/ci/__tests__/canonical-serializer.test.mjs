import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { canonicalJsonStringify } from '../lib/canonical-serializer.mjs';

describe('canonical-serializer', () => {
  test('uses codepoint ordering for object keys', () => {
    const input = { a: 2, Z: 1 };
    const output = canonicalJsonStringify(input);

    assert.strictEqual(output, '{"Z":1,"a":2}');
  });
});
