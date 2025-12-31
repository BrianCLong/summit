import {
  StrategicScenarioType,
  StrategicScenarioParameters,
  SimulationSnapshot,
  StrategicSimulationResult,
  CapacityLoadParameters,
  CostBudgetParameters,
} from './types';
import { randomUUID } from 'crypto';

export class StrategicSimulationEngine {
  /**
   * Runs a strategic simulation based on a snapshot and parameters.
   * strictly read-only: operates solely on the passed snapshot.
   */
  public async runSimulation(
    type: StrategicScenarioType,
    params: StrategicScenarioParameters,
    snapshot: SimulationSnapshot
  ): Promise<StrategicSimulationResult> {
    const scenarioId = randomUUID();

    switch (type) {
      case StrategicScenarioType.CAPACITY_LOAD:
        return this.runCapacitySimulation(scenarioId, params as CapacityLoadParameters, snapshot);
      case StrategicScenarioType.COST_BUDGET:
        return this.runBudgetSimulation(scenarioId, params as CostBudgetParameters, snapshot);
      default:
        throw new Error(`Unsupported scenario type: ${type}`);
    }
  }

  private runCapacitySimulation(
    id: string,
    params: CapacityLoadParameters,
    snapshot: SimulationSnapshot
  ): StrategicSimulationResult {
    const { trafficMultiplier, resourceType, affectedTenants } = params;

    let totalThrottled = 0;
    let maxUtilization = 0;
    const traces: string[] = [];
    const factors: string[] = [`Traffic Multiplier: ${trafficMultiplier}x`];

    // Filter usage for the relevant resource
    const relevantUsage = snapshot.recentUsage.filter(u => u.resource === resourceType);

    if (relevantUsage.length === 0) {
       return {
        scenarioId: id,
        timestamp: new Date(),
        type: StrategicScenarioType.CAPACITY_LOAD,
        success: true,
        metrics: { peakUtilization: 0, totalThrottledEvents: 0 },
        deltas: { utilizationChange: 0 },
        explanation: {
          summary: "No historical usage found for this resource type.",
          factors,
          traces: ["No data points to simulate."]
        },
        confidenceScore: 0.1 // Low confidence due to no data
      };
    }

    // Simulate each usage event with the multiplier
    for (const usage of relevantUsage) {
      if (affectedTenants && !affectedTenants.includes(usage.tenantId)) {
        continue;
      }

      const quota = snapshot.quotas[usage.tenantId];
      if (!quota) {
        traces.push(`Warning: No quota found for tenant ${usage.tenantId}, skipping check.`);
        continue;
      }

      const limit = quota.limits[resourceType]?.limit;
      if (limit === undefined) {
         traces.push(`Warning: No limit found for resource ${resourceType} for tenant ${usage.tenantId}.`);
         continue;
      }

      const simulatedAmount = usage.amount * trafficMultiplier;
      const utilization = simulatedAmount / limit;

      if (utilization > maxUtilization) {
        maxUtilization = utilization;
      }

      if (simulatedAmount > limit) {
        totalThrottled++;
        traces.push(`Tenant ${usage.tenantId} throttled at ${usage.timestamp.toISOString()}. Request: ${simulatedAmount.toFixed(2)}, Limit: ${limit}`);
      }
    }

    // Calculate baseline (multiplier = 1) for deltas
    // Simplified baseline calculation
    let baselineMaxUtilization = 0;
    for (const usage of relevantUsage) {
       if (affectedTenants && !affectedTenants.includes(usage.tenantId)) continue;
       const quota = snapshot.quotas[usage.tenantId];
       if (!quota || !quota.limits[resourceType]) continue;
       const limit = quota.limits[resourceType].limit;
       const utilization = usage.amount / limit;
       if (utilization > baselineMaxUtilization) baselineMaxUtilization = utilization;
    }

    return {
      scenarioId: id,
      timestamp: new Date(),
      type: StrategicScenarioType.CAPACITY_LOAD,
      success: totalThrottled === 0,
      metrics: {
        peakUtilization: maxUtilization,
        totalThrottledEvents: totalThrottled,
      },
      deltas: {
        utilizationChange: maxUtilization - baselineMaxUtilization,
      },
      explanation: {
        summary: totalThrottled > 0
          ? `Simulation predicts ${totalThrottled} throttling events with ${trafficMultiplier}x load.`
          : `System can handle ${trafficMultiplier}x load without throttling.`,
        factors,
        traces: traces.slice(0, 50) // Limit trace size
      },
      confidenceScore: 0.85 // High confidence as it's deterministic math on real data
    };
  }

  private runBudgetSimulation(
    id: string,
    params: CostBudgetParameters,
    snapshot: SimulationSnapshot
  ): StrategicSimulationResult {
    const { budgetReductionPercentage, targetDomain } = params;
    const budget = snapshot.budgets[targetDomain];

    if (!budget) {
       return {
        scenarioId: id,
        timestamp: new Date(),
        type: StrategicScenarioType.COST_BUDGET,
        success: false,
        metrics: {},
        deltas: {},
        explanation: {
          summary: `No budget found for domain ${targetDomain}`,
          factors: [],
          traces: []
        },
        confidenceScore: 0.0
      };
    }

    const currentLimit = budget.limit;
    const newLimit = currentLimit * (1 - budgetReductionPercentage);
    const currentSpending = budget.currentSpending;
    const projectedSpending = budget.forecastedSpending || currentSpending; // Use forecast if available, else current

    const isExhausted = projectedSpending > newLimit;
    const traces: string[] = [];

    traces.push(`Original Limit: ${currentLimit}`);
    traces.push(`New Limit: ${newLimit} (-${budgetReductionPercentage * 100}%)`);
    traces.push(`Projected Spending: ${projectedSpending}`);

    if (isExhausted) {
      traces.push(`Budget would be exhausted. Overrun: ${projectedSpending - newLimit}`);
    }

    return {
      scenarioId: id,
      timestamp: new Date(),
      type: StrategicScenarioType.COST_BUDGET,
      success: !isExhausted,
      metrics: {
        projectedSpend: projectedSpending,
        newLimit: newLimit,
        overrun: Math.max(0, projectedSpending - newLimit)
      },
      deltas: {
        spendChange: 0, // We didn't change spend, only limit
        limitChange: newLimit - currentLimit
      },
      explanation: {
        summary: isExhausted
          ? `Budget reduction of ${budgetReductionPercentage * 100}% causes overrun of ${projectedSpending - newLimit}.`
          : `Budget reduction of ${budgetReductionPercentage * 100}% is sustainable.`,
        factors: [`Reduction: ${budgetReductionPercentage}`, `Domain: ${targetDomain}`],
        traces
      },
      confidenceScore: 0.9
    };
  }
}
