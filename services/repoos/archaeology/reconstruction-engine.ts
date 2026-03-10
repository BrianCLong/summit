/**
 * Reconstruction Engine
 *
 * Converts deleted code fragments into git-applicable patch files for resurrection:
 * - Assembles fragments into coherent code units
 * - Resolves dependencies and imports
 * - Generates valid unified diff format
 * - Includes provenance metadata
 * - Validates reconstruction correctness
 *
 * Output: Git patches that can be applied via `git apply`
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import type { CodeFragment } from './fragment-extractor.js';
import type { DeletionCandidate } from './partial-deletion-detector.js';

const execAsync = promisify(exec);

export interface ReconstructionBundle {
  bundle_id: string;
  candidate_id: string; // Reference to deletion candidate
  capability_name: string;
  fragments: string[]; // Fragment IDs used
  target_paths: string[]; // Where to restore the code
  synthesis_strategy: 'direct_restore' | 'merge_fragments' | 'reconstruct_with_repairs';
  confidence: number; // 0-1
  patch_content: string; // The actual git patch
  provenance: {
    original_commit: string;
    original_author: string;
    deleted_at: string;
    reconstructed_at: string;
    reconstruction_method: string;
  };
  validation: {
    syntax_valid: boolean;
    imports_resolved: boolean;
    exports_complete: boolean;
    conflicts_detected: string[];
  };
}

export interface ReconstructionConfig {
  fragments_file: string;
  deletion_candidates_file: string;
  output_dir: string;
  repo_path: string;
  validate_syntax?: boolean;
  max_bundles?: number;
  target_branch?: string;
}

export class ReconstructionEngine {
  private config: Required<ReconstructionConfig>;
  private fragments: CodeFragment[] = [];
  private candidates: DeletionCandidate[] = [];
  private bundles: ReconstructionBundle[] = [];

  constructor(config: ReconstructionConfig) {
    this.config = {
      fragments_file: config.fragments_file,
      deletion_candidates_file: config.deletion_candidates_file,
      output_dir: config.output_dir,
      repo_path: config.repo_path,
      validate_syntax: config.validate_syntax ?? true,
      max_bundles: config.max_bundles || 50,
      target_branch: config.target_branch || 'HEAD',
    };
  }

  /**
   * Main reconstruction pipeline
   */
  async reconstruct(): Promise<ReconstructionBundle[]> {
    console.log('Reconstruction Engine: Starting capability resurrection...');

    // 1. Load fragments and candidates
    await this.loadData();
    console.log(`  Loaded ${this.fragments.length} fragments`);
    console.log(`  Loaded ${this.candidates.length} deletion candidates`);

    // 2. Filter candidates worth resurrecting
    const resurrectCandidates = this.candidates.filter(
      (c) => c.recommendation === 'resurrect_immediately' || c.recommendation === 'resurrect_soon'
    );
    console.log(`  ${resurrectCandidates.length} candidates selected for resurrection`);

    if (resurrectCandidates.length === 0) {
      console.log('  No candidates to resurrect, exiting');
      return [];
    }

    // 3. Create reconstruction bundles
    const limit = Math.min(resurrectCandidates.length, this.config.max_bundles);
    for (let i = 0; i < limit; i++) {
      const candidate = resurrectCandidates[i];
      const bundle = await this.createBundle(candidate);
      if (bundle) {
        this.bundles.push(bundle);
      }
    }

    console.log(`  Created ${this.bundles.length} reconstruction bundles`);

    // 4. Generate patches
    for (const bundle of this.bundles) {
      await this.generatePatch(bundle);
    }

    // 5. Validate patches
    if (this.config.validate_syntax) {
      await this.validateBundles();
    }

    // 6. Save results
    await this.saveResults();

    console.log(`Reconstruction complete: ${this.bundles.length} patches generated`);
    return this.bundles;
  }

  /**
   * Load fragments and candidates
   */
  private async loadData(): Promise<void> {
    // Load fragments
    const fragData = await fs.readFile(this.config.fragments_file, 'utf8');
    const fragParsed = JSON.parse(fragData);
    this.fragments = fragParsed.fragments || [];

    // Load candidates
    const candData = await fs.readFile(this.config.deletion_candidates_file, 'utf8');
    const candParsed = JSON.parse(candData);
    this.candidates = candParsed.candidates || [];
  }

  /**
   * Create reconstruction bundle for candidate
   */
  private async createBundle(candidate: DeletionCandidate): Promise<ReconstructionBundle | null> {
    try {
      const fragments = candidate.deleted_fragments
        .map((fid) => this.fragments.find((f) => f.id === fid))
        .filter((f): f is CodeFragment => f !== undefined);

      if (fragments.length === 0) {
        console.warn(`  No fragments found for candidate ${candidate.id}`);
        return null;
      }

      // Determine target paths
      const targetPaths = this.determineTargetPaths(fragments);

      // Determine synthesis strategy
      const strategy = this.determineSynthesisStrategy(fragments);

      // Calculate confidence
      const confidence = this.calculateReconstructionConfidence(candidate, fragments);

      // Get provenance
      const firstFrag = fragments[0];
      const provenance = {
        original_commit: firstFrag.commit_sha,
        original_author: firstFrag.author,
        deleted_at: candidate.deletion_info.deleted_at,
        reconstructed_at: new Date().toISOString(),
        reconstruction_method: strategy,
      };

      const bundle: ReconstructionBundle = {
        bundle_id: `bundle_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        candidate_id: candidate.id,
        capability_name: candidate.capability_name,
        fragments: candidate.deleted_fragments,
        target_paths: targetPaths,
        synthesis_strategy: strategy,
        confidence,
        patch_content: '', // Generated later
        provenance,
        validation: {
          syntax_valid: false,
          imports_resolved: false,
          exports_complete: false,
          conflicts_detected: [],
        },
      };

      return bundle;
    } catch (error) {
      console.error(`  Failed to create bundle for ${candidate.id}:`, error);
      return null;
    }
  }

  /**
   * Determine target paths for restoration
   */
  private determineTargetPaths(fragments: CodeFragment[]): string[] {
    // Group fragments by file path
    const pathGroups = new Map<string, CodeFragment[]>();

    for (const frag of fragments) {
      const group = pathGroups.get(frag.file_path) || [];
      group.push(frag);
      pathGroups.set(frag.file_path, group);
    }

    return Array.from(pathGroups.keys());
  }

  /**
   * Determine synthesis strategy
   */
  private determineSynthesisStrategy(
    fragments: CodeFragment[]
  ): ReconstructionBundle['synthesis_strategy'] {
    // If all fragments from same file, direct restore
    const uniquePaths = new Set(fragments.map((f) => f.file_path));
    if (uniquePaths.size === 1 && fragments.length === 1) {
      return 'direct_restore';
    }

    // If multiple fragments need merging
    if (fragments.length > 1) {
      return 'merge_fragments';
    }

    // Default to reconstruction with repairs
    return 'reconstruct_with_repairs';
  }

  /**
   * Calculate reconstruction confidence
   */
  private calculateReconstructionConfidence(
    candidate: DeletionCandidate,
    fragments: CodeFragment[]
  ): number {
    let confidence = 0.5;

    // High feasibility
    if (candidate.resurrection_assessment.feasibility === 'high') {
      confidence += 0.3;
    } else if (candidate.resurrection_assessment.feasibility === 'medium') {
      confidence += 0.1;
    }

    // Dependencies available
    if (candidate.resurrection_assessment.dependencies_available) {
      confidence += 0.1;
    }

    // No conflicts
    if (!candidate.resurrection_assessment.conflicts_with_current) {
      confidence += 0.1;
    }

    // Fragment quality
    const avgComplexity =
      fragments.reduce((sum, f) => sum + f.complexity_score, 0) / fragments.length;
    if (avgComplexity < 10) {
      confidence += 0.1; // Simple code is easier to restore
    }

    return Math.min(confidence, 1.0);
  }

  /**
   * Generate git patch for bundle
   */
  private async generatePatch(bundle: ReconstructionBundle): Promise<void> {
    const fragments = bundle.fragments
      .map((fid) => this.fragments.find((f) => f.id === fid))
      .filter((f): f is CodeFragment => f !== undefined);

    // Build patch content
    let patchContent = '';

    // Patch header
    patchContent += `From: Repository Archaeology Engine <archaeology@summit.local>\n`;
    patchContent += `Date: ${bundle.provenance.reconstructed_at}\n`;
    patchContent += `Subject: [RESURRECTION] ${bundle.capability_name}\n\n`;
    patchContent += `Reconstruction Bundle: ${bundle.bundle_id}\n`;
    patchContent += `Strategy: ${bundle.synthesis_strategy}\n`;
    patchContent += `Confidence: ${Math.round(bundle.confidence * 100)}%\n`;
    patchContent += `Original Author: ${bundle.provenance.original_author}\n`;
    patchContent += `Original Commit: ${bundle.provenance.original_commit}\n`;
    patchContent += `Deleted At: ${bundle.provenance.deleted_at}\n`;
    patchContent += `Fragments: ${fragments.length}\n\n`;

    // Generate diffs for each target path
    for (const targetPath of bundle.target_paths) {
      const pathFragments = fragments.filter((f) => f.file_path === targetPath);

      if (pathFragments.length === 0) continue;

      // Merge fragment content
      const mergedContent = this.mergeFragmentContent(pathFragments);

      // Generate unified diff
      const diff = this.generateUnifiedDiff(targetPath, mergedContent);
      patchContent += diff;
      patchContent += '\n';
    }

    bundle.patch_content = patchContent;
  }

  /**
   * Merge content from multiple fragments
   */
  private mergeFragmentContent(fragments: CodeFragment[]): string {
    if (fragments.length === 1) {
      return fragments[0].content;
    }

    // Sort fragments by line number
    fragments.sort((a, b) => a.lines.start - b.lines.start);

    // Merge with spacing
    const parts: string[] = [];
    for (const frag of fragments) {
      parts.push(frag.content);
    }

    return parts.join('\n\n');
  }

  /**
   * Generate unified diff format
   */
  private generateUnifiedDiff(filePath: string, content: string): string {
    const lines = content.split('\n');
    let diff = '';

    diff += `--- /dev/null\n`;
    diff += `+++ b/${filePath}\n`;
    diff += `@@ -0,0 +1,${lines.length} @@\n`;

    for (const line of lines) {
      diff += `+${line}\n`;
    }

    return diff;
  }

  /**
   * Validate reconstruction bundles
   */
  private async validateBundles(): Promise<void> {
    console.log('  Validating reconstruction bundles...');

    for (const bundle of this.bundles) {
      await this.validateBundle(bundle);
    }

    const validCount = this.bundles.filter((b) => b.validation.syntax_valid).length;
    console.log(`  ${validCount}/${this.bundles.length} bundles passed validation`);
  }

  /**
   * Validate a single bundle
   */
  private async validateBundle(bundle: ReconstructionBundle): Promise<void> {
    // 1. Basic syntax check (simplified - production would use actual parser)
    bundle.validation.syntax_valid = this.checkSyntax(bundle.patch_content);

    // 2. Check imports resolved
    bundle.validation.imports_resolved = await this.checkImportsResolved(bundle);

    // 3. Check exports complete
    bundle.validation.exports_complete = this.checkExportsComplete(bundle);

    // 4. Check for conflicts
    bundle.validation.conflicts_detected = await this.detectConflicts(bundle);
  }

  /**
   * Basic syntax validation
   */
  private checkSyntax(patchContent: string): boolean {
    // Check for basic patch structure
    if (!patchContent.includes('+++') || !patchContent.includes('---')) {
      return false;
    }

    if (!patchContent.includes('@@')) {
      return false;
    }

    // Check for balanced braces (simplified)
    const braceCount = (patchContent.match(/\{/g) || []).length -
                      (patchContent.match(/\}/g) || []).length;

    return Math.abs(braceCount) <= 2; // Allow small imbalance
  }

  /**
   * Check if imports can be resolved
   */
  private async checkImportsResolved(bundle: ReconstructionBundle): Promise<boolean> {
    const fragments = bundle.fragments
      .map((fid) => this.fragments.find((f) => f.id === fid))
      .filter((f): f is CodeFragment => f !== undefined);

    const requiredDeps = new Set<string>();
    for (const frag of fragments) {
      for (const dep of frag.dependencies) {
        requiredDeps.add(dep);
      }
    }

    // Check if these exist in current fragments
    const currentFragments = this.fragments.filter((f) => !f.deletion_info);
    const availableDeps = new Set(
      currentFragments.flatMap((f) => f.exported_symbols)
    );

    for (const dep of requiredDeps) {
      const available = Array.from(availableDeps).some((avail) => dep.includes(avail));
      if (!available) {
        return false;
      }
    }

    return true;
  }

  /**
   * Check if all exports are present
   */
  private checkExportsComplete(bundle: ReconstructionBundle): boolean {
    const fragments = bundle.fragments
      .map((fid) => this.fragments.find((f) => f.id === fid))
      .filter((f): f is CodeFragment => f !== undefined);

    const exportedSymbols = fragments.flatMap((f) => f.exported_symbols);
    return exportedSymbols.length > 0; // At least some exports
  }

  /**
   * Detect potential conflicts
   */
  private async detectConflicts(bundle: ReconstructionBundle): Promise<string[]> {
    const conflicts: string[] = [];

    // Check if target paths already exist
    for (const targetPath of bundle.target_paths) {
      try {
        const fullPath = path.join(this.config.repo_path, targetPath);
        await fs.access(fullPath);
        conflicts.push(`File already exists: ${targetPath}`);
      } catch {
        // File doesn't exist, good
      }
    }

    return conflicts;
  }

  /**
   * Save reconstruction results
   */
  private async saveResults(): Promise<void> {
    await fs.mkdir(this.config.output_dir, { recursive: true });

    // Save bundle metadata
    const bundlesPath = path.join(this.config.output_dir, 'reconstruction_bundles.json');
    await fs.writeFile(
      bundlesPath,
      JSON.stringify(
        {
          reconstructed_at: new Date().toISOString(),
          total_bundles: this.bundles.length,
          bundles: this.bundles.map((b) => ({
            ...b,
            patch_content: `<saved to ${b.bundle_id}.patch>`,
          })),
        },
        null,
        2
      )
    );

    // Save individual patches
    const patchesDir = path.join(this.config.output_dir, 'patches');
    await fs.mkdir(patchesDir, { recursive: true });

    for (const bundle of this.bundles) {
      const patchPath = path.join(patchesDir, `${bundle.bundle_id}.patch`);
      await fs.writeFile(patchPath, bundle.patch_content);
    }

    console.log(`Reconstruction bundles saved to: ${bundlesPath}`);
    console.log(`Patches saved to: ${patchesDir}/`);
  }

  /**
   * Get reconstruction statistics
   */
  getStats(): ReconstructionStats {
    return {
      total_bundles: this.bundles.length,
      valid_bundles: this.bundles.filter((b) => b.validation.syntax_valid).length,
      by_strategy: this.countByStrategy(),
      avg_confidence: this.calculateAvgConfidence(),
      total_files_restored: this.bundles.reduce((sum, b) => sum + b.target_paths.length, 0),
    };
  }

  private countByStrategy(): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const bundle of this.bundles) {
      const strategy = bundle.synthesis_strategy;
      counts[strategy] = (counts[strategy] || 0) + 1;
    }
    return counts;
  }

  private calculateAvgConfidence(): number {
    if (this.bundles.length === 0) return 0;
    const sum = this.bundles.reduce((s, b) => s + b.confidence, 0);
    return Math.round((sum / this.bundles.length) * 100) / 100;
  }
}

interface ReconstructionStats {
  total_bundles: number;
  valid_bundles: number;
  by_strategy: Record<string, number>;
  avg_confidence: number;
  total_files_restored: number;
}
