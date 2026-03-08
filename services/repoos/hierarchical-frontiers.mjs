#!/usr/bin/env node

/**
 * Hierarchical Frontiers
 *
 * Three-layer frontier architecture for extreme scale:
 * - Micro Frontiers: File/function level (100s-1000s)
 * - Domain Frontiers: Package/service level (10s-100s)
 * - System Frontiers: Cross-cutting concerns (5-20)
 *
 * Enables hierarchical compression: Micro → Domain → System → PR
 */

export class HierarchicalFrontierEngine {
  constructor(config = {}) {
    this.repoRoot = config.repoRoot || process.cwd();

    // Three layers of frontiers
    this.microFrontiers = new Map();   // fileId → MicroFrontier
    this.domainFrontiers = new Map();  // packageId → DomainFrontier
    this.systemFrontiers = new Map();  // concernId → SystemFrontier
  }

  /**
   * Promote micro frontier to domain frontier
   *
   * When a file-level frontier reaches stability, promote it
   * to the package-level domain frontier.
   */
  async promoteMicroToDomain(microFrontier) {
    const { fileId, patches } = microFrontier;
    const packageId = this.getPackageId(fileId);

    console.log(`🔼 Promoting micro frontier (${fileId}) to domain (${packageId})`);

    let domainFrontier = this.domainFrontiers.get(packageId);
    if (!domainFrontier) {
      domainFrontier = this.createDomainFrontier(packageId);
    }

    // Aggregate micro frontier into domain
    domainFrontier.microFrontiers.push(microFrontier);
    domainFrontier.totalPatches += patches.length;

    this.domainFrontiers.set(packageId, domainFrontier);

    return domainFrontier;
  }

  /**
   * Promote domain frontier to system frontier
   *
   * When a package-level frontier reaches stability, promote it
   * to the concern-level system frontier.
   */
  async promoteDomainToSystem(domainFrontier) {
    const { packageId } = domainFrontier;
    const concernId = this.getConcernId(packageId);

    console.log(`🔼 Promoting domain frontier (${packageId}) to system (${concernId})`);

    let systemFrontier = this.systemFrontiers.get(concernId);
    if (!systemFrontier) {
      systemFrontier = this.createSystemFrontier(concernId);
    }

    // Aggregate domain frontier into system
    systemFrontier.domainFrontiers.push(domainFrontier);
    systemFrontier.totalPatches += domainFrontier.totalPatches;

    this.systemFrontiers.set(concernId, systemFrontier);

    return systemFrontier;
  }

  /**
   * Materialize PR from system frontier
   *
   * Create a PR from the fully converged system frontier.
   */
  async materializePR(systemFrontier) {
    const { concernId, totalPatches } = systemFrontier;

    console.log(`📝 Materializing PR from system frontier: ${concernId} (${totalPatches} patches)`);

    const pr = {
      concernId,
      title: `[${concernId}] Hierarchical Convergence: ${totalPatches} patches`,
      layers: {
        system: 1,
        domain: systemFrontier.domainFrontiers.length,
        micro: systemFrontier.domainFrontiers.reduce((sum, d) => sum + d.microFrontiers.length, 0)
      },
      totalPatches,
      createdAt: new Date().toISOString()
    };

    return pr;
  }

  /**
   * Create micro frontier
   */
  createMicroFrontier(fileId) {
    return {
      fileId,
      patches: [],
      state: 'COLLECTING',
      createdAt: new Date().toISOString()
    };
  }

  /**
   * Create domain frontier
   */
  createDomainFrontier(packageId) {
    return {
      packageId,
      microFrontiers: [],
      totalPatches: 0,
      state: 'COLLECTING',
      createdAt: new Date().toISOString()
    };
  }

  /**
   * Create system frontier
   */
  createSystemFrontier(concernId) {
    return {
      concernId,
      domainFrontiers: [],
      totalPatches: 0,
      state: 'COLLECTING',
      createdAt: new Date().toISOString()
    };
  }

  /**
   * Extract package ID from file ID
   */
  getPackageId(fileId) {
    // Extract package from file path (e.g., "packages/foo/src/bar.ts" → "packages/foo")
    const parts = fileId.split('/');
    if (parts.length >= 2) {
      return `${parts[0]}/${parts[1]}`;
    }
    return 'unknown';
  }

  /**
   * Extract concern ID from package ID
   */
  getConcernId(packageId) {
    // Map package to concern (simplified)
    if (packageId.startsWith('packages/')) return 'packages';
    if (packageId.startsWith('services/')) return 'services';
    if (packageId.startsWith('apps/')) return 'apps';
    return 'general';
  }
}

export default HierarchicalFrontierEngine;
