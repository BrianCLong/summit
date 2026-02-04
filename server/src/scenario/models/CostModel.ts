import { DomainModel, SimulationState, ScenarioParameters } from '../types.js';

export class CostModel implements DomainModel {
  name = 'cost' as const;

  apply(state: SimulationState, params: ScenarioParameters, dt: number): SimulationState {
    const newState = { ...state };

    // Simple Cost Model
    // 1. Tenant Growth
    const growthFactor = Math.pow(1 + params.growthRate, dt);
    newState.tenantCount = Math.floor(state.tenantCount * growthFactor);

    // 2. Base Cost
    let periodCost = newState.tenantCount * params.baseCostPerTenant * dt;

    // 3. Autonomy Efficiency
    // Higher autonomy reduces cost (e.g., less manual support)
    // Tier 1: 0% reduction, Tier 2: 20%, Tier 3: 50%
    let efficiencyModifier = 1.0;
    if (params.autonomyLevel === 'tier2') efficiencyModifier = 0.8;
    if (params.autonomyLevel === 'tier3') efficiencyModifier = 0.5;

    // Apply autonomy adoption rate (not all tenants/tasks are autonomous immediately)
    // weighted efficiency
    const effectiveEfficiency = 1.0 - (newState.autonomyAdoption * (1.0 - efficiencyModifier));

    periodCost = periodCost * effectiveEfficiency;

    // 4. Regulatory Overhead
    // High regulation adds cost
    let regOverhead = 1.0;
    if (params.regulatoryStrictness === 'high') regOverhead = 1.25;
    if (params.regulatoryStrictness === 'medium') regOverhead = 1.10;

    periodCost = periodCost * regOverhead;

    // Accumulate total cost
    newState.totalCost = state.totalCost + periodCost;

    return newState;
  }
}
