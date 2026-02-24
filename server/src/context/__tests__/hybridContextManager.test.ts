import { describe, expect, it } from "@jest/globals";
import {
  AgentContext,
  HybridContextManager,
  HybridContextOptions,
  LLMClient,
} from "../hybridContextManager.js";

class FakeLLM implements LLMClient {
  async summarize(): Promise<string> {
    return "summary";
  }

  estimateTokens(text: string): number {
    return text.length;
  }
}

const options: HybridContextOptions = {
  observationWindow: 2,
  summarizationInterval: 4,
};

describe("HybridContextManager", () => {
  it("masks observations outside the observation window", async () => {
    const manager = new HybridContextManager(new FakeLLM(), options);
    const context: AgentContext = {
      turns: [
        { role: "user", content: "1", observation: "o1" },
        { role: "assistant", content: "2", observation: "o2" },
        { role: "user", content: "3", observation: "o3" },
      ],
    };

    const { context: managed } = await manager.manageContext(context);

    expect(managed.turns[0].observation).toContain("[omitted observation");
    expect(managed.turns[1].observation).toBe("o2");
    expect(managed.turns[2].observation).toBe("o3");
  });

  it("summarizes and truncates old turns when interval is reached", async () => {
    const manager = new HybridContextManager(new FakeLLM(), options);
    const context: AgentContext = {
      turns: [
        { role: "user", content: "1" },
        { role: "assistant", content: "2" },
        { role: "user", content: "3" },
        { role: "assistant", content: "4" },
      ],
    };

    const { context: managed } = await manager.manageContext(context);

    expect(managed.summary).toBe("summary");
    expect(managed.turns.length).toBe(2);
    expect(managed.turns[0].content).toBe("3");
    expect(managed.turns[1].content).toBe("4");
  });

  it("returns token/cost metrics", async () => {
    const manager = new HybridContextManager(new FakeLLM(), options);
    const context: AgentContext = {
      turns: [
        { role: "user", content: "hello".repeat(10) },
        { role: "assistant", content: "world".repeat(10) },
      ],
    };

    const { metrics } = await manager.manageContext(context);

    expect(metrics.originalTokenEstimate).toBeGreaterThan(0);
    expect(metrics.managedTokenEstimate).toBeGreaterThan(0);
    expect(metrics.estimatedCostReduction).toBeGreaterThanOrEqual(0);
  });
});
