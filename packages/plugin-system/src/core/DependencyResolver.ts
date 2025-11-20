import semver from 'semver';
import {
  DependencyResolver,
  DependencyTree,
  CompatibilityResult,
  CompatibilityIssue,
  PluginManifest,
} from '../types/plugin.js';

/**
 * Resolves plugin dependencies and checks compatibility
 */
export class DefaultDependencyResolver implements DependencyResolver {
  private manifestCache = new Map<string, PluginManifest>();
  private platformVersion: string;

  constructor(platformVersion: string) {
    this.platformVersion = platformVersion;
  }

  /**
   * Resolve complete dependency tree for a plugin
   */
  async resolve(pluginId: string, version: string): Promise<DependencyTree> {
    const manifest = await this.getManifest(pluginId, version);

    // Recursively resolve dependencies
    const dependencies = new Map<string, DependencyTree>();

    if (manifest.dependencies) {
      for (const [depId, depVersion] of Object.entries(manifest.dependencies)) {
        const depTree = await this.resolve(depId, depVersion);
        dependencies.set(depId, depTree);
      }
    }

    return {
      plugin: manifest,
      dependencies,
    };
  }

  /**
   * Check if plugin is compatible with current platform and environment
   */
  async checkCompatibility(
    pluginId: string,
    version: string
  ): Promise<CompatibilityResult> {
    const issues: CompatibilityIssue[] = [];

    try {
      const manifest = await this.getManifest(pluginId, version);

      // Check platform version compatibility
      if (!semver.satisfies(this.platformVersion, manifest.engineVersion)) {
        issues.push({
          type: 'version-mismatch',
          message: `Plugin requires platform version ${manifest.engineVersion}, but current version is ${this.platformVersion}`,
          severity: 'error',
        });
      }

      // Check dependencies
      if (manifest.dependencies) {
        for (const [depId, depVersion] of Object.entries(manifest.dependencies)) {
          const depIssues = await this.checkDependency(depId, depVersion);
          issues.push(...depIssues);
        }
      }

      // Check peer dependencies
      if (manifest.peerDependencies) {
        for (const [peerId, peerVersion] of Object.entries(manifest.peerDependencies)) {
          const peerIssues = await this.checkPeerDependency(peerId, peerVersion);
          issues.push(...peerIssues);
        }
      }

      // Check for conflicts with other installed plugins
      const conflicts = await this.checkConflicts(manifest);
      issues.push(...conflicts);
    } catch (error) {
      issues.push({
        type: 'missing-dependency',
        message: `Failed to check compatibility: ${error}`,
        severity: 'error',
      });
    }

    return {
      compatible: !issues.some(issue => issue.severity === 'error'),
      issues,
    };
  }

  /**
   * Check a single dependency
   */
  private async checkDependency(
    depId: string,
    depVersion: string
  ): Promise<CompatibilityIssue[]> {
    const issues: CompatibilityIssue[] = [];

    try {
      const depManifest = await this.getManifest(depId, depVersion);

      // Check if dependency version exists and satisfies requirements
      if (!semver.satisfies(depManifest.version, depVersion)) {
        issues.push({
          type: 'version-mismatch',
          message: `Dependency ${depId} version ${depVersion} not satisfied, found ${depManifest.version}`,
          severity: 'error',
        });
      }

      // Recursively check dependency's compatibility
      const depCompatibility = await this.checkCompatibility(depId, depVersion);
      issues.push(...depCompatibility.issues);
    } catch (error) {
      issues.push({
        type: 'missing-dependency',
        message: `Dependency ${depId}@${depVersion} not found`,
        severity: 'error',
      });
    }

    return issues;
  }

  /**
   * Check peer dependency
   */
  private async checkPeerDependency(
    peerId: string,
    peerVersion: string
  ): Promise<CompatibilityIssue[]> {
    const issues: CompatibilityIssue[] = [];

    // In a real implementation, would check if peer is installed
    // For now, just warn about peer dependency requirements

    issues.push({
      type: 'missing-dependency',
      message: `Peer dependency ${peerId}@${peerVersion} should be installed`,
      severity: 'warning',
    });

    return issues;
  }

  /**
   * Check for conflicts with other plugins
   */
  private async checkConflicts(manifest: PluginManifest): Promise<CompatibilityIssue[]> {
    const issues: CompatibilityIssue[] = [];

    // Would check:
    // - Extension point conflicts
    // - API endpoint path conflicts
    // - Resource quota conflicts
    // - Incompatible plugin combinations

    return issues;
  }

  /**
   * Get plugin manifest (with caching)
   */
  private async getManifest(pluginId: string, version: string): Promise<PluginManifest> {
    const cacheKey = `${pluginId}@${version}`;

    if (this.manifestCache.has(cacheKey)) {
      return this.manifestCache.get(cacheKey)!;
    }

    // In real implementation, would fetch from registry
    // For now, throw error
    throw new Error(`Manifest for ${cacheKey} not found`);
  }

  /**
   * Register manifest in cache (for testing/development)
   */
  registerManifest(manifest: PluginManifest): void {
    const cacheKey = `${manifest.id}@${manifest.version}`;
    this.manifestCache.set(cacheKey, manifest);
  }
}
