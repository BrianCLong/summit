import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryMemoryBroker } from "../../../core/memory/storage_memory";
import contextCollapseFixtures from "../fixtures/context_collapse.json";

describe("Memory Privacy: Context Firewall Evaluation", () => {
  let broker: InMemoryMemoryBroker;

  beforeEach(() => {
    broker = new InMemoryMemoryBroker();
  });

  it("should prevent cross-context leakage as defined in fixtures", async () => {
    for (const scenario of contextCollapseFixtures) {
      // 1. Setup: Load records into broker
      for (const recordData of scenario.records) {
        await broker.remember({
          ...recordData,
          sources: ["test-fixture"],
          expiresAt: 0,
          visibility: "user",
        } as any);
      }

      // 2. Execution & Verification: Run each test case in the scenario
      for (const testCase of scenario.tests) {
        const results = await broker.recall(testCase.scope as any);

        expect(
          results.length,
          `Test '${testCase.description}' failed: expected ${testCase.expectedIds} results, got ${results.length}`
        ).toBe(testCase.expectedIds);

        const allContent = results.map((r) => r.content).join(" ");
        for (const forbidden of testCase.forbiddenContent) {
          expect(
            allContent.toLowerCase(),
            `Leak detected in '${testCase.description}': found forbidden content '${forbidden}'`
          ).not.toContain(forbidden.toLowerCase());
        }
      }
    }
  });

  it("should deny access when purpose mismatches even if context matches", async () => {
    await broker.remember({
      userId: "u1",
      content: "Sensitive compliance data",
      purpose: "compliance",
      contextSpace: "work",
      facets: [],
      sources: [],
      expiresAt: 0,
      visibility: "user",
    });

    const results = await broker.recall({
      userId: "u1",
      purpose: "assist",
      contextSpace: "work",
    });
    expect(results.length).toBe(0);
  });
});
