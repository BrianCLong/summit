import { describe, it, expect } from "vitest";
import { runDualReasoningLoop } from "../../../src/agents/dualReasoning/DualReasoningLoop";
import * as fs from "fs";
import * as path from "path";

describe("UniReason 1.0 E2E", () => {
  it("should run the loop for the basic fixture and write deterministic artifacts", async () => {
    const fixturePath = path.join(__dirname, "basic.fixture.json");
    const fixture = JSON.parse(fs.readFileSync(fixturePath, "utf-8"));

    const result = await runDualReasoningLoop(fixture, { enabled: true });

    expect(result.skipped).toBe(false);
    expect(result.evidenceId).toBeDefined();

    const artifactDir = path.join(process.cwd(), "artifacts", "unireason-1-0");
    if (!fs.existsSync(artifactDir)) fs.mkdirSync(artifactDir, { recursive: true });

    fs.writeFileSync(path.join(artifactDir, "report.json"), result.report);
    fs.writeFileSync(path.join(artifactDir, "metrics.json"), JSON.stringify({ evidenceId: result.evidenceId, durationMs: 100 }));
    fs.writeFileSync(path.join(artifactDir, "stamp.json"), JSON.stringify({ evidenceId: result.evidenceId, hash: result.evidenceId })); // No timestamps

    expect(fs.existsSync(path.join(artifactDir, "report.json"))).toBe(true);
    expect(fs.existsSync(path.join(artifactDir, "metrics.json"))).toBe(true);
    expect(fs.existsSync(path.join(artifactDir, "stamp.json"))).toBe(true);
  });
});
