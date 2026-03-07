import * as fs from "fs/promises";
import * as os from "os";
import * as path from "path";
import { describe, expect, it } from "vitest";
import { ExtensionInstaller } from "../installer.js";

async function createExtension(version: string): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), `ext-${version}-`));
  await fs.writeFile(
    path.join(dir, "extension.json"),
    JSON.stringify(
      {
        name: "sample-extension",
        displayName: "Sample Extension",
        version,
        description: "Test extension",
        type: "tool",
        capabilities: ["analytics"],
        permissions: [],
        entrypoints: { main: { type: "function", path: "index.mjs", export: "default" } },
      },
      null,
      2
    )
  );
  await fs.writeFile(path.join(dir, "index.mjs"), "export default async () => ({ exports: {} })");
  await fs.writeFile(path.join(dir, "pnpm-lock.yaml"), "lockfileVersion: 9");
  return dir;
}

describe("ExtensionInstaller", () => {
  it("installs, updates, rolls back, and audits operations", async () => {
    const installDir = await fs.mkdtemp(path.join(os.tmpdir(), "install-target-"));
    const auditFile = path.join(installDir, "audit.log");
    const installer = new ExtensionInstaller({ installDir, auditFile });

    const v1 = await createExtension("1.0.0");
    await installer.install(v1);
    expect(await fs.readdir(installDir)).toContain("sample-extension");

    const v2 = await createExtension("1.1.0");
    await installer.update(v2);
    const backups = await fs.readdir(installDir);
    expect(backups.some((f) => f.includes(".bak"))).toBe(true);

    await installer.rollback("sample-extension", "1.1.0");
    const audit = await installer.getAuditLog();
    expect(audit).toHaveLength(3);
    expect(audit.map((e) => e.action)).toEqual(["install", "update", "rollback"]);

    await installer.uninstall("sample-extension");
    const remaining = await fs.readdir(installDir);
    expect(remaining.every((f) => !f.startsWith("sample-extension"))).toBe(true);
  });
});
