import { describe, it, expect } from "@jest/globals";
import { extractDifficultyFeatures, scoreDifficultyFromFeatures, detectDomain } from "../heuristics";

describe("difficulty heuristics", () => {
  it("scores short simple queries low", () => {
    const f = extractDifficultyFeatures("What time is it in Denver?");
    const s = scoreDifficultyFromFeatures(f);
    expect(s).toBeLessThan(0.35);
  });

  it("scores multi-step engineering prompts higher", () => {
    const q = `
Build a router. Requirements:
- must be cost-aware
- add tests
- add metrics
\`\`\`ts
export function x() {}
\`\`\`
`;
    const f = extractDifficultyFeatures(q);
    const s = scoreDifficultyFromFeatures(f);
    expect(s).toBeGreaterThan(0.55);
  });

  it("detects domain hints", () => {
    expect(detectDomain("Investigate CVE-2025-XXXX and propose mitigations")).toBe("security");
  });
});
