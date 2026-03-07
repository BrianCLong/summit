import * as fs from "fs/promises";
import * as os from "os";
import * as path from "path";
import { describe, expect, it } from "vitest";
import { ExtensionLoader } from "../loader.js";
import { PolicyEnforcer } from "../policy/enforcer.js";

async function createExtension(options: {
  name?: string;
  dependencies?: Record<string, string>;
  lockfile?: boolean;
}) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "loader-ext-"));
  const manifest = {
    name: options.name || "policy-ext",
    displayName: "Policy Extension",
    version: "1.0.0",
    description: "Extension for policy testing",
    type: "tool",
    capabilities: ["analytics"],
    permissions: ["entities:read"],
    dependencies: options.dependencies,
    entrypoints: { main: { type: "function", path: "index.mjs", export: "default" } },
    summit: { minVersion: "1.0.0", maxVersion: "2.0.0" },
  };
  await fs.writeFile(path.join(dir, "extension.json"), JSON.stringify(manifest, null, 2));
  await fs.writeFile(
    path.join(dir, "index.mjs"),
    "export default async () => ({ exports: { id: 'ok' } })"
  );
  if (options.lockfile !== false) {
    await fs.writeFile(path.join(dir, "pnpm-lock.yaml"), "lockfileVersion: 9");
  }
  return dir;
}

describe("ExtensionLoader policy gates", () => {
  it("blocks extensions that violate dependency deny list", async () => {
    const dir = await createExtension({ dependencies: { banned: "^1.0.0" }, lockfile: true });
    const loader = new ExtensionLoader({
      extensionDirs: [dir],
      dependencyDenyList: ["banned"],
      platformVersion: "1.5.0",
      autoLoad: true,
    });

    await loader.discover();
    await loader.loadAll();
    const registry = loader.getRegistry();
    const ext = registry.get("policy-ext");
    expect(ext?.error).toMatch(/blocked by policy/);
  });

  it("denies extensions when OPA policy disallows permissions", async () => {
    const dir = await createExtension({ dependencies: {}, lockfile: true });
    const policyEnforcer = new (class extends PolicyEnforcer {
      async checkPermissions() {
        return false;
      }
    })();
    const loader = new ExtensionLoader({
      extensionDirs: [dir],
      policyEnforcer,
      platformVersion: "1.5.0",
    });

    await loader.discover();
    await loader.loadAll();
    const registry = loader.getRegistry();
    const ext = registry.get("policy-ext");
    expect(ext?.error).toMatch(/denied by policy/);
  });

  it("loads extensions within compatibility window with lockfile enforcement", async () => {
    const dir = await createExtension({ dependencies: {}, lockfile: true });
    const loader = new ExtensionLoader({
      extensionDirs: [dir],
      dependencyAllowList: [],
      platformVersion: "1.5.0",
    });

    await loader.discover();
    await loader.loadAll();
    const registry = loader.getRegistry();
    const ext = registry.get("policy-ext");
    expect(ext?.loaded).toBe(true);
  });
});
