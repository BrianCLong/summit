import { runDualReasoningLoop } from "../../../src/agents/dualReasoning/DualReasoningLoop";
import { DualReasoningInput, DualReasoningConfig } from "../../../src/agents/dualReasoning/types";

describe("UniReason Determinism", () => {
  it("should produce identical evidence IDs for identical inputs", async () => {
    const input: DualReasoningInput = {
      instruction: "A cat in a hat",
      domain: "cultural"
    };
    const cfg: DualReasoningConfig = { enabled: true };

    const res1 = await runDualReasoningLoop(input, cfg);
    const res2 = await runDualReasoningLoop(input, cfg);

    expect(res1.evidenceId).toBe(res2.evidenceId);
  });
});
