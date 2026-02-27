/**
 * Cost model and metering types for IntelGraph v5.0.0 Cost Guardrails.
 */

/** Unit cost mapping: operation name -> cost per unit in USD */
export interface CostModel {
  unitCosts: Record<string, number>;
  budgets: Record<string, BudgetConfig>;
  anomalyDetection: {
    enabled: boolean;
    threshold: number;
  };
}

/** A single usage event emitted by metering middleware or connectors */
export interface UsageEvent {
  operation: string;
  dimensions: Record<string, string>;
  quantity: number;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

/** Aggregated cost summary for a time period */
export interface CostSummary {
  total: number;
  byOperation: Record<string, number>;
  byDimension: Record<string, Record<string, number>>;
}

/** Budget configuration for an environment tier */
export interface BudgetConfig {
  monthly: number;
  alert_threshold: number;
}

/** Daily cost report output */
export interface CostReport {
  date: string;
  summary: CostSummary;
  projectedMonthlyCost: number;
  budgetRemaining: number;
  budgetUtilization: number;
  anomalies: AnomalyResult;
  environment: string;
}

/** Result of anomaly detection comparison */
export interface AnomalyResult {
  isAnomaly: boolean;
  percentageChange: number;
  threshold: number;
  todayCost: number;
  yesterdayCost: number;
}
