import { describe, it, expect } from "vitest";
import {
  InMemoryObjectStore,
  InProcessSandboxRuntime,
  ObjectStoreStatePersister,
  type RunSpec,
} from "../../src/runtime/sandbox/index.js";

describe("sandbox policy gate", () => {
  it("denies tool usage by default when not allowlisted", async () => {
    const runtime = new InProcessSandboxRuntime(
      new ObjectStoreStatePersister(new InMemoryObjectStore())
    );

    const spec: RunSpec = {
      evidenceId: "EVIDENCE-DENY",
      toolAllowlist: [],
      requestedTools: ["browser:render"],
      modelPolicy: { provider: "mock", gatewayMode: "brokered" },
      persistence: { enabled: false, namespace: "deny" },
    };

    await expect(runtime.run(spec)).rejects.toThrow("Denied tools: browser:render");
  });
});
