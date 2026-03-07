import { describe, expect, it } from "vitest";
import { InMemoryCheckpointStore, MigrationRunner, type MigrationStep } from "../src/index.js";

describe("migration runner", () => {
  it("performs preflight and dry-run planning", async () => {
    const store = new InMemoryCheckpointStore();
    const steps: MigrationStep[] = [
      {
        id: "check-connectivity",
        description: "ensure db reachable",
        preflight: async () => ({ ok: true }),
        dryRun: async () => ["ping database"],
        apply: async () => {},
      },
    ];
    const runner = new MigrationRunner(store, steps);
    const plan = await runner.dryRun();
    expect(plan).toEqual(["ping database"]);
  });

  it("is resumable after partial failure", async () => {
    const store = new InMemoryCheckpointStore();
    let applied = 0;
    const steps: MigrationStep[] = [
      {
        id: "step-1",
        description: "first",
        apply: async () => {
          applied += 1;
        },
      },
      {
        id: "step-2",
        description: "second",
        dependsOn: ["step-1"],
        apply: async () => {
          applied += 1;
          throw new Error("crash");
        },
      },
    ];
    const runner = new MigrationRunner(store, steps);
    await expect(runner.apply()).rejects.toThrowError(/crash/);
    // resume
    const resumedSteps: MigrationStep[] = [
      steps[0],
      {
        ...steps[1],
        apply: async () => {
          applied += 1;
        },
      },
    ];
    const resumed = new MigrationRunner(store, resumedSteps);
    await resumed.apply();
    expect(applied).toBe(3);
  });
});
