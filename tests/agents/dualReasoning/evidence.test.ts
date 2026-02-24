import { buildEvidenceId, canonicalJson, persistEvidence } from "../../../src/agents/dualReasoning/evidence";
import { DualReasoningInput, DualReasoningReport } from "../../../src/agents/dualReasoning/types";
import * as fs from 'fs/promises';
import * as path from 'path';

describe("DualReasoning Evidence", () => {
  const input: DualReasoningInput = {
    instruction: "Generate a science image",
    domain: "science"
  };

  const report: DualReasoningReport = {
    plan: { domain: "science", steps: ["Step 1"] },
    draft: { output: "Draft" },
    verify: { issues: [], dimensions: ["d1"] },
    refine: { output: "Refined" },
    judge: { better: "refine", rationale: ["Reason"] }
  };

  it("should generate a stable evidence ID", () => {
    const id1 = buildEvidenceId(input, report);
    const id2 = buildEvidenceId(input, report);
    expect(id1).toBe(id2);
    expect(id1).toMatch(/^[a-f0-9]{64}$/);
  });

  it("should be deterministic regardless of key order", () => {
    const reportAlt: any = {
      judge: { rationale: ["Reason"], better: "refine" },
      refine: { output: "Refined" },
      verify: { dimensions: ["d1"], issues: [] },
      draft: { output: "Draft" },
      plan: { steps: ["Step 1"], domain: "science" }
    };

    const id1 = buildEvidenceId(input, report);
    const id2 = buildEvidenceId(input, reportAlt as DualReasoningReport);
    expect(id1).toBe(id2);
  });

  it("should produce canonical JSON with sorted keys", () => {
    const obj = { b: 2, a: 1, c: { e: 5, d: 4 } };
    const canonical = canonicalJson(obj);
    const keys = Object.keys(canonical);
    expect(keys).toEqual(["a", "b", "c"]);
    expect(Object.keys(canonical.c)).toEqual(["d", "e"]);
  });

  it("should handle budget limits", async () => {
    const budget = { maxSizeInBytes: 10, currentSizeInBytes: 0 };
    await expect(persistEvidence("test-id", report, budget)).rejects.toThrow("Evidence budget exceeded");
  });
});
