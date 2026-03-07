import { describe, it, expect } from "vitest";
import {
  InMemoryObjectStore,
  InProcessSandboxRuntime,
  ObjectStoreStatePersister,
  type RunSpec,
} from "../../src/runtime/sandbox/index.js";

function specFor(namespace: string): RunSpec {
  return {
    evidenceId: `EVIDENCE-${namespace.toUpperCase()}`,
    toolAllowlist: ["search:web"],
    requestedTools: ["search:web"],
    modelPolicy: { provider: "mock", gatewayMode: "brokered" },
    persistence: { enabled: true, namespace },
  };
}

describe("sandbox persistence", () => {
  it("persists state across runtime restart and isolates namespaces", async () => {
    const objectStore = new InMemoryObjectStore();

    const runtimeA1 = new InProcessSandboxRuntime(new ObjectStoreStatePersister(objectStore));
    const first = await runtimeA1.run(specFor("tenant-a"));
    expect(first.report.completedSteps).toBe(1);

    const runtimeA2 = new InProcessSandboxRuntime(new ObjectStoreStatePersister(objectStore));
    const second = await runtimeA2.run(specFor("tenant-a"));
    expect(second.report.completedSteps).toBe(2);

    const runtimeB = new InProcessSandboxRuntime(new ObjectStoreStatePersister(objectStore));
    const isolated = await runtimeB.run(specFor("tenant-b"));
    expect(isolated.report.completedSteps).toBe(1);
  });
});
