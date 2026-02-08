import { manageContext } from "../../agentic-research/maestro-context/src/hybridContextManager";
import { LLMClient, AgentContext } from "../../agentic-research/maestro-context/src/types";

class FakeLLM implements LLMClient {
  async summarize() { return "summary"; }
  estimateTokens(input: string) { return input.length; }
}

test("masks older observations and optionally summarizes", async () => {
  const llm = new FakeLLM();
  const ctx: AgentContext = {
    turns: [
      { role: "user", content: "a", observation: "o1" },
      { role: "assistant", content: "b", observation: "o2" },
      { role: "user", content: "c", observation: "o3" },
      { role: "assistant", content: "d", observation: "o4" },
    ],
  };

  const out = await manageContext(llm, ctx, { observationWindow: 2, summarizationInterval: 4 });
  // The summary logic: interval=4, turns=4, cutoff=2.
  // masked turns: 0, 1.
  // masked.length = 4. 4 % 4 === 0.
  // summarized = true.
  // toSummarize = masked.slice(0, 2).
  // result turns = masked.slice(2) = [2, 3] (original indices).

  expect(out.context.summary).toBeDefined();
  expect(out.context.turns.length).toBe(2);
  expect(out.metrics.maskedTurns).toBeGreaterThanOrEqual(1);
});
