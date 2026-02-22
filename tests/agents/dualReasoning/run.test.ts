import { runDualReasoningLoop } from "../../../src/agents/dualReasoning/DualReasoningLoop";
import { persistEvidence } from "../../../src/agents/dualReasoning/evidence";
import * as fs from 'fs/promises';
import * as path from 'path';

describe("UniReason 1.0 E2E Fixture", () => {
  const fixturePath = path.join(process.cwd(), "tests/e2e/unireason-1-0/basic.fixture.json");
  const artifactsDir = "artifacts/unireason-1-0";

  beforeAll(async () => {
    // Ensure fixture exists for the test
    await fs.mkdir(path.dirname(fixturePath), { recursive: true });
    await fs.writeFile(fixturePath, JSON.stringify({
      id: "fixture-basic-science",
      input: {
        instruction: "A photorealistic image of a DNA double helix in a futuristic lab.",
        domain: "science"
      },
      config: {
        enabled: true,
        verifyDimensions: ["presence", "accuracy", "realism"]
      }
    }));
  });

  it("should run the golden fixture and produce deterministic artifacts", async () => {
    const fixture = JSON.parse(await fs.readFile(fixturePath, "utf-8"));

    const result = await runDualReasoningLoop(fixture.input, fixture.config);

    expect(result.skipped).toBe(false);
    expect(result.evidenceId).toBeDefined();
    expect(result.report).toBeDefined();

    // Persist artifacts
    await persistEvidence(result.evidenceId!, result.report);

    // Verify files exist
    const reportPath = path.join(process.cwd(), artifactsDir, "report.json");
    const metricsPath = path.join(process.cwd(), artifactsDir, "metrics.json");
    const stampPath = path.join(process.cwd(), artifactsDir, "stamp.json");

    const reportExists = await fs.access(reportPath).then(() => true).catch(() => false);
    const metricsExists = await fs.access(metricsPath).then(() => true).catch(() => false);
    const stampExists = await fs.access(stampPath).then(() => true).catch(() => false);

    expect(reportExists).toBe(true);
    expect(metricsExists).toBe(true);
    expect(stampExists).toBe(true);

    // Verify determinism (no timestamps in report)
    const reportContent = await fs.readFile(reportPath, "utf-8");
    // Should NOT contain ISO timestamps
    expect(reportContent).not.toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);

    // Verify redaction
    expect(reportContent).toContain("[REDACTED]");
    expect(reportContent).not.toContain(fixture.input.instruction);

    // Verify stamp content (no timestamps)
    const stampContent = JSON.parse(await fs.readFile(stampPath, "utf-8"));
    expect(stampContent.generated_at).toBeUndefined();
    expect(stampContent.created_at).toBeUndefined();
    expect(stampContent.eid).toBe(result.evidenceId);
  });

  it("should skip if disabled in config", async () => {
    const fixture = JSON.parse(await fs.readFile(fixturePath, "utf-8"));
    const result = await runDualReasoningLoop(fixture.input, { ...fixture.config, enabled: false });
    expect(result.skipped).toBe(true);
    expect(result.reason).toBe("feature_flag_off");
  });
});
