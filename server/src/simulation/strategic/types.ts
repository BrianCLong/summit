import { TenantQuota, BudgetStatus, ResourceType, CostDomain } from '../../lib/resources/types';

/**
 * Types of strategic scenarios available.
 */
export enum StrategicScenarioType {
  CAPACITY_LOAD = 'CAPACITY_LOAD',
  COST_BUDGET = 'COST_BUDGET',
  POLICY_CHANGE = 'POLICY_CHANGE', // Future
  RELIABILITY_EVENT = 'RELIABILITY_EVENT', // Future
}

/**
 * Parameters for Capacity & Load scenarios.
 */
export interface CapacityLoadParameters {
  /**
   * Multiplier for traffic volume (e.g., 1.5 for 50% increase).
   */
  trafficMultiplier: number;
  /**
   * Specific resource to stress test.
   */
  resourceType: ResourceType;
  /**
   * Optional list of tenant IDs to apply the load to. If empty, applies to all.
   */
  affectedTenants?: string[];
}

/**
 * Parameters for Cost & Budget scenarios.
 */
export interface CostBudgetParameters {
  /**
   * Percentage to reduce the budget by (e.g., 0.15 for 15% reduction).
   */
  budgetReductionPercentage: number;
  /**
   * The cost domain to apply the budget change to.
   */
  targetDomain: CostDomain;
}

/**
 * Union type for scenario parameters.
 */
export type StrategicScenarioParameters = CapacityLoadParameters | CostBudgetParameters;

/**
 * A snapshot of the system state required for simulation.
 */
export interface SimulationSnapshot {
  timestamp: Date;
  quotas: Record<string, TenantQuota>; // tenantId -> Quota
  budgets: Record<string, BudgetStatus>; // domain -> Budget
  recentUsage: Array<{
    tenantId: string;
    resource: ResourceType;
    amount: number;
    timestamp: Date;
  }>;
}

/**
 * Result of a single simulation run.
 */
export interface StrategicSimulationResult {
  scenarioId: string;
  timestamp: Date;
  type: StrategicScenarioType;

  /**
   * Whether the simulated outcome is considered "sustainable" or "successful".
   * For capacity: No critical failures.
   * For budget: No overruns.
   */
  success: boolean;

  /**
   * Quantitative outcomes.
   */
  metrics: {
    peakUtilization?: number; // 0-1
    totalThrottledEvents?: number;
    projectedSpend?: number;
    budgetExhaustedAt?: Date;
    [key: string]: any;
  };

  /**
   * Difference from the baseline (no-change scenario).
   */
  deltas: {
    utilizationChange?: number;
    spendChange?: number;
    [key: string]: any;
  };

  /**
   * Explanation of the result.
   */
  explanation: {
    summary: string;
    factors: string[];
    traces: string[]; // e.g., "Tenant X hit limit Y at time T"
  };

  /**
   * Confidence level of the simulation (0-1).
   */
  confidenceScore: number;
}
