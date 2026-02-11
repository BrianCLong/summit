import { runDualReasoningLoop } from "../../../src/agents/dualReasoning/DualReasoningLoop";
import fixture from "./basic.fixture.json";

describe("UniReason E2E Fixture Run", () => {
  it("should complete the loop for a scientific instruction", async () => {
    const res = await runDualReasoningLoop(fixture.input as any, { enabled: true });
    expect(res.skipped).toBe(false);
    expect(res.report.plan.domain).toBe("science");
    expect(res.report.judge.better).toBe("refine");
  });
});
