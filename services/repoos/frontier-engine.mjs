#!/usr/bin/env node

/**
 * Frontier Convergence Engine
 *
 * Prevents PR explosion by aggregating patches into frontiers before
 * materializing PRs. This is the critical compression layer.
 *
 * Flow:
 *   100,000 patches → Concern Router → 100 frontiers → Convergence → 80 PRs
 *
 * Without this layer:
 *   100,000 patches → 100,000 PRs (repository paralysis)
 *
 * Frontier State Machine:
 *   COLLECTING → CONVERGING → STABLE → PR_MATERIALIZED → RESET
 *
 * Each frontier accumulates patches for a single concern, performs conflict
 * resolution, synthesizes deltas, and materializes PRs only when stable.
 */

import fs from 'fs/promises';
import path from 'path';
import { exec as execSync } from 'child_process';
import { promisify } from 'util';
import crypto from 'crypto';
import FrontierEntropyMonitor from './frontier-entropy.mjs';

const exec = promisify(execSync);

/**
 * Frontier states
 */
export const FrontierState = {
  COLLECTING: 'COLLECTING',       // Accumulating patches
  CONVERGING: 'CONVERGING',       // Merging compatible patches
  STABLE: 'STABLE',               // Ready for PR materialization
  PR_MATERIALIZED: 'PR_MATERIALIZED', // PR created
  SATURATED: 'SATURATED',         // Hit frontier limit
  FROZEN: 'FROZEN'                // Admission control triggered
};

/**
 * Frontier Convergence Engine
 */
export class FrontierEngine {
  constructor(config = {}) {
    this.repoRoot = config.repoRoot || process.cwd();
    this.frontiersDir = config.frontiersDir || '.repoos/frontiers';
    this.frontiers = new Map(); // concern → frontier metadata
    this.entropyMonitor = new FrontierEntropyMonitor({ repoRoot: this.repoRoot });
  }

  /**
   * Initialize engine
   */
  async initialize() {
    // Ensure frontiers directory exists
    const frontiersPath = path.join(this.repoRoot, this.frontiersDir);
    await fs.mkdir(frontiersPath, { recursive: true });

    // Load existing frontiers
    await this.loadFrontiers();

    console.log(`✅ Frontier Engine initialized (${this.frontiers.size} active frontiers)`);
  }

  /**
   * Load existing frontiers from disk
   */
  async loadFrontiers() {
    const frontiersPath = path.join(this.repoRoot, this.frontiersDir);

    try {
      const entries = await fs.readdir(frontiersPath, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isDirectory()) {
          const concernId = entry.name;
          const frontierFile = path.join(frontiersPath, concernId, 'frontier.json');

          try {
            const data = await fs.readFile(frontierFile, 'utf8');
            const frontier = JSON.parse(data);
            this.frontiers.set(concernId, frontier);
          } catch (error) {
            // Frontier file doesn't exist, will be created on first patch
          }
        }
      }
    } catch (error) {
      // Frontiers directory doesn't exist yet
    }
  }

  /**
   * Submit patch to frontier system
   *
   * @param {Object} patch - Patch metadata
   * @returns {Object} Admission result
   */
  async submitPatch(patch) {
    await this.initialize();

    const {
      patch_id,
      concernId,
      diff,
      files_changed = [],
      metadata = {},
      author
    } = patch;

    console.log(`📥 Submitting patch ${patch_id} to ${concernId}...`);

    // Get or create frontier
    let frontier = this.frontiers.get(concernId);
    if (!frontier) {
      frontier = await this.createFrontier(concernId);
    }

    // Check admission control
    const admissionResult = await this.checkAdmission(frontier, patch);
    if (!admissionResult.admitted) {
      console.log(`   ⚠️  Admission denied: ${admissionResult.reason}`);
      return {
        admitted: false,
        concernId,
        reason: admissionResult.reason,
        frontierState: frontier.state
      };
    }

    // Add patch to frontier
    await this.addPatchToFrontier(frontier, patch);
    console.log(`   ✅ Patch added to frontier (${frontier.patches.length} patches)`);

    // Check entropy and force convergence if needed
    await this.checkEntropyAndConverge(frontier);

    // Check if frontier should transition state
    await this.updateFrontierState(frontier);

    // Persist frontier
    await this.saveFrontier(concernId, frontier);

    return {
      admitted: true,
      concernId,
      frontierState: frontier.state,
      patchCount: frontier.patches.length,
      stabilityScore: frontier.stabilityScore
    };
  }

  /**
   * Check frontier entropy and force convergence if critical
   */
  async checkEntropyAndConverge(frontier) {
    const shouldForce = this.entropyMonitor.shouldForceConvergence(frontier);

    if (shouldForce) {
      const entropy = this.entropyMonitor.calculateEntropy(frontier);
      console.log(`   🚨 High entropy detected (${entropy.toFixed(3)}), forcing convergence`);

      frontier.state = FrontierState.CONVERGING;
      await this.convergeFrontier(frontier.concernId);

      // Enable admission control to prevent further chaos
      frontier.admissionControl.enabled = true;
      frontier.admissionControl.reason = 'High entropy detected';
    }
  }

  /**
   * Create new frontier for concern
   */
  async createFrontier(concernId) {
    const frontier = {
      concernId,
      state: FrontierState.COLLECTING,
      patches: [],
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      config: {
        frontier_limit: 50,
        convergence_strategy: 'merge'
      },
      stabilityScore: 0.0,
      convergenceAttempts: 0,
      lastPRMaterialized: null,
      admissionControl: {
        enabled: false,
        similarityThreshold: 0.85,
        maxPatchesPerHour: null
      }
    };

    this.frontiers.set(concernId, frontier);

    // Create frontier directory
    const frontierDir = path.join(this.repoRoot, this.frontiersDir, concernId);
    await fs.mkdir(frontierDir, { recursive: true });
    await fs.mkdir(path.join(frontierDir, 'candidate-patches'), { recursive: true });

    console.log(`🆕 Created new frontier: ${concernId}`);

    return frontier;
  }

  /**
   * Check admission control for patch
   */
  async checkAdmission(frontier, patch) {
    const { config, patches, state, admissionControl } = frontier;

    // Check 1: Frontier limit
    if (patches.length >= config.frontier_limit) {
      if (state !== FrontierState.SATURATED) {
        frontier.state = FrontierState.SATURATED;
        console.log(`   ⚠️  Frontier saturated (${patches.length}/${config.frontier_limit})`);
      }
      return {
        admitted: false,
        reason: `Frontier at capacity (${config.frontier_limit} patches)`
      };
    }

    // Check 2: Frozen state (admission control triggered)
    if (state === FrontierState.FROZEN) {
      return {
        admitted: false,
        reason: 'Frontier frozen by admission control'
      };
    }

    // Check 3: Duplicate detection
    if (admissionControl.enabled) {
      const similarity = await this.checkPatchSimilarity(frontier, patch);
      if (similarity > admissionControl.similarityThreshold) {
        return {
          admitted: false,
          reason: `Similar patch already in frontier (${(similarity * 100).toFixed(1)}% similarity)`
        };
      }
    }

    return { admitted: true };
  }

  /**
   * Check similarity between new patch and existing patches
   */
  async checkPatchSimilarity(frontier, newPatch) {
    if (frontier.patches.length === 0) return 0.0;

    const newFiles = new Set(newPatch.files_changed || []);
    const newDiff = newPatch.diff || '';

    let maxSimilarity = 0.0;

    for (const existingPatch of frontier.patches) {
      const existingFiles = new Set(existingPatch.files_changed || []);

      // File overlap similarity
      const intersection = new Set([...newFiles].filter(f => existingFiles.has(f)));
      const union = new Set([...newFiles, ...existingFiles]);
      const fileOverlap = union.size > 0 ? intersection.size / union.size : 0;

      // Diff content similarity (simple Jaccard for words)
      const existingDiff = existingPatch.diff || '';
      const newWords = new Set(newDiff.split(/\s+/));
      const existingWords = new Set(existingDiff.split(/\s+/));
      const wordIntersection = new Set([...newWords].filter(w => existingWords.has(w)));
      const wordUnion = new Set([...newWords, ...existingWords]);
      const diffSimilarity = wordUnion.size > 0 ? wordIntersection.size / wordUnion.size : 0;

      // Combined similarity
      const similarity = (fileOverlap * 0.6) + (diffSimilarity * 0.4);
      maxSimilarity = Math.max(maxSimilarity, similarity);
    }

    return maxSimilarity;
  }

  /**
   * Add patch to frontier
   */
  async addPatchToFrontier(frontier, patch) {
    const patchEntry = {
      patch_id: patch.patch_id,
      submittedAt: new Date().toISOString(),
      author: patch.author,
      files_changed: patch.files_changed || [],
      diff: patch.diff,
      metadata: patch.metadata || {},
      hash: this.hashPatch(patch)
    };

    frontier.patches.push(patchEntry);
    frontier.lastUpdated = new Date().toISOString();

    // Save patch file
    const patchDir = path.join(
      this.repoRoot,
      this.frontiersDir,
      frontier.concernId,
      'candidate-patches'
    );
    const patchFile = path.join(patchDir, `${patch.patch_id}.json`);
    await fs.writeFile(patchFile, JSON.stringify(patchEntry, null, 2));
  }

  /**
   * Hash patch for deduplication
   */
  hashPatch(patch) {
    const content = JSON.stringify({
      files: (patch.files_changed || []).sort(),
      diff: patch.diff
    });
    return crypto.createHash('sha256').update(content).digest('hex').substring(0, 16);
  }

  /**
   * Update frontier state based on conditions
   */
  async updateFrontierState(frontier) {
    const { patches, state, config } = frontier;

    // State transitions based on patch count
    if (state === FrontierState.COLLECTING) {
      // Transition to CONVERGING if we have enough patches
      if (patches.length >= 5) {
        frontier.state = FrontierState.CONVERGING;
        console.log(`   → Frontier transitioning to CONVERGING (${patches.length} patches)`);
      }
    }

    if (state === FrontierState.CONVERGING) {
      // Calculate stability score
      const stabilityScore = await this.calculateStabilityScore(frontier);
      frontier.stabilityScore = stabilityScore;

      // Transition to STABLE if stability threshold met
      if (stabilityScore >= 0.75 && patches.length >= 10) {
        frontier.state = FrontierState.STABLE;
        console.log(`   → Frontier STABLE (stability: ${(stabilityScore * 100).toFixed(1)}%)`);
      }
    }
  }

  /**
   * Calculate frontier stability score
   */
  async calculateStabilityScore(frontier) {
    const { patches } = frontier;

    if (patches.length === 0) return 0.0;

    // Metric 1: Time stability (how long since last patch)
    const lastPatchTime = new Date(patches[patches.length - 1].submittedAt);
    const hoursSinceLastPatch = (Date.now() - lastPatchTime.getTime()) / (1000 * 60 * 60);
    const timeStability = Math.min(hoursSinceLastPatch / 24, 1.0);

    // Metric 2: File diversity (lower is better for convergence)
    const allFiles = new Set();
    for (const patch of patches) {
      for (const file of patch.files_changed) {
        allFiles.add(file);
      }
    }
    const avgFilesPerPatch = allFiles.size / patches.length;
    const diversityStability = 1.0 - Math.min(avgFilesPerPatch / 10, 1.0);

    // Combined score
    const stabilityScore = (timeStability * 0.5 + diversityStability * 0.5);

    return Math.min(stabilityScore, 1.0);
  }

  /**
   * Converge frontier patches into unified delta
   */
  async convergeFrontier(concernId) {
    const frontier = this.frontiers.get(concernId);
    if (!frontier) {
      throw new Error(`Frontier not found: ${concernId}`);
    }

    console.log(`🔄 Converging frontier: ${concernId} (${frontier.patches.length} patches)`);

    frontier.convergenceAttempts++;

    // Use merge strategy
    const delta = await this.convergeMerge(frontier);

    // Save synthesized delta
    const deltaFile = path.join(
      this.repoRoot,
      this.frontiersDir,
      concernId,
      'synthesized-delta.patch'
    );
    await fs.writeFile(deltaFile, delta.content);

    // Update frontier
    frontier.synthesizedDelta = {
      file: deltaFile,
      createdAt: new Date().toISOString(),
      strategy: 'merge',
      patchCount: frontier.patches.length,
      conflicts: delta.conflicts || []
    };

    await this.saveFrontier(concernId, frontier);

    console.log(`   ✅ Delta synthesized (${delta.conflicts?.length || 0} conflicts)`);

    return delta;
  }

  /**
   * Convergence strategy: merge compatible patches
   */
  async convergeMerge(frontier) {
    const { patches } = frontier;

    // Group patches by file
    const filePatches = new Map();
    for (const patch of patches) {
      for (const file of patch.files_changed) {
        if (!filePatches.has(file)) {
          filePatches.set(file, []);
        }
        filePatches.get(file).push(patch);
      }
    }

    // Build unified diff
    let unifiedDiff = `# Unified patch for concern: ${frontier.concernId}\n`;
    unifiedDiff += `# Patches: ${patches.length}\n`;
    unifiedDiff += `# Strategy: merge\n\n`;

    const conflicts = [];

    for (const [file, fileSpecificPatches] of filePatches.entries()) {
      unifiedDiff += `\n--- Changes to ${file}\n`;

      if (fileSpecificPatches.length > 1) {
        // Potential conflict - flag for manual review
        conflicts.push({
          file,
          patchCount: fileSpecificPatches.length,
          reason: 'Multiple patches modify same file'
        });
        unifiedDiff += `# WARNING: ${fileSpecificPatches.length} patches modify this file\n`;
      }

      for (const patch of fileSpecificPatches) {
        unifiedDiff += `\n# Patch: ${patch.patch_id}\n`;
        unifiedDiff += patch.diff + '\n';
      }
    }

    return {
      content: unifiedDiff,
      conflicts,
      filesChanged: Array.from(filePatches.keys())
    };
  }

  /**
   * Materialize PR from stable frontier
   */
  async materializePR(concernId) {
    const frontier = this.frontiers.get(concernId);
    if (!frontier) {
      throw new Error(`Frontier not found: ${concernId}`);
    }

    console.log(`📝 Materializing PR for frontier: ${concernId}`);

    // Converge if not already done
    if (!frontier.synthesizedDelta) {
      await this.convergeFrontier(concernId);
    }

    // Create PR metadata
    const pr = {
      concernId,
      title: `[${concernId}] Convergence: ${frontier.patches.length} patches`,
      description: this.generatePRDescription(frontier),
      patchFile: frontier.synthesizedDelta.file,
      patchCount: frontier.patches.length,
      filesChanged: frontier.synthesizedDelta.filesChanged || [],
      conflicts: frontier.synthesizedDelta.conflicts || [],
      convergenceStrategy: 'merge',
      stabilityScore: frontier.stabilityScore,
      createdAt: new Date().toISOString()
    };

    // Save PR metadata
    const prFile = path.join(
      this.repoRoot,
      this.frontiersDir,
      concernId,
      'materialized-pr.json'
    );
    await fs.writeFile(prFile, JSON.stringify(pr, null, 2));

    // Update frontier state
    frontier.state = FrontierState.PR_MATERIALIZED;
    frontier.lastPRMaterialized = new Date().toISOString();

    await this.saveFrontier(concernId, frontier);

    console.log(`   ✅ PR materialized: ${pr.title}`);

    return pr;
  }

  /**
   * Generate PR description from frontier
   */
  generatePRDescription(frontier) {
    const { concernId, patches, synthesizedDelta } = frontier;

    let description = `## Frontier Convergence: ${concernId}\n\n`;
    description += `**Patches Converged:** ${patches.length}\n`;
    description += `**Stability Score:** ${(frontier.stabilityScore * 100).toFixed(1)}%\n\n`;

    description += `### Patches Included\n\n`;
    for (const patch of patches.slice(0, 20)) {
      description += `- ${patch.patch_id} by ${patch.author || 'unknown'}\n`;
    }
    if (patches.length > 20) {
      description += `\n_...and ${patches.length - 20} more patches_\n`;
    }

    if (synthesizedDelta?.conflicts && synthesizedDelta.conflicts.length > 0) {
      description += `\n### ⚠️ Conflicts Detected\n\n`;
      for (const conflict of synthesizedDelta.conflicts) {
        description += `- **${conflict.file}**: ${conflict.reason}\n`;
      }
    }

    description += `\n---\n`;
    description += `🤖 Generated by Frontier Convergence Engine\n`;

    return description;
  }

  /**
   * Reset frontier after PR merge
   */
  async resetFrontier(concernId) {
    const frontier = this.frontiers.get(concernId);
    if (!frontier) return;

    console.log(`🔄 Resetting frontier: ${concernId}`);

    // Archive patches
    const archiveDir = path.join(
      this.repoRoot,
      this.frontiersDir,
      concernId,
      'archive',
      new Date().toISOString().split('T')[0]
    );
    await fs.mkdir(archiveDir, { recursive: true });

    // Reset frontier
    frontier.state = FrontierState.COLLECTING;
    frontier.patches = [];
    frontier.stabilityScore = 0.0;
    frontier.convergenceAttempts = 0;
    frontier.synthesizedDelta = null;
    frontier.lastUpdated = new Date().toISOString();

    await this.saveFrontier(concernId, frontier);

    console.log(`   ✅ Frontier reset`);
  }

  /**
   * Save frontier to disk
   */
  async saveFrontier(concernId, frontier) {
    const frontierFile = path.join(
      this.repoRoot,
      this.frontiersDir,
      concernId,
      'frontier.json'
    );
    await fs.writeFile(frontierFile, JSON.stringify(frontier, null, 2));
    this.frontiers.set(concernId, frontier);
  }

  /**
   * Get all frontiers with status
   */
  async getAllFrontiers() {
    await this.initialize();

    const frontierList = [];
    for (const [concernId, frontier] of this.frontiers.entries()) {
      frontierList.push({
        concernId,
        state: frontier.state,
        patchCount: frontier.patches.length,
        stabilityScore: frontier.stabilityScore,
        limit: frontier.config.frontier_limit,
        lastUpdated: frontier.lastUpdated
      });
    }

    return frontierList;
  }
}

/**
 * CLI usage
 */
if (import.meta.url === `file://${process.argv[1]}`) {
  const engine = new FrontierEngine();

  const command = process.argv[2];

  if (command === 'init') {
    await engine.initialize();
    console.log('✅ Frontier Engine initialized');
  } else if (command === 'list') {
    const frontiers = await engine.getAllFrontiers();
    console.log('\n📋 Active Frontiers:\n');
    for (const frontier of frontiers) {
      console.log(`${frontier.concernId}:`);
      console.log(`  State: ${frontier.state}`);
      console.log(`  Patches: ${frontier.patchCount}/${frontier.limit}`);
      console.log(`  Stability: ${(frontier.stabilityScore * 100).toFixed(1)}%\n`);
    }
  } else {
    console.log('Frontier Convergence Engine');
    console.log('\nUsage:');
    console.log('  node frontier-engine.mjs init    - Initialize engine');
    console.log('  node frontier-engine.mjs list    - List all frontiers');
  }
}

export default FrontierEngine;
