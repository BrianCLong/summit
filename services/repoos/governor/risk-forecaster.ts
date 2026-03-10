/**
 * RepoOS Risk Forecaster
 *
 * Predictive risk assessment for repository operations using
 * heuristic modeling, historical pattern analysis, and feature engineering.
 *
 * Goes beyond simple rule-based gates by predicting:
 * - Merge conflict probability
 * - CI failure likelihood
 * - Rollback necessity
 * - Blast radius
 * - Subsystem instability
 *
 * This is a competitive differentiator - most companies only have
 * reactive CI gates. We proactively forecast risk BEFORE execution.
 */

import {
  RiskForecast,
  PullRequestState,
  RepoState,
  CandidateAction,
} from './decision-types.js';

// ============================================================================
// CONFIGURATION
// ============================================================================

interface RiskThresholds {
  mergeConflict: {
    fileOverlapCritical: number;
    staleDaysCritical: number;
    sizeLinesCritical: number;
  };
  ciFailure: {
    historicalFailureRate: number;
    complexityThreshold: number;
    protectedPathMultiplier: number;
  };
  rollback: {
    blastRadiusThreshold: number;
    riskCombination: number;
  };
  confidence: {
    minDataPoints: number;
    decayFactor: number;
  };
}

const DEFAULT_THRESHOLDS: RiskThresholds = {
  mergeConflict: {
    fileOverlapCritical: 0.3,
    staleDaysCritical: 30,
    sizeLinesCritical: 500,
  },
  ciFailure: {
    historicalFailureRate: 0.15,
    complexityThreshold: 100,
    protectedPathMultiplier: 2.0,
  },
  rollback: {
    blastRadiusThreshold: 0.7,
    riskCombination: 0.6,
  },
  confidence: {
    minDataPoints: 10,
    decayFactor: 0.95,
  },
};

// ============================================================================
// FEATURE EXTRACTION
// ============================================================================

interface PRFeatures {
  fileCount: number;
  linesChanged: number;
  ageInDays: number;
  staleness: number;
  touchesProtectedPaths: boolean;
  protectedPathCount: number;
  ciStatus: string;
  reviewStatus: string;
  actorType: string;
  concernDomain: string;
  isLargePR: boolean;
  isStale: boolean;
  hasConflicts: boolean;
  subsystemBreadth: number;
  avgFileComplexity: number;
}

function extractFeatures(pr: PullRequestState, repoState: RepoState): PRFeatures {
  const now = Date.now();
  const createdAt = pr.createdAt ? new Date(pr.createdAt).getTime() : now;
  const updatedAt = pr.updatedAt ? new Date(pr.updatedAt).getTime() : now;

  const ageInDays = (now - createdAt) / (1000 * 60 * 60 * 24);
  const daysSinceUpdate = (now - updatedAt) / (1000 * 60 * 60 * 24);

  const touchesProtectedPaths = pr.changedFiles.some(file =>
    repoState.protectedPaths.some(pattern => matchPattern(file, pattern))
  );

  const protectedPathCount = pr.changedFiles.filter(file =>
    repoState.protectedPaths.some(pattern => matchPattern(file, pattern))
  ).length;

  // Subsystem breadth: how many different top-level directories touched
  const subsystems = new Set(
    pr.changedFiles.map(f => f.split('/')[0]).filter(Boolean)
  );

  return {
    fileCount: pr.changedFiles.length,
    linesChanged: pr.sizeLines || 0,
    ageInDays,
    staleness: daysSinceUpdate,
    touchesProtectedPaths,
    protectedPathCount,
    ciStatus: pr.ciStatus || 'unknown',
    reviewStatus: pr.reviewStatus || 'unknown',
    actorType: pr.actorType,
    concernDomain: pr.concern || 'general',
    isLargePR: (pr.changedFiles.length > 20) || ((pr.sizeLines || 0) > 500),
    isStale: daysSinceUpdate > 7,
    hasConflicts: pr.mergeable === false,
    subsystemBreadth: subsystems.size,
    avgFileComplexity: (pr.sizeLines || 0) / Math.max(pr.changedFiles.length, 1),
  };
}

function matchPattern(path: string, pattern: string): boolean {
  const regexPattern = pattern
    .replace(/\./g, '\\.')
    .replace(/\*/g, '.*')
    .replace(/\?/g, '.');
  return new RegExp(`^${regexPattern}`).test(path);
}

// ============================================================================
// RISK FORECASTER
// ============================================================================

export class RiskForecaster {
  private thresholds: RiskThresholds;
  private historicalData: Map<string, number[]> = new Map();

  constructor(thresholds?: Partial<RiskThresholds>) {
    this.thresholds = {
      ...DEFAULT_THRESHOLDS,
      ...thresholds,
    };
  }

  /**
   * Generate risk forecast for a single PR
   */
  public async forecastPR(
    pr: PullRequestState,
    repoState: RepoState
  ): Promise<RiskForecast> {
    const features = extractFeatures(pr, repoState);

    // Calculate individual risk components
    const mergeConflictProb = this.estimateMergeConflictProbability(features, repoState);
    const ciFailureProb = this.estimateCIFailureProbability(features, repoState);
    const rollbackProb = this.estimateRollbackProbability(features, mergeConflictProb, ciFailureProb);
    const blastRadius = this.estimateBlastRadius(features, repoState);
    const subsystemInstability = this.estimateSubsystemInstability(features, repoState);

    // Calculate confidence based on available data
    const confidence = this.calculateConfidence(features);

    // Determine recommended action
    const recommendedAction = this.determineRecommendedAction(
      mergeConflictProb,
      ciFailureProb,
      rollbackProb,
      blastRadius,
      subsystemInstability,
      features
    );

    // Generate human-readable reasons
    const reasons = this.generateReasons(
      features,
      mergeConflictProb,
      ciFailureProb,
      rollbackProb,
      blastRadius,
      subsystemInstability
    );

    return {
      id: `forecast-${pr.id}-${Date.now()}`,
      targetId: pr.id,
      mergeConflictProbability: mergeConflictProb,
      ciFailureProbability: ciFailureProb,
      rollbackProbability: rollbackProb,
      blastRadiusScore: blastRadius,
      subsystemInstabilityScore: subsystemInstability,
      confidence,
      recommendedAction,
      reasons,
      generatedAt: new Date().toISOString(),
      evidence: {
        features: {
          fileCount: features.fileCount,
          linesChanged: features.linesChanged,
          ageInDays: Math.round(features.ageInDays),
          touchesProtectedPaths: features.touchesProtectedPaths,
          subsystemBreadth: features.subsystemBreadth,
        },
        aggregateRisk: this.calculateAggregateRisk(
          mergeConflictProb,
          ciFailureProb,
          rollbackProb,
          blastRadius,
          subsystemInstability
        ),
      },
    };
  }

  /**
   * Generate risk forecast for a batch of PRs
   */
  public async forecastBatch(
    prIds: string[],
    repoState: RepoState
  ): Promise<RiskForecast> {
    const prs = prIds
      .map(id => repoState.prs.find(pr => pr.id === id || pr.number.toString() === id))
      .filter((pr): pr is PullRequestState => pr !== undefined);

    if (prs.length === 0) {
      throw new Error('No valid PRs found for batch forecast');
    }

    // Generate forecasts for individual PRs
    const individualForecasts = await Promise.all(
      prs.map(pr => this.forecastPR(pr, repoState))
    );

    // Aggregate risks (batching increases certain risks)
    const mergeConflictProb = Math.min(
      individualForecasts.reduce((sum, f) => sum + f.mergeConflictProbability, 0) / prs.length * 1.5, // 1.5x multiplier for batch
      1.0
    );

    const ciFailureProb = Math.min(
      Math.max(...individualForecasts.map(f => f.ciFailureProbability)) * 1.2, // 1.2x multiplier
      1.0
    );

    const rollbackProb = Math.min(
      individualForecasts.reduce((sum, f) => sum + f.rollbackProbability, 0) / prs.length * 1.3,
      1.0
    );

    const blastRadius = Math.min(
      individualForecasts.reduce((sum, f) => sum + f.blastRadiusScore, 0) / prs.length * 1.4,
      1.0
    );

    const subsystemInstability = Math.min(
      Math.max(...individualForecasts.map(f => f.subsystemInstabilityScore)) * 1.2,
      1.0
    );

    const confidence = individualForecasts.reduce((sum, f) => sum + f.confidence, 0) / prs.length;

    const recommendedAction = this.determineRecommendedAction(
      mergeConflictProb,
      ciFailureProb,
      rollbackProb,
      blastRadius,
      subsystemInstability,
      {
        fileCount: prs.reduce((sum, pr) => sum + pr.changedFiles.length, 0),
        linesChanged: prs.reduce((sum, pr) => sum + (pr.sizeLines || 0), 0),
      } as PRFeatures
    );

    return {
      id: `batch-forecast-${Date.now()}`,
      targetId: `batch-${prIds.join('-')}`,
      mergeConflictProbability: mergeConflictProb,
      ciFailureProbability: ciFailureProb,
      rollbackProbability: rollbackProb,
      blastRadiusScore: blastRadius,
      subsystemInstabilityScore: subsystemInstability,
      confidence,
      recommendedAction,
      reasons: [
        `Batch of ${prs.length} PRs`,
        `Aggregate risk increased due to batch complexity`,
        ...this.generateBatchReasons(individualForecasts, prs.length),
      ],
      generatedAt: new Date().toISOString(),
      evidence: {
        batchSize: prs.length,
        prNumbers: prs.map(pr => pr.number),
        individualRisks: individualForecasts.map(f => ({
          target: f.targetId,
          aggregateRisk: (
            f.mergeConflictProbability +
            f.ciFailureProbability +
            f.rollbackProbability +
            f.blastRadiusScore +
            f.subsystemInstabilityScore
          ) / 5,
        })),
      },
    };
  }

  // ==========================================================================
  // RISK ESTIMATION METHODS
  // ==========================================================================

  /**
   * Estimate probability of merge conflicts
   */
  private estimateMergeConflictProbability(features: PRFeatures, repoState: RepoState): number {
    let prob = 0.05; // Base probability

    // File overlap with other open PRs
    const fileOverlap = this.calculateFileOverlap(features, repoState);
    if (fileOverlap > 0) {
      prob += fileOverlap * 0.4;
    }

    // Staleness factor (old PRs likely out of sync)
    if (features.isStale) {
      prob += Math.min(features.staleness / 30, 1.0) * 0.3;
    }

    // Large PRs have higher conflict risk
    if (features.isLargePR) {
      prob += 0.15;
    }

    // Already has conflicts
    if (features.hasConflicts) {
      prob = 0.95;
    }

    return Math.min(prob, 1.0);
  }

  /**
   * Estimate probability of CI failure
   */
  private estimateCIFailureProbability(features: PRFeatures, repoState: RepoState): number {
    let prob = 0.1; // Base probability

    // Current CI status
    if (features.ciStatus === 'red') {
      return 0.95;
    } else if (features.ciStatus === 'green') {
      prob = 0.05;
    } else if (features.ciStatus === 'pending') {
      prob = 0.25;
    }

    // Complexity factor
    const complexity = features.fileCount + (features.linesChanged / 100);
    if (complexity > this.thresholds.ciFailure.complexityThreshold) {
      prob += Math.min((complexity / 200), 0.3);
    }

    // Protected paths (often have stricter checks)
    if (features.touchesProtectedPaths) {
      prob *= this.thresholds.ciFailure.protectedPathMultiplier;
    }

    // Agent-authored PRs might have less human testing
    if (features.actorType === 'agent') {
      prob += 0.1;
    }

    return Math.min(prob, 1.0);
  }

  /**
   * Estimate probability of rollback needed
   */
  private estimateRollbackProbability(
    features: PRFeatures,
    mergeConflictProb: number,
    ciFailureProb: number
  ): number {
    let prob = 0.02; // Base probability

    // High merge conflict or CI failure risk increases rollback risk
    if (mergeConflictProb > 0.5 || ciFailureProb > 0.5) {
      prob += 0.15;
    }

    // Large PRs harder to roll back cleanly
    if (features.isLargePR) {
      prob += 0.1;
    }

    // Protected paths changes more likely to need rollback
    if (features.touchesProtectedPaths) {
      prob += 0.15;
    }

    // Multiple subsystems increase rollback probability
    if (features.subsystemBreadth > 3) {
      prob += 0.1;
    }

    return Math.min(prob, 1.0);
  }

  /**
   * Estimate blast radius (impact scope)
   */
  private estimateBlastRadius(features: PRFeatures, repoState: RepoState): number {
    let radius = 0.1; // Base radius

    // More files = larger blast radius
    radius += Math.min(features.fileCount / 50, 0.4);

    // More subsystems = larger radius
    radius += features.subsystemBreadth * 0.1;

    // Protected paths have system-wide impact
    if (features.touchesProtectedPaths) {
      radius += features.protectedPathCount * 0.15;
    }

    // Large line changes
    radius += Math.min(features.linesChanged / 1000, 0.3);

    return Math.min(radius, 1.0);
  }

  /**
   * Estimate subsystem instability
   */
  private estimateSubsystemInstability(features: PRFeatures, repoState: RepoState): number {
    let instability = 0.1; // Base instability

    // High churn subsystems
    if (features.concernDomain === 'ci' || features.concernDomain === 'infra') {
      instability += 0.2;
    }

    // Multiple subsystems touched
    if (features.subsystemBreadth > 2) {
      instability += features.subsystemBreadth * 0.15;
    }

    // Repository entropy
    if (repoState.entropyScore && repoState.entropyScore > 0.005) {
      instability += Math.min(repoState.entropyScore * 10, 0.3);
    }

    return Math.min(instability, 1.0);
  }

  // ==========================================================================
  // HELPER METHODS
  // ==========================================================================

  /**
   * Calculate file overlap with other open PRs
   */
  private calculateFileOverlap(features: PRFeatures, repoState: RepoState): number {
    // Simplified - in production would use actual file overlap analysis
    const otherPRFileCount = repoState.prs.reduce((sum, pr) => sum + pr.changedFiles.length, 0);
    return Math.min(features.fileCount / Math.max(otherPRFileCount, 1), 1.0);
  }

  /**
   * Calculate confidence in forecast
   */
  private calculateConfidence(features: PRFeatures): number {
    let confidence = 0.5; // Base confidence

    // More features = higher confidence
    if (features.ciStatus !== 'unknown') confidence += 0.15;
    if (features.reviewStatus !== 'unknown') confidence += 0.15;
    if (features.ageInDays < 7) confidence += 0.1;
    if (features.fileCount > 0) confidence += 0.1;

    return Math.min(confidence, 0.95); // Cap at 95%
  }

  /**
   * Calculate aggregate risk score
   */
  private calculateAggregateRisk(
    mergeConflict: number,
    ciFailure: number,
    rollback: number,
    blastRadius: number,
    subsystemInstability: number
  ): number {
    return (mergeConflict + ciFailure + rollback + blastRadius + subsystemInstability) / 5;
  }

  /**
   * Determine recommended action based on risk profile
   */
  private determineRecommendedAction(
    mergeConflict: number,
    ciFailure: number,
    rollback: number,
    blastRadius: number,
    subsystemInstability: number,
    features: PRFeatures
  ): 'merge_now' | 'batch_later' | 'split_pr' | 'require_review' | 'defer' {
    const aggregateRisk = this.calculateAggregateRisk(
      mergeConflict,
      ciFailure,
      rollback,
      blastRadius,
      subsystemInstability
    );

    // Very low risk - merge immediately
    if (aggregateRisk < 0.2 && ciFailure < 0.1 && mergeConflict < 0.1) {
      return 'merge_now';
    }

    // Large PR - recommend split
    if (features.isLargePR && aggregateRisk > 0.4) {
      return 'split_pr';
    }

    // High risk - require human review
    if (aggregateRisk > 0.6 || blastRadius > 0.7) {
      return 'require_review';
    }

    // Medium risk - defer to batch
    if (aggregateRisk > 0.3) {
      return 'batch_later';
    }

    // Default - defer for safety
    return 'defer';
  }

  /**
   * Generate human-readable reasons
   */
  private generateReasons(
    features: PRFeatures,
    mergeConflict: number,
    ciFailure: number,
    rollback: number,
    blastRadius: number,
    subsystemInstability: number
  ): string[] {
    const reasons: string[] = [];

    if (mergeConflict > 0.5) {
      reasons.push(`High merge conflict risk (${(mergeConflict * 100).toFixed(0)}%)`);
    }
    if (ciFailure > 0.5) {
      reasons.push(`High CI failure risk (${(ciFailure * 100).toFixed(0)}%)`);
    }
    if (rollback > 0.3) {
      reasons.push(`Elevated rollback probability (${(rollback * 100).toFixed(0)}%)`);
    }
    if (blastRadius > 0.5) {
      reasons.push(`Large blast radius (${(blastRadius * 100).toFixed(0)}%)`);
    }
    if (subsystemInstability > 0.5) {
      reasons.push(`Subsystem instability detected (${(subsystemInstability * 100).toFixed(0)}%)`);
    }

    if (features.isLargePR) {
      reasons.push(`Large PR: ${features.fileCount} files, ${features.linesChanged} lines`);
    }
    if (features.touchesProtectedPaths) {
      reasons.push(`Touches ${features.protectedPathCount} protected path(s)`);
    }
    if (features.subsystemBreadth > 2) {
      reasons.push(`Spans ${features.subsystemBreadth} subsystems`);
    }

    if (reasons.length === 0) {
      reasons.push('Low risk profile - suitable for merge');
    }

    return reasons;
  }

  /**
   * Generate batch-specific reasons
   */
  private generateBatchReasons(forecasts: RiskForecast[], batchSize: number): string[] {
    const reasons: string[] = [];

    const highRiskCount = forecasts.filter(f =>
      (f.mergeConflictProbability + f.ciFailureProbability + f.rollbackProbability) / 3 > 0.5
    ).length;

    if (highRiskCount > 0) {
      reasons.push(`${highRiskCount} high-risk PR(s) in batch`);
    }

    const avgConfidence = forecasts.reduce((sum, f) => sum + f.confidence, 0) / batchSize;
    if (avgConfidence < 0.7) {
      reasons.push(`Lower confidence due to limited data`);
    }

    return reasons;
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const riskForecaster = new RiskForecaster();
