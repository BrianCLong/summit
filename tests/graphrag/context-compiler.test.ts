/**
 * compileGraphContext — unit tests for the foundation-lane skeleton.
 *
 * Foundation lane: verifies the compiler returns a valid, safe-defaults
 * GraphContextPackage without throwing.  Innovation-lane tests will
 * assert actual Neo4j / policy-trim behaviour once the flag is enabled.
 *
 * EVD-AFCP-KG-003
 */

import { compileGraphContext } from "../../src/graphrag/context-compiler/compileGraphContext.js";
import type { TaskSpec } from "../../src/agents/controlplane/router/RouterTypes.js";

function makeTask(overrides: Partial<TaskSpec> = {}): TaskSpec {
  return {
    id: "task-001",
    type: "text-summarise",
    goal: "Summarise quarterly report",
    requiredCapabilities: ["text-summarise"],
    requiredTools: ["web-search"],
    requiredDatasets: ["ds-public"],
    riskBudget: "low",
    latencyBudgetMs: 500,
    costBudget: 50,
    requiresApproval: false,
    tokenBudget: 4096,
    ...overrides,
  };
}

describe("compileGraphContext — foundation lane", () => {
  it("returns a GraphContextPackage without throwing", async () => {
    const pkg = await compileGraphContext(makeTask());
    expect(pkg).toBeDefined();
  });

  it("returns entities array containing at least the task type", async () => {
    const pkg = await compileGraphContext(makeTask());
    expect(Array.isArray(pkg.entities)).toBe(true);
    expect(pkg.entities.length).toBeGreaterThan(0);
  });

  it("returns allowedDatasets as an array (safe default: empty)", async () => {
    const pkg = await compileGraphContext(makeTask());
    expect(Array.isArray(pkg.allowedDatasets)).toBe(true);
  });

  it("returns allowedTools as an array (safe default: empty)", async () => {
    const pkg = await compileGraphContext(makeTask());
    expect(Array.isArray(pkg.allowedTools)).toBe(true);
  });

  it("returns evidenceIds as an array", async () => {
    const pkg = await compileGraphContext(makeTask());
    expect(Array.isArray(pkg.evidenceIds)).toBe(true);
  });

  it("does not throw when tokenBudget is undefined", async () => {
    const t = makeTask();
    delete t.tokenBudget;
    await expect(compileGraphContext(t)).resolves.toBeDefined();
  });

  it("entity includes task id", async () => {
    const pkg = await compileGraphContext(makeTask({ id: "unique-task-xyz" }));
    const hasTaskId = pkg.entities.some((e) => e.includes("unique-task-xyz"));
    expect(hasTaskId).toBe(true);
  });
});
