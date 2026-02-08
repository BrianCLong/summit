import { manageContext } from "./hybridContextManager";
import { LLMClient, AgentContext } from "./types";
import { writeEvidence } from "../../shared/src/evidence";

class DeterministicLLM implements LLMClient {
  async summarize(input: string) {
    // Deterministic "summary": keep first 300 chars + checksum
    const head = input.slice(0, 300);
    const sum = `SUMMARY(head300)=${head}`;
    return sum;
  }
  estimateTokens(input: string) {
    return Math.max(1, Math.ceil(input.length / 4));
  }
}

export async function runEvidence(evid: string) {
  const llm = new DeterministicLLM();
  const ctx: AgentContext = {
    turns: Array.from({ length: 60 }).map((_, i) => ({
      role: i % 2 === 0 ? "user" : "assistant",
      content: `turn-${i} content ${\"x\".repeat(40)}`,
      observation: i % 3 === 0 ? `obs-${i} ${\"y\".repeat(50)}` : undefined,
      action: i % 5 === 0 ? `tool:${i}` : undefined,
    })),
  };

  const { context, metrics } = await manageContext(llm, ctx, {
    observationWindow: 10,
    summarizationInterval: 50,
    placeholderStyle: "compact",
  });

  writeEvidence(
    evid,
    { sample: { beforeTurns: ctx.turns.length, afterTurns: context.turns.length, hasSummary: !!context.summary } },
    metrics,
    { module: "maestro-context", date_utc: new Date().toISOString() }
  );
}
