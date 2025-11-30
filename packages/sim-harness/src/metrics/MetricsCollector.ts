/**
 * Metrics Collector - Aggregates and analyzes session metrics
 */

import type {
  AnalystSession,
  AggregateMetrics,
  ComparisonMetrics,
  EvaluationReport,
  GeneratedScenario,
  LatencyMetrics,
} from '../types/index.js';
import { v4 as uuidv4 } from 'uuid';

export class MetricsCollector {
  private sessions: AnalystSession[] = [];
  private scenario?: GeneratedScenario;

  /**
   * Add session to collector
   */
  addSession(session: AnalystSession): void {
    this.sessions.push(session);
  }

  /**
   * Set scenario for context
   */
  setScenario(scenario: GeneratedScenario): void {
    this.scenario = scenario;
  }

  /**
   * Generate evaluation report
   */
  async generateReport(options: {
    format?: 'json' | 'csv' | 'html';
    output?: string;
    baseline?: AggregateMetrics;
    baselineVersion?: string;
    candidateVersion?: string;
  } = {}): Promise<EvaluationReport> {
    const aggregateMetrics = this.computeAggregateMetrics();

    const report: EvaluationReport = {
      id: `report-${uuidv4()}`,
      timestamp: new Date().toISOString(),
      scenarioId: this.scenario?.id || 'unknown',
      scenarioName: this.scenario?.name || 'unknown',
      sessions: this.sessions,
      aggregateMetrics,
    };

    // Add comparison if baseline provided
    if (options.baseline && options.baselineVersion && options.candidateVersion) {
      report.comparison = this.computeComparison(
        options.baseline,
        aggregateMetrics,
        options.baselineVersion,
        options.candidateVersion,
      );
    }

    return report;
  }

  /**
   * Compute aggregate metrics across all sessions
   */
  private computeAggregateMetrics(): AggregateMetrics {
    if (this.sessions.length === 0) {
      throw new Error('No sessions to aggregate');
    }

    const completedSessions = this.sessions.filter(
      (s) => s.status === 'completed',
    );
    const failedSessions = this.sessions.filter((s) => s.status === 'failed');
    const timeoutSessions = this.sessions.filter((s) => s.status === 'timeout');

    // Performance metrics
    const durations = this.sessions.map((s) => s.metrics.totalDuration);
    const avgDuration = this.mean(durations);

    const allLatencySamples = this.sessions.flatMap(
      (s) => s.metrics.queryLatency.samples,
    );
    const avgQueryLatency = this.computeLatencyMetrics(allLatencySamples);

    const insightTimes = this.sessions
      .map((s) => s.metrics.timeToFirstInsight)
      .filter((t) => t !== undefined) as number[];
    const avgTimeToInsight = insightTimes.length > 0 ? this.mean(insightTimes) : 0;

    // Correctness metrics
    const totalEntitiesFound = this.sum(
      this.sessions.map((s) => s.metrics.entitiesFound),
    );
    const totalRelationshipsFound = this.sum(
      this.sessions.map((s) => s.metrics.relationshipsFound),
    );

    const expectedEntities = this.scenario?.expectedOutcomes.minEntitiesFound || 1;
    const expectedRelationships =
      this.scenario?.expectedOutcomes.minRelationshipsFound || 1;

    const entitiesFoundRate =
      totalEntitiesFound / (expectedEntities * this.sessions.length);
    const relationshipsFoundRate =
      totalRelationshipsFound / (expectedRelationships * this.sessions.length);

    // Calculate false positives/negatives (simplified)
    const falsePositiveRate = 0; // Would need ground truth data
    const falseNegativeRate = Math.max(0, 1 - entitiesFoundRate);

    // Reliability metrics
    const successRate = completedSessions.length / this.sessions.length;
    const errorRate = failedSessions.length / this.sessions.length;
    const timeoutRate = timeoutSessions.length / this.sessions.length;

    return {
      performance: {
        avgDuration,
        avgQueryLatency,
        avgTimeToInsight,
      },
      correctness: {
        entitiesFoundRate,
        relationshipsFoundRate,
        falsePositiveRate,
        falseNegativeRate,
      },
      reliability: {
        successRate,
        errorRate,
        timeoutRate,
      },
    };
  }

  /**
   * Compute comparison between baseline and candidate
   */
  private computeComparison(
    baseline: AggregateMetrics,
    candidate: AggregateMetrics,
    baselineVersion: string,
    candidateVersion: string,
  ): ComparisonMetrics {
    return {
      baseline: {
        version: baselineVersion,
        metrics: baseline,
      },
      candidate: {
        version: candidateVersion,
        metrics: candidate,
      },
      deltas: {
        performance: {
          avgDuration:
            this.percentChange(
              baseline.performance.avgDuration,
              candidate.performance.avgDuration,
            ),
          avgQueryLatency_p50:
            this.percentChange(
              baseline.performance.avgQueryLatency.p50,
              candidate.performance.avgQueryLatency.p50,
            ),
          avgQueryLatency_p95:
            this.percentChange(
              baseline.performance.avgQueryLatency.p95,
              candidate.performance.avgQueryLatency.p95,
            ),
          avgTimeToInsight:
            this.percentChange(
              baseline.performance.avgTimeToInsight,
              candidate.performance.avgTimeToInsight,
            ),
        },
        correctness: {
          entitiesFoundRate:
            this.percentChange(
              baseline.correctness.entitiesFoundRate,
              candidate.correctness.entitiesFoundRate,
            ),
          relationshipsFoundRate:
            this.percentChange(
              baseline.correctness.relationshipsFoundRate,
              candidate.correctness.relationshipsFoundRate,
            ),
          falsePositiveRate:
            this.percentChange(
              baseline.correctness.falsePositiveRate,
              candidate.correctness.falsePositiveRate,
            ),
          falseNegativeRate:
            this.percentChange(
              baseline.correctness.falseNegativeRate,
              candidate.correctness.falseNegativeRate,
            ),
        },
        reliability: {
          successRate:
            this.percentChange(
              baseline.reliability.successRate,
              candidate.reliability.successRate,
            ),
          errorRate:
            this.percentChange(
              baseline.reliability.errorRate,
              candidate.reliability.errorRate,
            ),
          timeoutRate:
            this.percentChange(
              baseline.reliability.timeoutRate,
              candidate.reliability.timeoutRate,
            ),
        },
      },
    };
  }

  /**
   * Compute latency metrics from samples
   */
  private computeLatencyMetrics(samples: number[]): LatencyMetrics {
    if (samples.length === 0) {
      return { min: 0, max: 0, mean: 0, p50: 0, p95: 0, p99: 0, samples: [] };
    }

    const sorted = [...samples].sort((a, b) => a - b);

    return {
      min: sorted[0],
      max: sorted[sorted.length - 1],
      mean: this.mean(samples),
      p50: this.percentile(sorted, 50),
      p95: this.percentile(sorted, 95),
      p99: this.percentile(sorted, 99),
      samples: sorted,
    };
  }

  /**
   * Calculate percentile
   */
  private percentile(sorted: number[], p: number): number {
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  /**
   * Calculate mean
   */
  private mean(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((a, b) => a + b, 0) / values.length;
  }

  /**
   * Calculate sum
   */
  private sum(values: number[]): number {
    return values.reduce((a, b) => a + b, 0);
  }

  /**
   * Calculate percent change
   */
  private percentChange(baseline: number, candidate: number): number {
    if (baseline === 0) return 0;
    return ((candidate - baseline) / baseline) * 100;
  }

  /**
   * Clear all sessions
   */
  clear(): void {
    this.sessions = [];
    this.scenario = undefined;
  }
}
