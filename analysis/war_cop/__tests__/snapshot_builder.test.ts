import * as assert from "node:assert";
import { describe, it } from "node:test";
const expect = (actual) => ({
  toBe: (expected) => assert.strictEqual(actual, expected),
  toContain: (expected) => assert.ok(actual.includes(expected)),
});

import { buildSnapshot } from "../snapshot_builder";

describe("buildSnapshot", () => {
  it("builds a snapshot", () => {
    const snap = buildSnapshot("SNAP:WARCOP:202301010000", "2023-01-01T00:00:00Z", 10, 20);
    expect(snap.snapshot_id).toBe("SNAP:WARCOP:202301010000");
    expect(snap.source_count).toBe(10);
    expect(snap.claim_count).toBe(20);
    expect(snap.deterministic_build).toBe(true);
  });
});
