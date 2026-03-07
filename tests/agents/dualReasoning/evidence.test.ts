import { describe, it, expect } from "vitest";
import { buildEvidenceId, canonicalJson } from "../../../src/agents/dualReasoning/evidence";

describe("Evidence Determinism", () => {
  it("should produce the same evidenceId for identical inputs and reports", () => {
    const input = { instruction: "test" };
    const report = { status: "success" };

    const id1 = buildEvidenceId(input, report);
    const id2 = buildEvidenceId(input, report);

    expect(id1).toBe(id2);
  });

  it("should produce different evidenceIds for different reports", () => {
    const input = { instruction: "test" };
    const report1 = { status: "success" };
    const report2 = { status: "failure" };

    const id1 = buildEvidenceId(input, report1);
    const id2 = buildEvidenceId(input, report2);

    expect(id1).not.toBe(id2);
  });

  it("should correctly handle arrays of objects", () => {
    const report1 = { issues: [{ id: 1, msg: "A" }, { id: 2, msg: "B" }] };
    const report2 = { issues: [{ id: 1, msg: "A" }, { id: 2, msg: "B" }] };

    expect(canonicalJson(report1)).toBe(canonicalJson(report2));
    expect(buildEvidenceId({}, report1)).toBe(buildEvidenceId({}, report2));
  });
});
