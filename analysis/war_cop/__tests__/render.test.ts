import { describe, it } from "node:test";
import * as assert from "node:assert";
const expect = (actual) => ({ toBe: (expected) => assert.strictEqual(actual, expected), toContain: (expected) => assert.ok(actual.includes(expected)) });

import { generateArtifactSet } from '../render';

describe('generateArtifactSet', () => {
  it('returns correctly typed paths', () => {
    const set = generateArtifactSet();
    expect(set.report_json_path).toBe('artifacts/war-cop/report.json');
  });
});
