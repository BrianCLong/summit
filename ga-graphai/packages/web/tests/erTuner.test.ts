import { describe, expect, it } from "vitest";
import { buildThresholdReport } from "../src/er-tuner.js";

describe("ER threshold tuner", () => {
  it("computes precision and recall per threshold", () => {
    const report = buildThresholdReport(
      [
        { score: 0.95, isMatch: true },
        { score: 0.91, isMatch: true },
        { score: 0.82, isMatch: false },
        { score: 0.6, isMatch: true },
      ],
      [0.9, 0.8]
    );
    expect(report).toHaveLength(2);
    expect(report[0].precision).toBeGreaterThan(0.5);
    expect(report[1].recall).toBeGreaterThan(0);
  });
});
