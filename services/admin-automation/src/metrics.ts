import type { WorkloadMetrics } from './types.js';

/**
 * Tracks workload reduction metrics for the 70% target.
 */
export class AutomationMetrics {
  private dailyMetrics: Map<string, WorkloadMetrics> = new Map();

  /**
   * Records a form submission with automation stats
   */
  recordSubmission(stats: {
    autoCompletedFields: number;
    totalFields: number;
    reusedDataPoints: number;
    manualOverrides: number;
  }): void {
    const today = new Date().toISOString().split('T')[0];
    const existing = this.dailyMetrics.get(today) || this.createEmptyMetrics(today);

    existing.totalRequests++;
    existing.autoCompletedFields += stats.autoCompletedFields;
    existing.reusedDataPoints += stats.reusedDataPoints;
    existing.manualInterventions += stats.manualOverrides;

    // Estimate time saved: 30 seconds per auto-completed field
    existing.timeSavedMinutes += (stats.autoCompletedFields * 30) / 60;

    this.calculateReduction(existing);
    this.dailyMetrics.set(today, existing);
  }

  /**
   * Records a proactive resolution
   */
  recordProactiveResolution(autoResolved: boolean): void {
    const today = new Date().toISOString().split('T')[0];
    const existing = this.dailyMetrics.get(today) || this.createEmptyMetrics(today);

    existing.proactiveResolutions++;
    if (autoResolved) {
      // Estimate 15 minutes saved per auto-resolved need
      existing.timeSavedMinutes += 15;
    }

    this.calculateReduction(existing);
    this.dailyMetrics.set(today, existing);
  }

  /**
   * Gets metrics for a specific period
   */
  getMetrics(period: string): WorkloadMetrics | null {
    return this.dailyMetrics.get(period) || null;
  }

  /**
   * Gets aggregated metrics for date range
   */
  getAggregatedMetrics(startDate: string, endDate: string): WorkloadMetrics {
    const aggregate = this.createEmptyMetrics(`${startDate}_${endDate}`);

    for (const [date, metrics] of this.dailyMetrics) {
      if (date >= startDate && date <= endDate) {
        aggregate.totalRequests += metrics.totalRequests;
        aggregate.autoCompletedFields += metrics.autoCompletedFields;
        aggregate.reusedDataPoints += metrics.reusedDataPoints;
        aggregate.proactiveResolutions += metrics.proactiveResolutions;
        aggregate.manualInterventions += metrics.manualInterventions;
        aggregate.timeSavedMinutes += metrics.timeSavedMinutes;
      }
    }

    this.calculateReduction(aggregate);
    return aggregate;
  }

  /**
   * Checks if 70% reduction target is being met
   */
  isTargetMet(): { met: boolean; currentReduction: number; target: number } {
    const today = new Date().toISOString().split('T')[0];
    const metrics = this.dailyMetrics.get(today);

    return {
      met: (metrics?.workloadReductionPercent || 0) >= 70,
      currentReduction: metrics?.workloadReductionPercent || 0,
      target: 70,
    };
  }

  private createEmptyMetrics(period: string): WorkloadMetrics {
    return {
      period,
      totalRequests: 0,
      autoCompletedFields: 0,
      reusedDataPoints: 0,
      proactiveResolutions: 0,
      manualInterventions: 0,
      timeSavedMinutes: 0,
      workloadReductionPercent: 0,
    };
  }

  private calculateReduction(metrics: WorkloadMetrics): void {
    // Calculate reduction based on automation vs manual work
    const totalWork = metrics.autoCompletedFields + metrics.reusedDataPoints +
                     metrics.proactiveResolutions + metrics.manualInterventions;

    if (totalWork > 0) {
      const automatedWork = metrics.autoCompletedFields + metrics.reusedDataPoints +
                           metrics.proactiveResolutions;
      metrics.workloadReductionPercent = Math.round((automatedWork / totalWork) * 100);
    }
  }
}
