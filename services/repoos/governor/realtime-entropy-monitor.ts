/**
 * RepoOS Real-Time Entropy Monitor
 *
 * Detects chaos BEFORE it spreads through the repository.
 *
 * THE DELIGHTFUL SURPRISE:
 * - Your repository tells you when it's about to become chaotic
 * - Predictive alerts before problems cascade
 * - Automatic circuit breakers prevent entropy explosions
 * - Learn patterns of chaos from history
 *
 * ENTROPY SIGNALS WE MONITOR:
 * 1. PR Churn Velocity (PRs opening faster than closing)
 * 2. Conflict Density (% of PRs with merge conflicts)
 * 3. CI Failure Rate (sudden spikes indicate instability)
 * 4. Review Latency (PRs aging without attention)
 * 5. Branch Divergence (how far behind is main?)
 * 6. Concern Fragmentation (work scattered across too many areas)
 * 7. File Hotspots (same files changed in many PRs)
 * 8. Dependency Churn (package.json thrashing)
 *
 * This is PREDICTIVE CHAOS ENGINEERING applied to repositories.
 */

import { EventEmitter } from 'events';
import { RepoState, PullRequestState } from './decision-types.js';

// ============================================================================
// ENTROPY METRICS
// ============================================================================

interface EntropyMetrics {
  timestamp: string;

  // Overall entropy score (0-1, higher = more chaotic)
  overall: number;

  // Component scores
  components: {
    prChurnVelocity: number;
    conflictDensity: number;
    ciFailureRate: number;
    reviewLatency: number;
    branchDivergence: number;
    concernFragmentation: number;
    fileHotspots: number;
    dependencyChurn: number;
  };

  // Velocity (rate of change)
  velocity: number;

  // Acceleration (rate of velocity change)
  acceleration: number;

  // Alert level
  alertLevel: 'healthy' | 'caution' | 'warning' | 'critical';

  // Predicted entropy in 1 hour
  prediction: number;
}

// ============================================================================
// ENTROPY THRESHOLDS
// ============================================================================

interface EntropyThresholds {
  healthy: number;
  caution: number;
  warning: number;
  critical: number;
  velocityCritical: number;
  accelerationCritical: number;
}

const DEFAULT_THRESHOLDS: EntropyThresholds = {
  healthy: 0.001,
  caution: 0.005,
  warning: 0.008,
  critical: 0.01,
  velocityCritical: 0.002,  // Entropy increasing by > 0.002/min
  accelerationCritical: 0.001,  // Velocity increasing by > 0.001/min²
};

// ============================================================================
// CIRCUIT BREAKER
// ============================================================================

interface CircuitBreakerState {
  active: boolean;
  triggeredAt?: string;
  reason?: string;
  mitigationActions: string[];
}

// ============================================================================
// REAL-TIME ENTROPY MONITOR
// ============================================================================

export class RealtimeEntropyMonitor extends EventEmitter {
  private thresholds: EntropyThresholds;
  private metricsHistory: EntropyMetrics[] = [];
  private monitoringActive = false;
  private monitoringTimer?: NodeJS.Timeout;
  private circuitBreaker: CircuitBreakerState = { active: false, mitigationActions: [] };

  constructor(thresholds?: Partial<EntropyThresholds>) {
    super();
    this.thresholds = { ...DEFAULT_THRESHOLDS, ...thresholds };
  }

  /**
   * Start real-time monitoring
   */
  public start(intervalMs: number = 60000): void {
    if (this.monitoringActive) return;

    this.monitoringActive = true;
    this.emit('monitoring-started');

    console.log(`\n🔍 Starting real-time entropy monitoring (${intervalMs/1000}s interval)...`);

    this.monitoringTimer = setInterval(
      () => this.checkEntropy(),
      intervalMs
    );

    // Immediate check
    this.checkEntropy();
  }

  /**
   * Stop monitoring
   */
  public stop(): void {
    if (this.monitoringTimer) {
      clearInterval(this.monitoringTimer);
      this.monitoringTimer = undefined;
    }
    this.monitoringActive = false;
    this.emit('monitoring-stopped');
  }

  /**
   * Check current entropy and emit alerts
   */
  private async checkEntropy(): Promise<void> {
    // Fetch current repo state (mock - would integrate with real API)
    const repoState = await this.fetchRepoState();

    // Calculate entropy metrics
    const metrics = this.calculateEntropyMetrics(repoState);

    // Store in history
    this.metricsHistory.push(metrics);
    if (this.metricsHistory.length > 1000) {
      this.metricsHistory.shift();
    }

    // Calculate velocity and acceleration
    const enriched = this.enrichWithDerivatives(metrics);

    // Emit metrics
    this.emit('metrics-updated', enriched);

    // Check circuit breaker
    await this.checkCircuitBreaker(enriched);

    // Emit alerts
    await this.emitAlerts(enriched);

    // Log status
    if (enriched.alertLevel !== 'healthy') {
      console.log(
        `⚠️  Entropy: ${enriched.overall.toFixed(4)} | ` +
        `Level: ${enriched.alertLevel.toUpperCase()} | ` +
        `Velocity: ${enriched.velocity.toFixed(6)}/min | ` +
        `Prediction: ${enriched.prediction.toFixed(4)} (1hr)`
      );
    }
  }

  /**
   * Calculate entropy metrics from repo state
   */
  private calculateEntropyMetrics(repoState: RepoState): EntropyMetrics {
    const prs = repoState.prs;

    // Component 1: PR Churn Velocity
    const prChurnVelocity = this.calculatePRChurnVelocity(prs);

    // Component 2: Conflict Density
    const conflictDensity = this.calculateConflictDensity(prs);

    // Component 3: CI Failure Rate
    const ciFailureRate = this.calculateCIFailureRate(prs);

    // Component 4: Review Latency
    const reviewLatency = this.calculateReviewLatency(prs);

    // Component 5: Branch Divergence
    const branchDivergence = this.calculateBranchDivergence(prs);

    // Component 6: Concern Fragmentation
    const concernFragmentation = this.calculateConcernFragmentation(prs);

    // Component 7: File Hotspots
    const fileHotspots = this.calculateFileHotspots(prs);

    // Component 8: Dependency Churn
    const dependencyChurn = this.calculateDependencyChurn(prs);

    // Overall entropy (weighted average)
    const overall =
      prChurnVelocity * 0.20 +
      conflictDensity * 0.15 +
      ciFailureRate * 0.15 +
      reviewLatency * 0.10 +
      branchDivergence * 0.10 +
      concernFragmentation * 0.10 +
      fileHotspots * 0.15 +
      dependencyChurn * 0.05;

    // Alert level
    let alertLevel: 'healthy' | 'caution' | 'warning' | 'critical' = 'healthy';
    if (overall >= this.thresholds.critical) alertLevel = 'critical';
    else if (overall >= this.thresholds.warning) alertLevel = 'warning';
    else if (overall >= this.thresholds.caution) alertLevel = 'caution';

    return {
      timestamp: new Date().toISOString(),
      overall,
      components: {
        prChurnVelocity,
        conflictDensity,
        ciFailureRate,
        reviewLatency,
        branchDivergence,
        concernFragmentation,
        fileHotspots,
        dependencyChurn,
      },
      velocity: 0, // Will be calculated
      acceleration: 0, // Will be calculated
      alertLevel,
      prediction: overall, // Will be calculated
    };
  }

  /**
   * Enrich metrics with velocity and acceleration
   */
  private enrichWithDerivatives(metrics: EntropyMetrics): EntropyMetrics {
    if (this.metricsHistory.length < 2) {
      return metrics;
    }

    const recent = this.metricsHistory.slice(-10);

    // Calculate velocity (change per minute)
    const timeDiff =
      (new Date(metrics.timestamp).getTime() -
        new Date(recent[0].timestamp).getTime()) /
      60000; // minutes

    const entropyChange = metrics.overall - recent[0].overall;
    const velocity = entropyChange / Math.max(timeDiff, 1);

    // Calculate acceleration (change in velocity per minute)
    let acceleration = 0;
    if (recent.length >= 3) {
      const oldVelocity =
        (recent[recent.length - 2].overall - recent[0].overall) /
        Math.max(
          (new Date(recent[recent.length - 2].timestamp).getTime() -
            new Date(recent[0].timestamp).getTime()) /
            60000,
          1
        );

      acceleration = (velocity - oldVelocity) / Math.max(timeDiff, 1);
    }

    // Predict entropy in 1 hour (linear extrapolation)
    const prediction = Math.max(0, Math.min(1, metrics.overall + velocity * 60));

    return {
      ...metrics,
      velocity,
      acceleration,
      prediction,
    };
  }

  /**
   * Check circuit breaker conditions
   */
  private async checkCircuitBreaker(metrics: EntropyMetrics): Promise<void> {
    const shouldBreak =
      metrics.alertLevel === 'critical' ||
      Math.abs(metrics.velocity) > this.thresholds.velocityCritical ||
      Math.abs(metrics.acceleration) > this.thresholds.accelerationCritical;

    if (shouldBreak && !this.circuitBreaker.active) {
      // Trip circuit breaker
      this.circuitBreaker = {
        active: true,
        triggeredAt: new Date().toISOString(),
        reason: this.getCircuitBreakerReason(metrics),
        mitigationActions: this.generateMitigationActions(metrics),
      };

      this.emit('circuit-breaker-tripped', this.circuitBreaker);

      console.log(`\n🚨 CIRCUIT BREAKER TRIPPED!`);
      console.log(`   Reason: ${this.circuitBreaker.reason}`);
      console.log(`   Mitigation actions:`);
      this.circuitBreaker.mitigationActions.forEach(action =>
        console.log(`     - ${action}`)
      );
    } else if (!shouldBreak && this.circuitBreaker.active) {
      // Reset circuit breaker
      this.circuitBreaker = { active: false, mitigationActions: [] };
      this.emit('circuit-breaker-reset');
      console.log(`\n✅ Circuit breaker reset - entropy stabilized`);
    }
  }

  /**
   * Determine circuit breaker reason
   */
  private getCircuitBreakerReason(metrics: EntropyMetrics): string {
    if (metrics.alertLevel === 'critical') {
      return `Critical entropy level: ${metrics.overall.toFixed(4)} >= ${this.thresholds.critical}`;
    }
    if (Math.abs(metrics.velocity) > this.thresholds.velocityCritical) {
      return `Critical entropy velocity: ${metrics.velocity.toFixed(6)}/min >= ${this.thresholds.velocityCritical}/min`;
    }
    if (Math.abs(metrics.acceleration) > this.thresholds.accelerationCritical) {
      return `Critical entropy acceleration: ${metrics.acceleration.toFixed(6)}/min² >= ${this.thresholds.accelerationCritical}/min²`;
    }
    return 'Unknown trigger condition';
  }

  /**
   * Generate mitigation actions
   */
  private generateMitigationActions(metrics: EntropyMetrics): string[] {
    const actions: string[] = [];

    if (metrics.components.prChurnVelocity > 0.15) {
      actions.push('FREEZE new PR creation for 1 hour');
    }
    if (metrics.components.conflictDensity > 0.3) {
      actions.push('REQUIRE rebase before merge approval');
    }
    if (metrics.components.ciFailureRate > 0.25) {
      actions.push('HALT merges until CI stability restored');
    }
    if (metrics.components.reviewLatency > 0.5) {
      actions.push('ESCALATE stale PRs to team leads');
    }
    if (metrics.components.fileHotspots > 0.4) {
      actions.push('COORDINATE hotspot file changes');
    }

    if (actions.length === 0) {
      actions.push('MONITOR closely - no automatic actions yet');
    }

    return actions;
  }

  /**
   * Emit alerts based on metrics
   */
  private async emitAlerts(metrics: EntropyMetrics): Promise<void> {
    if (metrics.alertLevel === 'critical') {
      this.emit('critical-alert', {
        message: 'CRITICAL: Repository entropy critical',
        metrics,
      });
    } else if (metrics.alertLevel === 'warning') {
      this.emit('warning-alert', {
        message: 'WARNING: Repository entropy elevated',
        metrics,
      });
    } else if (metrics.alertLevel === 'caution') {
      this.emit('caution-alert', {
        message: 'CAUTION: Repository entropy increasing',
        metrics,
      });
    }

    // Predictive alerts
    if (metrics.prediction > this.thresholds.critical && metrics.alertLevel !== 'critical') {
      this.emit('predictive-alert', {
        message: `PREDICTION: Entropy will reach critical in ~1 hour (${metrics.prediction.toFixed(4)})`,
        metrics,
      });
    }
  }

  // ==========================================================================
  // ENTROPY COMPONENT CALCULATIONS
  // ==========================================================================

  private calculatePRChurnVelocity(prs: PullRequestState[]): number {
    // High velocity if many fresh PRs (< 24 hours old)
    const recentPRs = prs.filter(pr => {
      if (!pr.createdAt) return false;
      const age = Date.now() - new Date(pr.createdAt).getTime();
      return age < 24 * 60 * 60 * 1000; // 24 hours
    });

    return Math.min(recentPRs.length / 20, 1.0);
  }

  private calculateConflictDensity(prs: PullRequestState[]): number {
    if (prs.length === 0) return 0;
    const conflicted = prs.filter(pr => pr.mergeable === false).length;
    return conflicted / prs.length;
  }

  private calculateCIFailureRate(prs: PullRequestState[]): number {
    if (prs.length === 0) return 0;
    const failed = prs.filter(pr => pr.ciStatus === 'red').length;
    return failed / prs.length;
  }

  private calculateReviewLatency(prs: PullRequestState[]): number {
    if (prs.length === 0) return 0;

    const stalePRs = prs.filter(pr => {
      if (!pr.updatedAt) return false;
      const daysSinceUpdate = (Date.now() - new Date(pr.updatedAt).getTime()) / (24 * 60 * 60 * 1000);
      return daysSinceUpdate > 7 && pr.reviewStatus === 'pending';
    });

    return stalePRs.length / prs.length;
  }

  private calculateBranchDivergence(prs: PullRequestState[]): number {
    // Heuristic: PRs with many commits or large diffs likely diverged
    const diverged = prs.filter(pr => (pr.sizeLines || 0) > 500).length;
    return Math.min(diverged / Math.max(prs.length, 1), 1.0);
  }

  private calculateConcernFragmentation(prs: PullRequestState[]): number {
    // High fragmentation if work spread across many concerns
    const concerns = new Set(prs.map(pr => pr.concern).filter(Boolean));
    const expectedConcerns = Math.max(Math.sqrt(prs.length), 3);
    return Math.min(concerns.size / expectedConcerns, 1.0);
  }

  private calculateFileHotspots(prs: PullRequestState[]): number {
    // Count how many PRs touch each file
    const fileCounts = new Map<string, number>();

    for (const pr of prs) {
      for (const file of pr.changedFiles) {
        fileCounts.set(file, (fileCounts.get(file) || 0) + 1);
      }
    }

    // High entropy if many files touched by multiple PRs
    const hotspots = Array.from(fileCounts.values()).filter(count => count > 3);
    const totalFiles = fileCounts.size;

    return totalFiles > 0 ? Math.min(hotspots.length / totalFiles, 1.0) : 0;
  }

  private calculateDependencyChurn(prs: PullRequestState[]): number {
    // Count PRs modifying dependency files
    const dependencyFiles = [
      'package.json',
      'package-lock.json',
      'pnpm-lock.yaml',
      'yarn.lock',
      'Cargo.toml',
      'Cargo.lock',
      'go.mod',
      'go.sum',
      'requirements.txt',
      'Gemfile',
      'Gemfile.lock',
    ];

    const depPRs = prs.filter(pr =>
      pr.changedFiles.some(file =>
        dependencyFiles.some(dep => file.endsWith(dep))
      )
    );

    return Math.min(depPRs.length / 5, 1.0);
  }

  /**
   * Mock repo state fetch (would integrate with real API)
   */
  private async fetchRepoState(): Promise<RepoState> {
    // Mock implementation - in production would fetch real data
    return {
      prs: [],
      incidentMode: false,
      releaseFreeze: false,
      protectedPaths: [],
      requiredChecks: [],
      generatedAt: new Date().toISOString(),
    };
  }

  // ==========================================================================
  // PUBLIC GETTERS
  // ==========================================================================

  public getCurrentMetrics(): EntropyMetrics | null {
    return this.metricsHistory[this.metricsHistory.length - 1] || null;
  }

  public getMetricsHistory(limit: number = 100): EntropyMetrics[] {
    return this.metricsHistory.slice(-limit);
  }

  public getCircuitBreakerState(): CircuitBreakerState {
    return this.circuitBreaker;
  }

  public isHealthy(): boolean {
    const current = this.getCurrentMetrics();
    return !current || current.alertLevel === 'healthy';
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const entropyMonitor = new RealtimeEntropyMonitor();

// ============================================================================
// CONVENIENCE METHODS
// ============================================================================

/**
 * Start monitoring with default settings
 */
export function startEntropyMonitoring(): void {
  entropyMonitor.start(60000); // 1 minute intervals
}

/**
 * Get current entropy health status
 */
export function getEntropyHealth(): {
  isHealthy: boolean;
  level: string;
  score: number;
  prediction: number;
  circuitBreakerActive: boolean;
} {
  const metrics = entropyMonitor.getCurrentMetrics();
  const circuitBreaker = entropyMonitor.getCircuitBreakerState();

  if (!metrics) {
    return {
      isHealthy: true,
      level: 'healthy',
      score: 0,
      prediction: 0,
      circuitBreakerActive: false,
    };
  }

  return {
    isHealthy: metrics.alertLevel === 'healthy',
    level: metrics.alertLevel,
    score: metrics.overall,
    prediction: metrics.prediction,
    circuitBreakerActive: circuitBreaker.active,
  };
}
