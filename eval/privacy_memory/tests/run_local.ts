import { InMemoryMemoryBroker } from "../../../core/memory/storage_memory";
import contextCollapseFixtures from "../fixtures/context_collapse.json" assert { type: "json" };
import assert from "assert";

async function runTests() {
  console.log("Running Memory Privacy Local Tests...");
  const broker = new InMemoryMemoryBroker();

  for (const scenario of contextCollapseFixtures) {
    console.log(`Scenario: ${scenario.name}`);
    // 1. Setup
    for (const recordData of scenario.records) {
      await broker.remember({
        ...recordData,
        sources: ["test-fixture"],
        expiresAt: 0,
        visibility: "user",
      } as any);
    }

    // 2. Verification
    for (const testCase of scenario.tests) {
      const results = await broker.recall(testCase.scope as any);
      assert.strictEqual(
        results.length,
        testCase.expectedIds,
        `Test '${testCase.description}' failed: expected ${testCase.expectedIds} results, got ${results.length}`
      );

      const allContent = results.map((r) => r.content).join(" ");
      for (const forbidden of testCase.forbiddenContent) {
        assert.ok(
          !allContent.toLowerCase().includes(forbidden.toLowerCase()),
          `Leak detected in '${testCase.description}': found forbidden content '${forbidden}'`
        );
      }
      console.log(`  PASSED: ${testCase.description}`);
    }
  }

  // Purpose mismatch test
  console.log("Scenario: Purpose Mismatch");
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
    purpose: "assist" as any,
    contextSpace: "work",
  });
  assert.strictEqual(results.length, 0, "Recall should return 0 results for mismatched purpose");
  console.log("  PASSED: Purpose mismatch check");

  // Cross-user isolation test
  console.log("Scenario: Cross-User Isolation");
  await broker.remember({
    userId: "user_A",
    content: "User A secret",
    purpose: "assist",
    contextSpace: "personal",
    facets: [],
    sources: [],
    expiresAt: 0,
    visibility: "user",
  });

  const resultsUserB = await broker.recall({
    userId: "user_B",
    purpose: "assist",
    contextSpace: "personal",
  });
  assert.strictEqual(resultsUserB.length, 0, "User B should not see User A's memories");
  console.log("  PASSED: Cross-user isolation check");

  console.log("All Memory Privacy local tests passed!");
}

runTests().catch((err) => {
  console.error("Tests failed:", err);
  process.exit(1);
});
