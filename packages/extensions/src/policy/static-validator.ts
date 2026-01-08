import * as fs from "fs/promises";
import * as path from "path";
import { ExtensionManifest } from "../types.js";

export interface StaticPolicyOptions {
  dependencyAllowList?: string[];
  dependencyDenyList?: string[];
}

export class StaticPolicyValidator {
  private allowList: Set<string>;
  private denyList: Set<string>;

  constructor(options: StaticPolicyOptions = {}) {
    this.allowList = new Set(options.dependencyAllowList || []);
    this.denyList = new Set(options.dependencyDenyList || []);
  }

  async validate(manifest: ExtensionManifest, extensionPath: string): Promise<void> {
    await this.validateDependencies(manifest);
    await this.validateLockfile(extensionPath);
  }

  private async validateDependencies(manifest: ExtensionManifest): Promise<void> {
    const dependencies = Object.keys(manifest.dependencies || {});
    const peerDependencies = Object.keys(manifest.peerDependencies || {});
    const all = [...dependencies, ...peerDependencies];

    for (const dep of all) {
      if (this.denyList.has(dep)) {
        throw new Error(`Dependency ${dep} is blocked by policy`);
      }
      if (this.allowList.size > 0 && !this.allowList.has(dep)) {
        throw new Error(`Dependency ${dep} is not in the allowed list`);
      }
    }
  }

  private async validateLockfile(extensionPath: string): Promise<void> {
    const lockfile = path.join(extensionPath, "pnpm-lock.yaml");
    const packageLock = path.join(extensionPath, "package-lock.json");
    const yarnLock = path.join(extensionPath, "yarn.lock");

    const exists = await Promise.all([
      this.exists(lockfile),
      this.exists(packageLock),
      this.exists(yarnLock),
    ]);

    if (exists.some((value) => value)) {
      return;
    }

    throw new Error("Extension must include a lockfile for deterministic installs");
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
