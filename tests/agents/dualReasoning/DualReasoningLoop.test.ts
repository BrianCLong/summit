import { describe, it, expect } from "vitest";
import { runDualReasoningLoop } from "../../../src/agents/dualReasoning/DualReasoningLoop";
import { DualReasoningInput, DualReasoningConfig } from "../../../src/agents/dualReasoning/types";

describe("DualReasoningLoop", () => {
  const defaultInput: DualReasoningInput = {
    instruction: "Generate a picture of a scientist",
    domain: "science"
  };

  const enabledCfg: DualReasoningConfig = {
    enabled: true
  };

  it("should skip if feature flag is off", async () => {
    const result = await runDualReasoningLoop(defaultInput, { enabled: false });
    expect(result.skipped).toBe(true);
    expect(result.reason).toBe("feature_flag_off");
  });

  it("should run the loop and produce a report when enabled", async () => {
    const result = await runDualReasoningLoop(defaultInput, enabledCfg);
    expect(result.skipped).toBe(false);
    expect(result.evidenceId).toBeDefined();
    expect(result.report).toBeDefined();

    const report = JSON.parse(result.report);
    expect(report.plan.domain).toBe("science");
    expect(report.judge.better).toBe("refine");
  });
});
