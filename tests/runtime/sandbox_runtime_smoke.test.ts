import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, it, expect } from "vitest";
import {
  InMemoryObjectStore,
  InProcessSandboxRuntime,
  ObjectStoreStatePersister,
  writeEvidenceBundle,
  type RunSpec,
} from "../../src/runtime/sandbox/index.js";

describe("sandbox runtime smoke", () => {
  it("produces deterministic evidence artifacts", async () => {
    const objectStore = new InMemoryObjectStore();
    const runtime = new InProcessSandboxRuntime(new ObjectStoreStatePersister(objectStore));

    const spec: RunSpec = {
      evidenceId: "EVIDENCE-SMOKE",
      toolAllowlist: ["search:web"],
      requestedTools: ["search:web"],
      modelPolicy: { provider: "mock", gatewayMode: "brokered" },
      persistence: { enabled: true, namespace: "smoke" },
    };

    const bundle = await runtime.run(spec);

    const outputRoot = await mkdtemp(path.join(tmpdir(), "sandbox-evidence-"));
    try {
      const evidenceDir = await writeEvidenceBundle(bundle, outputRoot);

      const report = JSON.parse(await readFile(path.join(evidenceDir, "report.json"), "utf-8"));
      const metrics = JSON.parse(await readFile(path.join(evidenceDir, "metrics.json"), "utf-8"));
      const stamp = JSON.parse(await readFile(path.join(evidenceDir, "stamp.json"), "utf-8"));

      expect(report).toMatchObject({ status: "ok", completedSteps: 1, toolsUsed: ["search:web"] });
      expect(metrics).toMatchObject({ policyChecks: 1, deniedTools: 0 });
      expect(stamp).toEqual({ schemaVersion: 1, inputsHash: bundle.stamp.inputsHash });
    } finally {
      await rm(outputRoot, { recursive: true, force: true });
    }
  });
});
