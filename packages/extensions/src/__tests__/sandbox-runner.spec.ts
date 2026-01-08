import * as fs from "fs/promises";
import * as os from "os";
import * as path from "path";
import { describe, expect, it } from "vitest";
import { SandboxRunner } from "../sandbox/sandbox-runner.js";
import { ExtensionObservability } from "../observability.js";
import { ExtensionContext } from "../types.js";

const baseManifest = {
  name: "timeout-ext",
  displayName: "Timeout Extension",
  version: "1.0.0",
  description: "Long running extension to test sandbox",
  type: "tool",
  capabilities: ["analytics"],
  permissions: [],
  entrypoints: {
    main: {
      type: "function",
      path: "index.mjs",
      export: "default",
    },
  },
};

describe("SandboxRunner", () => {
  it("enforces activation timeouts and isolates execution", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "sandbox-test-"));
    const entrypoint = path.join(dir, "index.mjs");
    await fs.writeFile(
      entrypoint,
      "export default async function() { await new Promise((resolve) => setTimeout(resolve, 200)); return { exports: { ok: true } }; }",
      "utf-8"
    );

    const runner = new SandboxRunner(new ExtensionObservability(), {
      timeoutMs: 50,
      memoryLimitMb: 16,
    });
    const context = createContext(dir);

    await expect(() =>
      runner.run(baseManifest as any, entrypoint, "default", context)
    ).rejects.toThrow(/timed out|exceeded sandbox timeout/);
  });

  it("returns activation exports when within limits", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "sandbox-test-pass-"));
    const entrypoint = path.join(dir, "index.mjs");
    await fs.writeFile(
      entrypoint,
      "export default async function() { return { exports: { healthy: true } }; }",
      "utf-8"
    );

    const runner = new SandboxRunner(new ExtensionObservability(), {
      timeoutMs: 500,
      memoryLimitMb: 16,
    });
    const context = createContext(dir);

    const activation = await runner.run(baseManifest as any, entrypoint, "default", context);
    expect(activation.exports).toEqual({ healthy: true });
    await activation.dispose();
  });
});

function createContext(extensionPath: string): ExtensionContext {
  return {
    extensionPath,
    storagePath: path.join(extensionPath, "storage"),
    config: {},
    logger: {
      info: () => {},
      warn: () => {},
      error: () => {},
      debug: () => {},
    },
    api: {
      entities: {
        create: async () => ({}),
        update: async () => ({}),
        delete: async () => {},
        query: async () => [],
      },
      relationships: {
        create: async () => ({}),
        query: async () => [],
      },
      investigations: {
        create: async () => ({}),
        get: async () => ({}),
        update: async () => ({}),
      },
      storage: {
        get: async () => undefined,
        set: async () => {},
        delete: async () => {},
      },
    },
  };
}
