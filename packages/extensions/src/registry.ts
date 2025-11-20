/**
 * Extension Registry
 *
 * Manages the collection of discovered and loaded extensions.
 */

import { Extension, ExtensionManifest } from './types.js';

export class ExtensionRegistry {
  private extensions = new Map<string, Extension>();
  private activationOrder: string[] = [];

  /**
   * Register a discovered extension
   */
  register(manifest: ExtensionManifest, path: string): void {
    const existing = this.extensions.get(manifest.name);

    if (existing && !this.shouldReplace(existing.manifest, manifest)) {
      console.warn(
        `Extension ${manifest.name} already registered (${existing.manifest.version}). Skipping ${manifest.version}.`
      );
      return;
    }

    this.extensions.set(manifest.name, {
      manifest,
      path,
      enabled: true,
      loaded: false,
    });

    console.info(`Registered extension: ${manifest.name}@${manifest.version}`);
  }

  /**
   * Mark an extension as loaded
   */
  markLoaded(name: string, module: any, config?: Record<string, any>): void {
    const ext = this.extensions.get(name);
    if (!ext) {
      throw new Error(`Extension ${name} not found in registry`);
    }

    ext.loaded = true;
    ext.module = module;
    ext.config = config;
    this.activationOrder.push(name);
  }

  /**
   * Mark an extension as failed
   */
  markFailed(name: string, error: string): void {
    const ext = this.extensions.get(name);
    if (!ext) {
      throw new Error(`Extension ${name} not found in registry`);
    }

    ext.loaded = false;
    ext.error = error;
    console.error(`Extension ${name} failed to load: ${error}`);
  }

  /**
   * Get an extension by name
   */
  get(name: string): Extension | undefined {
    return this.extensions.get(name);
  }

  /**
   * Get all registered extensions
   */
  getAll(): Extension[] {
    return Array.from(this.extensions.values());
  }

  /**
   * Get all loaded extensions
   */
  getLoaded(): Extension[] {
    return this.getAll().filter((ext) => ext.loaded);
  }

  /**
   * Get all enabled extensions
   */
  getEnabled(): Extension[] {
    return this.getAll().filter((ext) => ext.enabled);
  }

  /**
   * Get extensions by capability
   */
  getByCapability(capability: string): Extension[] {
    return this.getLoaded().filter((ext) =>
      ext.manifest.capabilities.includes(capability as any)
    );
  }

  /**
   * Get extensions by type
   */
  getByType(type: string): Extension[] {
    return this.getLoaded().filter((ext) => ext.manifest.type === type);
  }

  /**
   * Enable an extension
   */
  enable(name: string): void {
    const ext = this.extensions.get(name);
    if (!ext) {
      throw new Error(`Extension ${name} not found`);
    }
    ext.enabled = true;
  }

  /**
   * Disable an extension
   */
  disable(name: string): void {
    const ext = this.extensions.get(name);
    if (!ext) {
      throw new Error(`Extension ${name} not found`);
    }
    ext.enabled = false;
  }

  /**
   * Unregister an extension
   */
  unregister(name: string): void {
    this.extensions.delete(name);
    const idx = this.activationOrder.indexOf(name);
    if (idx !== -1) {
      this.activationOrder.splice(idx, 1);
    }
  }

  /**
   * Get activation order (for proper cleanup)
   */
  getActivationOrder(): string[] {
    return [...this.activationOrder];
  }

  /**
   * Clear all extensions
   */
  clear(): void {
    this.extensions.clear();
    this.activationOrder = [];
  }

  /**
   * Determine if a newer version should replace an existing one
   */
  private shouldReplace(existing: ExtensionManifest, candidate: ExtensionManifest): boolean {
    const [eMajor, eMinor, ePatch] = this.parseVersion(existing.version);
    const [cMajor, cMinor, cPatch] = this.parseVersion(candidate.version);

    if (cMajor > eMajor) return true;
    if (cMajor < eMajor) return false;

    if (cMinor > eMinor) return true;
    if (cMinor < eMinor) return false;

    return cPatch > ePatch;
  }

  /**
   * Parse semantic version
   */
  private parseVersion(version: string): [number, number, number] {
    const match = version.match(/^(\d+)\.(\d+)\.(\d+)/);
    if (!match) return [0, 0, 0];
    return [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])];
  }

  /**
   * Get registry statistics
   */
  getStats() {
    const all = this.getAll();
    return {
      total: all.length,
      loaded: all.filter((e) => e.loaded).length,
      enabled: all.filter((e) => e.enabled).length,
      failed: all.filter((e) => e.error).length,
      byType: this.groupByType(),
    };
  }

  private groupByType(): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const ext of this.getAll()) {
      counts[ext.manifest.type] = (counts[ext.manifest.type] || 0) + 1;
    }
    return counts;
  }
}
