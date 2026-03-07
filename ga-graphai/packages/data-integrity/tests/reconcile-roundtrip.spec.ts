import { describe, expect, it } from "vitest";
import { reconcile, verifyRoundtrip } from "../src/index.js";

describe("reconciliation", () => {
  it("produces deterministic drift report", () => {
    const report = reconcile(
      "case-1",
      { name: "graph", count: 3, ids: ["a", "b", "c"], checksums: { a: "1", b: "2", c: "3" } },
      { name: "doc", count: 2, ids: ["a", "c"], checksums: { a: "1", c: "999" } },
      { seed: 1, sampleSize: 2 }
    );
    expect(report.missingInB).toEqual(["b"]);
    expect(report.stale).toContain("c");
  });
});

describe("roundtrip verifier", () => {
  it("fails closed with actionable mismatch list", () => {
    const bundle = [
      {
        id: "1",
        type: "entity",
        payload: { __hash: "bad", name: "Alice" },
        references: ["missing"],
      },
      { id: "2", type: "entity", payload: { __hash: "bad", name: "Bob" } },
    ];
    const report = verifyRoundtrip(bundle, { expectedCount: 3 });
    expect(report.ok).toBe(false);
    expect(report.mismatches.length).toBeGreaterThan(0);
  });
});
