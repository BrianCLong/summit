import type { CostModel, UsageEvent, CostSummary, AnomalyResult } from './types';

/**
 * CostCalculator computes per-event costs, aggregates usage, projects
 * monthly spend, and detects day-over-day anomalies.
 */
export class CostCalculator {
  private readonly costModel: CostModel;

  constructor(costModel: CostModel) {
    this.costModel = costModel;
  }

  /**
   * Calculate the cost of a single usage event.
   * Returns 0 for unknown operation types (no hidden charges).
   */
  calculate(event: UsageEvent): number {
    const unitCost = this.costModel.unitCosts[event.operation];
    if (unitCost === undefined) {
      return 0;
    }
    return unitCost * event.quantity;
  }

  /**
   * Aggregate costs across multiple events, grouped by operation and dimension.
   */
  aggregateCosts(events: UsageEvent[]): CostSummary {
    const byOperation: Record<string, number> = {};
    const byDimension: Record<string, Record<string, number>> = {};
    let total = 0;

    for (const event of events) {
      const cost = this.calculate(event);
      total += cost;

      // Group by operation
      byOperation[event.operation] = (byOperation[event.operation] ?? 0) + cost;

      // Group by each dimension key/value
      for (const [dimKey, dimValue] of Object.entries(event.dimensions)) {
        if (!byDimension[dimKey]) {
          byDimension[dimKey] = {};
        }
        byDimension[dimKey][dimValue] = (byDimension[dimKey][dimValue] ?? 0) + cost;
      }
    }

    return { total, byOperation, byDimension };
  }

  /**
   * Linear projection of monthly cost given current daily spend and day of month.
   * Formula: (dailyCost / dayOfMonth) * 30
   */
  projectMonthlyCost(dailyCost: number, dayOfMonth: number): number {
    if (dayOfMonth <= 0) {
      return 0;
    }
    return (dailyCost / dayOfMonth) * 30;
  }

  /**
   * Detect day-over-day cost anomalies.
   * An anomaly is flagged when today's cost exceeds yesterday's cost
   * by more than the configured threshold percentage.
   */
  detectAnomalies(
    todayCost: number,
    yesterdayCost: number,
    threshold: number,
  ): AnomalyResult {
    let percentageChange = 0;

    if (yesterdayCost > 0) {
      percentageChange = (todayCost - yesterdayCost) / yesterdayCost;
    } else if (todayCost > 0) {
      // If yesterday was zero but today has cost, treat as 100% increase
      percentageChange = 1.0;
    }

    return {
      isAnomaly: percentageChange > threshold,
      percentageChange,
      threshold,
      todayCost,
      yesterdayCost,
    };
  }
}
