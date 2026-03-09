#!/usr/bin/env node

/**
 * Patch Market - Value-based Prioritization
 *
 * Formula: Value = (Impact × Velocity) / (Risk + 0.1)
 *
 * Prioritizes patches by economic value to maximize repository velocity.
 */

export class PatchMarket {
  constructor(config = {}) {
    this.repoRoot = config.repoRoot || process.cwd();
  }

  /**
   * Calculate patch value
   * @param {Object} patch - Patch metadata
   * @returns {number} Value score (0-∞, typically 0-10)
   */
  calculatePatchValue(patch) {
    const impact = this.estimateImpact(patch);
    const velocity = this.estimateVelocity(patch);
    const risk = this.assessRisk(patch);

    return (impact * velocity) / (risk + 0.1);
  }

  /**
   * Estimate patch impact (0-1)
   */
  estimateImpact(patch) {
    const filesChanged = (patch.files_changed || []).length;

    // More files = higher potential impact
    if (filesChanged > 20) return 0.9;
    if (filesChanged > 10) return 0.7;
    if (filesChanged > 5) return 0.5;
    return 0.3;
  }

  /**
   * Estimate patch velocity (patches/day)
   */
  estimateVelocity(patch) {
    // High priority patches move faster
    if (patch.metadata?.priority === 'high') return 0.9;
    if (patch.metadata?.priority === 'medium') return 0.6;
    return 0.3;
  }

  /**
   * Assess patch risk (0-1)
   */
  assessRisk(patch) {
    const filesChanged = (patch.files_changed || []);
    const hasTests = filesChanged.some(f => f.includes('test') || f.includes('spec'));
    const touchesCore = filesChanged.some(f => f.includes('core') || f.includes('src'));

    let risk = 0.3; // Base risk

    if (!hasTests) risk += 0.3;
    if (touchesCore) risk += 0.2;
    if (filesChanged.length > 20) risk += 0.2;

    return Math.min(risk, 1.0);
  }

  /**
   * Prioritize patches by value
   * @param {Array} patches - Array of patches
   * @returns {Array} Sorted patches (highest value first)
   */
  prioritizePatches(patches) {
    return patches.sort((a, b) =>
      this.calculatePatchValue(b) - this.calculatePatchValue(a)
    );
  }

  /**
   * Get top N patches
   */
  getTopPatches(patches, n = 10) {
    const prioritized = this.prioritizePatches(patches);
    return prioritized.slice(0, n);
  }
}

export default PatchMarket;
