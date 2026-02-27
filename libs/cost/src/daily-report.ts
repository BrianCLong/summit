import type { CostModel, UsageEvent, CostReport } from './types';
import { CostCalculator } from './calculator';

/**
 * Generate a daily cost report for a given date and set of usage events.
 *
 * The report includes:
 * - Cost summary (total, by operation, by dimension)
 * - Projected monthly cost (linear extrapolation)
 * - Budget comparison (remaining, utilization ratio)
 * - Anomaly detection (day-over-day comparison)
 *
 * @param date - The report date (ISO string, e.g. '2026-02-26')
 * @param events - All usage events for the given date
 * @param costModel - The active cost model configuration
 * @param previousDayCost - Total cost from the previous day (for anomaly detection)
 * @param environment - Environment tier ('development' | 'staging' | 'production')
 */
export function generateDailyReport(
  date: string,
  events: UsageEvent[],
  costModel: CostModel,
  previousDayCost: number,
  environment: string = 'production',
): CostReport {
  const calculator = new CostCalculator(costModel);

  // Calculate cost summary for the day
  const summary = calculator.aggregateCosts(events);

  // Extract day of month for projection
  const dayOfMonth = new Date(date).getDate();
  const projectedMonthlyCost = calculator.projectMonthlyCost(
    summary.total,
    dayOfMonth,
  );

  // Budget comparison
  const budget = costModel.budgets[environment];
  const monthlyBudget = budget?.monthly ?? 0;
  const budgetRemaining = monthlyBudget - projectedMonthlyCost;
  const budgetUtilization =
    monthlyBudget > 0 ? projectedMonthlyCost / monthlyBudget : 0;

  // Anomaly detection
  const anomalyThreshold = costModel.anomalyDetection.enabled
    ? costModel.anomalyDetection.threshold
    : Infinity;

  const anomalies = calculator.detectAnomalies(
    summary.total,
    previousDayCost,
    anomalyThreshold,
  );

  return {
    date,
    summary,
    projectedMonthlyCost,
    budgetRemaining,
    budgetUtilization,
    anomalies,
    environment,
  };
}
