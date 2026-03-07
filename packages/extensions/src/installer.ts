import * as fs from "fs/promises";
import * as path from "path";
import { ExtensionManifest } from "./types.js";
import { ExtensionManifestSchema } from "./types.js";

export interface InstallationAuditEntry {
  action: "install" | "update" | "rollback" | "uninstall";
  name: string;
  version: string;
  timestamp: string;
  details?: Record<string, any>;
}

export interface InstallerOptions {
  installDir: string;
  auditFile: string;
}

export class ExtensionInstaller {
  private installDir: string;
  private auditFile: string;

  constructor(options: InstallerOptions) {
    this.installDir = options.installDir;
    this.auditFile = options.auditFile;
  }

  getInstallDir(): string {
    return this.installDir;
  }

  async install(sourcePath: string): Promise<ExtensionManifest> {
    const manifest = await this.readManifest(sourcePath);
    const target = path.join(this.installDir, manifest.name);
    await this.copyExtension(sourcePath, target);
    await this.writeAudit({
      action: "install",
      name: manifest.name,
      version: manifest.version,
      timestamp: new Date().toISOString(),
    });
    return manifest;
  }

  async update(sourcePath: string): Promise<ExtensionManifest> {
    const manifest = await this.readManifest(sourcePath);
    const target = path.join(this.installDir, manifest.name);
    const backup = `${target}-${manifest.version}.bak`;
    if (await this.exists(target)) {
      await fs.rm(backup, { recursive: true, force: true });
      await fs.rename(target, backup);
    }
    await this.copyExtension(sourcePath, target);
    await this.writeAudit({
      action: "update",
      name: manifest.name,
      version: manifest.version,
      timestamp: new Date().toISOString(),
      details: { backup },
    });
    return manifest;
  }

  async rollback(name: string, version: string): Promise<void> {
    const target = path.join(this.installDir, name);
    const backup = `${target}-${version}.bak`;
    if (!(await this.exists(backup))) {
      throw new Error(`No backup found for ${name}@${version}`);
    }
    await fs.rm(target, { recursive: true, force: true });
    await fs.rename(backup, target);
    await this.writeAudit({
      action: "rollback",
      name,
      version,
      timestamp: new Date().toISOString(),
    });
  }

  async uninstall(name: string): Promise<void> {
    const target = path.join(this.installDir, name);
    await fs.rm(target, { recursive: true, force: true });
    const existsAfter = await this.exists(target);
    if (existsAfter) {
      throw new Error(`Cleanup verification failed for ${name}`);
    }
    await this.writeAudit({
      action: "uninstall",
      name,
      version: "unknown",
      timestamp: new Date().toISOString(),
    });
  }

  async getAuditLog(): Promise<InstallationAuditEntry[]> {
    try {
      const content = await fs.readFile(this.auditFile, "utf-8");
      return content
        .trim()
        .split("\n")
        .filter(Boolean)
        .map((line) => JSON.parse(line));
    } catch {
      return [];
    }
  }

  private async copyExtension(source: string, target: string): Promise<void> {
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.rm(target, { recursive: true, force: true });
    await fs.cp(source, target, { recursive: true });
  }

  private async writeAudit(entry: InstallationAuditEntry): Promise<void> {
    await fs.mkdir(path.dirname(this.auditFile), { recursive: true });
    await fs.appendFile(this.auditFile, `${JSON.stringify(entry)}\n`);
  }

  private async readManifest(extensionPath: string): Promise<ExtensionManifest> {
    const manifestPath = path.join(extensionPath, "extension.json");
    const content = await fs.readFile(manifestPath, "utf-8");
    const parsed = JSON.parse(content);
    const validated = ExtensionManifestSchema.safeParse(parsed);
    if (!validated.success) {
      throw new Error(`Invalid extension manifest: ${validated.error.message}`);
    }
    return validated.data;
  }

  private async exists(target: string): Promise<boolean> {
    try {
      await fs.access(target);
      return true;
    } catch {
      return false;
    }
  }
}
