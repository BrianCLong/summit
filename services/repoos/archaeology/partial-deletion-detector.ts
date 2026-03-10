/**
 * Partial Deletion Detector
 *
 * Identifies deleted capabilities that may need resurrection:
 * - Complete file deletions
 * - Partial subsystem removals
 * - Deprecated features that were removed
 * - Capabilities deleted in error
 *
 * Produces resurrection candidates ranked by:
 * - Usage evidence (was it actively used?)
 * - Deletion context (why was it removed?)
 * - Resurrection feasibility (can it be restored?)
 * - Business value (should it be restored?)
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type { CodeFragment } from './fragment-extractor.js';
import type { Subsystem } from './subsystem-inference.js';

export interface DeletionCandidate {
  id: string;
  capability_name: string;
  deleted_fragments: string[]; // Fragment IDs that were deleted
  subsystem_id?: string; // If part of a known subsystem
  deletion_info: {
    deleted_at: string; // ISO 8601 timestamp
    deleted_by: string; // Author
    deleted_in_commit: string;
    reason: string; // Commit message
    deletion_type: 'complete_removal' | 'partial_removal' | 'refactor' | 'deprecation';
  };
  usage_evidence: {
    was_exported: boolean;
    had_dependencies: string[]; // What depended on it
    usage_frequency: number; // How often it was changed
    last_active_usage?: string; // When was it last actively used
  };
  resurrection_assessment: {
    feasibility: 'high' | 'medium' | 'low' | 'blocked';
    confidence: number; // 0-1
    estimated_effort: 'trivial' | 'moderate' | 'significant' | 'major';
    blockers: string[]; // What prevents resurrection
    dependencies_available: boolean;
    conflicts_with_current: boolean;
  };
  business_value: {
    priority: 'critical' | 'high' | 'medium' | 'low';
    value_score: number; // 0-1
    use_cases: string[];
    alternative_exists: boolean;
  };
  recommendation: 'resurrect_immediately' | 'resurrect_soon' | 'defer' | 'do_not_resurrect';
}

export interface PartialDeletionConfig {
  fragments_file: string;
  subsystems_file?: string;
  output_dir: string;
  repo_path: string;
  min_value_score?: number; // Minimum value to consider resurrection
  check_dependencies?: boolean; // Verify dependencies still exist
}

export class PartialDeletionDetector {
  private config: Required<PartialDeletionConfig>;
  private fragments: CodeFragment[] = [];
  private subsystems: Subsystem[] = [];
  private candidates: DeletionCandidate[] = [];

  constructor(config: PartialDeletionConfig) {
    this.config = {
      fragments_file: config.fragments_file,
      subsystems_file: config.subsystems_file || '',
      output_dir: config.output_dir,
      repo_path: config.repo_path,
      min_value_score: config.min_value_score || 0.3,
      check_dependencies: config.check_dependencies ?? true,
    };
  }

  /**
   * Main detection pipeline
   */
  async detect(): Promise<DeletionCandidate[]> {
    console.log('Partial Deletion Detection: Starting analysis...');

    // 1. Load fragments and subsystems
    await this.loadData();
    console.log(`  Loaded ${this.fragments.length} fragments`);

    // 2. Find deleted fragments
    const deletedFragments = this.fragments.filter((f) => f.deletion_info);
    console.log(`  Found ${deletedFragments.length} deleted fragments`);

    if (deletedFragments.length === 0) {
      console.log('  No deletions detected, skipping analysis');
      return [];
    }

    // 3. Group deleted fragments into capabilities
    await this.groupIntoDeletions(deletedFragments);
    console.log(`  Identified ${this.candidates.length} deletion candidates`);

    // 4. Assess each candidate
    for (const candidate of this.candidates) {
      await this.assessCandidate(candidate);
    }

    // 5. Rank candidates
    this.rankCandidates();

    // 6. Save results
    await this.saveResults();

    console.log(`Deletion Detection complete: ${this.candidates.length} candidates identified`);
    const resurrectCount = this.candidates.filter(
      (c) =>
        c.recommendation === 'resurrect_immediately' || c.recommendation === 'resurrect_soon'
    ).length;
    console.log(`  ${resurrectCount} recommended for resurrection`);

    return this.candidates;
  }

  /**
   * Load fragments and subsystems
   */
  private async loadData(): Promise<void> {
    // Load fragments
    const fragData = await fs.readFile(this.config.fragments_file, 'utf8');
    const fragParsed = JSON.parse(fragData);
    this.fragments = fragParsed.fragments || [];

    // Load subsystems if available
    if (this.config.subsystems_file) {
      try {
        const subData = await fs.readFile(this.config.subsystems_file, 'utf8');
        const subParsed = JSON.parse(subData);
        this.subsystems = subParsed.subsystems || [];
      } catch (error) {
        console.log('  No subsystems file found, continuing without subsystem context');
      }
    }
  }

  /**
   * Group deleted fragments into deletion candidates
   */
  private async groupIntoDeletions(deletedFragments: CodeFragment[]): Promise<void> {
    // Group by commit + file path (fragments deleted together)
    const deletionGroups = new Map<string, CodeFragment[]>();

    for (const frag of deletedFragments) {
      if (!frag.deletion_info) continue;

      const key = `${frag.deletion_info.deleted_in_commit}::${frag.file_path}`;
      const group = deletionGroups.get(key) || [];
      group.push(frag);
      deletionGroups.set(key, group);
    }

    // Convert groups to deletion candidates
    let candidateId = 1;
    for (const [key, fragments] of deletionGroups.entries()) {
      const candidate = this.createCandidate(candidateId, fragments);
      this.candidates.push(candidate);
      candidateId++;
    }
  }

  /**
   * Create deletion candidate from fragment group
   */
  private createCandidate(id: number, fragments: CodeFragment[]): DeletionCandidate {
    const firstFrag = fragments[0];
    const deletionInfo = firstFrag.deletion_info!;

    // Determine capability name
    const capabilityName = this.inferCapabilityName(fragments);

    // Find associated subsystem
    const subsystemId = this.findSubsystem(fragments);

    // Determine deletion type
    const deletionType = this.classifyDeletionType(fragments, deletionInfo);

    // Extract usage evidence
    const usageEvidence = this.extractUsageEvidence(fragments);

    return {
      id: `deletion_${String(id).padStart(3, '0')}`,
      capability_name: capabilityName,
      deleted_fragments: fragments.map((f) => f.id),
      subsystem_id,
      deletion_info: {
        deleted_at: deletionInfo.deleted_at,
        deleted_by: deletionInfo.deleted_by,
        deleted_in_commit: deletionInfo.deleted_in_commit,
        reason: deletionInfo.reason,
        deletion_type: deletionType,
      },
      usage_evidence: usageEvidence,
      resurrection_assessment: {
        feasibility: 'medium',
        confidence: 0,
        estimated_effort: 'moderate',
        blockers: [],
        dependencies_available: false,
        conflicts_with_current: false,
      },
      business_value: {
        priority: 'medium',
        value_score: 0,
        use_cases: [],
        alternative_exists: false,
      },
      recommendation: 'defer',
    };
  }

  /**
   * Infer capability name from fragments
   */
  private inferCapabilityName(fragments: CodeFragment[]): string {
    // Try to extract from primary symbols
    const symbols = fragments.flatMap((f) => f.exported_symbols);
    if (symbols.length > 0) {
      return symbols[0];
    }

    // Try to extract from file path
    const firstPath = fragments[0].file_path;
    const fileName = path.basename(firstPath, path.extname(firstPath));
    return fileName
      .split(/[-_]/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Find which subsystem these fragments belonged to
   */
  private findSubsystem(fragments: CodeFragment[]): string | undefined {
    const fragmentIds = new Set(fragments.map((f) => f.id));

    for (const subsystem of this.subsystems) {
      // Check if any fragments match
      for (const fragId of subsystem.fragments) {
        if (fragmentIds.has(fragId)) {
          return subsystem.id;
        }
      }
    }

    return undefined;
  }

  /**
   * Classify deletion type
   */
  private classifyDeletionType(
    fragments: CodeFragment[],
    deletionInfo: NonNullable<CodeFragment['deletion_info']>
  ): DeletionCandidate['deletion_info']['deletion_type'] {
    const reason = deletionInfo.reason.toLowerCase();

    if (reason.includes('deprecat')) {
      return 'deprecation';
    }
    if (reason.includes('refactor') || reason.includes('restructur')) {
      return 'refactor';
    }
    if (reason.includes('remove') && reason.includes('part')) {
      return 'partial_removal';
    }
    return 'complete_removal';
  }

  /**
   * Extract usage evidence from fragments
   */
  private extractUsageEvidence(
    fragments: CodeFragment[]
  ): DeletionCandidate['usage_evidence'] {
    const exported = fragments.some((f) => f.exported_symbols.length > 0);

    // Find what depended on these fragments
    const dependents = new Set<string>();
    const fragmentIds = new Set(fragments.map((f) => f.id));

    for (const otherFrag of this.fragments) {
      if (fragmentIds.has(otherFrag.id)) continue;

      // Check if this fragment imports from deleted fragments
      for (const frag of fragments) {
        for (const exportedSym of frag.exported_symbols) {
          if (otherFrag.dependencies.some((dep) => dep.includes(exportedSym))) {
            dependents.add(otherFrag.file_path);
          }
        }
      }
    }

    // Usage frequency = number of commits that touched these fragments
    const uniqueCommits = new Set(fragments.map((f) => f.commit_sha));

    // Last active usage
    const timestamps = fragments
      .map((f) => new Date(f.timestamp))
      .sort((a, b) => b.getTime() - a.getTime());
    const lastActive = timestamps.length > 0 ? timestamps[0].toISOString() : undefined;

    return {
      was_exported: exported,
      had_dependencies: Array.from(dependents),
      usage_frequency: uniqueCommits.size,
      last_active_usage: lastActive,
    };
  }

  /**
   * Assess resurrection feasibility and value
   */
  private async assessCandidate(candidate: DeletionCandidate): Promise<void> {
    // 1. Check dependencies
    if (this.config.check_dependencies) {
      candidate.resurrection_assessment.dependencies_available =
        await this.checkDependenciesAvailable(candidate);
    } else {
      candidate.resurrection_assessment.dependencies_available = true;
    }

    // 2. Check for conflicts
    candidate.resurrection_assessment.conflicts_with_current = await this.checkConflicts(
      candidate
    );

    // 3. Determine blockers
    candidate.resurrection_assessment.blockers = this.identifyBlockers(candidate);

    // 4. Calculate feasibility
    candidate.resurrection_assessment.feasibility = this.calculateFeasibility(candidate);

    // 5. Estimate effort
    candidate.resurrection_assessment.estimated_effort = this.estimateEffort(candidate);

    // 6. Calculate confidence
    candidate.resurrection_assessment.confidence = this.calculateConfidence(candidate);

    // 7. Assess business value
    candidate.business_value = this.assessBusinessValue(candidate);

    // 8. Generate recommendation
    candidate.recommendation = this.generateRecommendation(candidate);
  }

  /**
   * Check if dependencies are still available
   */
  private async checkDependenciesAvailable(candidate: DeletionCandidate): Promise<boolean> {
    const fragments = candidate.deleted_fragments
      .map((fid) => this.fragments.find((f) => f.id === fid))
      .filter((f): f is CodeFragment => f !== undefined);

    const requiredDeps = new Set<string>();
    for (const frag of fragments) {
      for (const dep of frag.dependencies) {
        requiredDeps.add(dep);
      }
    }

    // Check if these dependencies still exist in current code
    // (Simplified - production would check actual repo state)
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
   * Check for conflicts with current code
   */
  private async checkConflicts(candidate: DeletionCandidate): Promise<boolean> {
    const fragments = candidate.deleted_fragments
      .map((fid) => this.fragments.find((f) => f.id === fid))
      .filter((f): f is CodeFragment => f !== undefined);

    const deletedPaths = new Set(fragments.map((f) => f.file_path));
    const currentPaths = new Set(
      this.fragments.filter((f) => !f.deletion_info).map((f) => f.file_path)
    );

    // Check if any deleted paths now exist with different content
    for (const deletedPath of deletedPaths) {
      if (currentPaths.has(deletedPath)) {
        return true; // Conflict: file was deleted but now exists again
      }
    }

    return false;
  }

  /**
   * Identify blockers to resurrection
   */
  private identifyBlockers(candidate: DeletionCandidate): string[] {
    const blockers: string[] = [];

    if (!candidate.resurrection_assessment.dependencies_available) {
      blockers.push('Missing dependencies');
    }

    if (candidate.resurrection_assessment.conflicts_with_current) {
      blockers.push('Conflicts with current code');
    }

    if (candidate.deletion_info.deletion_type === 'refactor') {
      blockers.push('Code was refactored, not deleted');
    }

    const reason = candidate.deletion_info.reason.toLowerCase();
    if (reason.includes('security') || reason.includes('vulnerability')) {
      blockers.push('Deleted for security reasons');
    }

    return blockers;
  }

  /**
   * Calculate feasibility score
   */
  private calculateFeasibility(
    candidate: DeletionCandidate
  ): DeletionCandidate['resurrection_assessment']['feasibility'] {
    const blockers = candidate.resurrection_assessment.blockers.length;
    const depsAvail = candidate.resurrection_assessment.dependencies_available;
    const hasConflicts = candidate.resurrection_assessment.conflicts_with_current;

    if (blockers >= 2 || !depsAvail) {
      return 'blocked';
    }
    if (blockers === 1 || hasConflicts) {
      return 'low';
    }
    if (candidate.deletion_info.deletion_type === 'deprecation') {
      return 'medium';
    }
    return 'high';
  }

  /**
   * Estimate resurrection effort
   */
  private estimateEffort(
    candidate: DeletionCandidate
  ): DeletionCandidate['resurrection_assessment']['estimated_effort'] {
    const fragmentCount = candidate.deleted_fragments.length;
    const depsCount = candidate.usage_evidence.had_dependencies.length;

    if (fragmentCount <= 2 && depsCount === 0) {
      return 'trivial';
    }
    if (fragmentCount <= 5 && depsCount <= 2) {
      return 'moderate';
    }
    if (fragmentCount <= 10 || depsCount <= 5) {
      return 'significant';
    }
    return 'major';
  }

  /**
   * Calculate confidence in assessment
   */
  private calculateConfidence(candidate: DeletionCandidate): number {
    let confidence = 0.5; // Base confidence

    // Increase confidence if we have usage evidence
    if (candidate.usage_evidence.was_exported) {
      confidence += 0.2;
    }
    if (candidate.usage_evidence.had_dependencies.length > 0) {
      confidence += 0.1;
    }

    // Increase if part of known subsystem
    if (candidate.subsystem_id) {
      confidence += 0.1;
    }

    // Decrease if blockers exist
    confidence -= candidate.resurrection_assessment.blockers.length * 0.1;

    return Math.max(0, Math.min(1, confidence));
  }

  /**
   * Assess business value
   */
  private assessBusinessValue(candidate: DeletionCandidate): DeletionCandidate['business_value'] {
    let valueScore = 0;

    // Was it used?
    if (candidate.usage_evidence.was_exported) {
      valueScore += 0.3;
    }

    // Had dependents?
    const depCount = candidate.usage_evidence.had_dependencies.length;
    valueScore += Math.min(depCount * 0.1, 0.4);

    // High usage frequency?
    const frequency = candidate.usage_evidence.usage_frequency;
    if (frequency > 10) {
      valueScore += 0.3;
    } else if (frequency > 5) {
      valueScore += 0.2;
    } else if (frequency > 2) {
      valueScore += 0.1;
    }

    // Normalize
    valueScore = Math.min(valueScore, 1.0);

    // Determine priority
    let priority: DeletionCandidate['business_value']['priority'];
    if (valueScore >= 0.7 && depCount > 5) {
      priority = 'critical';
    } else if (valueScore >= 0.5) {
      priority = 'high';
    } else if (valueScore >= 0.3) {
      priority = 'medium';
    } else {
      priority = 'low';
    }

    // Check if alternative exists (heuristic)
    const alternativeExists = candidate.deletion_info.deletion_type === 'refactor';

    return {
      priority,
      value_score: Math.round(valueScore * 100) / 100,
      use_cases: candidate.usage_evidence.had_dependencies.slice(0, 5),
      alternative_exists: alternativeExists,
    };
  }

  /**
   * Generate resurrection recommendation
   */
  private generateRecommendation(
    candidate: DeletionCandidate
  ): DeletionCandidate['recommendation'] {
    const feasibility = candidate.resurrection_assessment.feasibility;
    const value = candidate.business_value.value_score;
    const priority = candidate.business_value.priority;

    if (feasibility === 'blocked') {
      return 'do_not_resurrect';
    }

    if (value < this.config.min_value_score) {
      return 'do_not_resurrect';
    }

    if (candidate.business_value.alternative_exists) {
      return 'do_not_resurrect';
    }

    if (priority === 'critical' && feasibility === 'high') {
      return 'resurrect_immediately';
    }

    if ((priority === 'high' || priority === 'critical') && feasibility !== 'low') {
      return 'resurrect_soon';
    }

    if (value >= 0.5 && feasibility === 'high') {
      return 'resurrect_soon';
    }

    return 'defer';
  }

  /**
   * Rank candidates by priority
   */
  private rankCandidates(): void {
    const rankOrder: Record<DeletionCandidate['recommendation'], number> = {
      resurrect_immediately: 0,
      resurrect_soon: 1,
      defer: 2,
      do_not_resurrect: 3,
    };

    this.candidates.sort((a, b) => {
      // First by recommendation
      const recDiff = rankOrder[a.recommendation] - rankOrder[b.recommendation];
      if (recDiff !== 0) return recDiff;

      // Then by value score
      return b.business_value.value_score - a.business_value.value_score;
    });
  }

  /**
   * Save results to disk
   */
  private async saveResults(): Promise<void> {
    await fs.mkdir(this.config.output_dir, { recursive: true });

    const outputPath = path.join(this.config.output_dir, 'deletion_candidates.json');
    await fs.writeFile(
      outputPath,
      JSON.stringify(
        {
          detected_at: new Date().toISOString(),
          total_candidates: this.candidates.length,
          candidates: this.candidates,
          summary: this.getSummary(),
        },
        null,
        2
      )
    );

    console.log(`Deletion candidates saved to: ${outputPath}`);
  }

  /**
   * Get detection summary
   */
  getSummary(): DetectionSummary {
    return {
      total_candidates: this.candidates.length,
      resurrect_immediately: this.candidates.filter((c) => c.recommendation === 'resurrect_immediately').length,
      resurrect_soon: this.candidates.filter((c) => c.recommendation === 'resurrect_soon').length,
      defer: this.candidates.filter((c) => c.recommendation === 'defer').length,
      do_not_resurrect: this.candidates.filter((c) => c.recommendation === 'do_not_resurrect').length,
      by_deletion_type: this.countByDeletionType(),
      avg_value_score: this.calculateAvgValue(),
    };
  }

  private countByDeletionType(): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const candidate of this.candidates) {
      const type = candidate.deletion_info.deletion_type;
      counts[type] = (counts[type] || 0) + 1;
    }
    return counts;
  }

  private calculateAvgValue(): number {
    if (this.candidates.length === 0) return 0;
    const sum = this.candidates.reduce((s, c) => s + c.business_value.value_score, 0);
    return Math.round((sum / this.candidates.length) * 100) / 100;
  }
}

interface DetectionSummary {
  total_candidates: number;
  resurrect_immediately: number;
  resurrect_soon: number;
  defer: number;
  do_not_resurrect: number;
  by_deletion_type: Record<string, number>;
  avg_value_score: number;
}
