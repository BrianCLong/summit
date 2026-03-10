import { describe, it } from "node:test";
import * as assert from "node:assert";
const expect = (actual) => ({ toBe: (expected) => assert.strictEqual(actual, expected), toContain: (expected) => assert.ok(actual.includes(expected)) });

import { traceAssertion } from '../explain_assertion';

describe('traceAssertion', () => {
  it('returns trace', () => {
    const trace = traceAssertion('ASSERT:1');
    expect(trace.assertion_id).toBe('ASSERT:1');
  });
});
