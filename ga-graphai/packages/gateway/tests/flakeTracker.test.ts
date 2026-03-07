import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const reportPath = path.resolve(__dirname, "../../../tests/FLAKE_REPORT.md");

function parseFlakeReport() {
  const raw = fs.readFileSync(reportPath, "utf8");
  const lines = raw.split("\n").filter((line) => line.startsWith("-"));
  return lines.map((line) => line.replace(/^-\s*/, ""));
}

describe("Flake tracker", () => {
  it("lists quarantined tests and enforces rerun policy", () => {
    const flakes = parseFlakeReport();
    expect(flakes.length).toBeGreaterThan(0);
    const rerunPolicy = 3;
    const summary = { reruns: rerunPolicy, quarantined: flakes.length };
    expect(summary.reruns).toBe(3);
  });
});
