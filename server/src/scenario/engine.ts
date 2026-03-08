import { ScenarioDefinition, SimulationResult, SimulationState, DomainModel, ScenarioParameters } from './types';
import { CostModel } from './models/CostModel';
import { ReliabilityModel } from './models/ReliabilityModel';
import { AutonomyModel } from './models/AutonomyModel';
import { RegulatoryModel } from './models/RegulatoryModel';

export class ScenarioEngine {
  private models: DomainModel[] = [];

  constructor() {
    // Register default models
    this.models.push(new CostModel());
    this.models.push(new ReliabilityModel());
    this.models.push(new AutonomyModel());
    this.models.push(new RegulatoryModel());
  }

  public runSimulation(scenario: ScenarioDefinition): SimulationResult {
    let currentState: SimulationState = JSON.parse(JSON.stringify(scenario.initialState));
    const timeline: SimulationState[] = [currentState];
    const steps = this.calculateSteps(scenario.horizonMonths, scenario.resolution);
    const dt = this.getDt(scenario.resolution); // months per step

    for (let step = 1; step <= steps; step++) {
      const prevTime = currentState.timeMonth;
      // 1. Time Progression
      currentState.timeMonth += dt;

      // 2. Apply Scenario Events
      if (scenario.events) {
        for (const event of scenario.events) {
          // Check if event falls within this time step: (prevTime, currentState.timeMonth]
          if (event.month > prevTime && event.month <= currentState.timeMonth) {
            // Apply event impact safely
            try {
              const impact = event.impact(currentState);
              currentState = { ...currentState, ...impact };
            } catch (e: any) {
              console.error(`Error applying event at month ${currentState.timeMonth}:`, e);
            }
          }
        }
      }

      // 3. Apply Domain Models
      // In a real system, we might need topological sort for dependencies.
      // Here we assume a fixed order: Regulatory -> Autonomy -> Reliability -> Cost
      // (Regulation constraints autonomy, which affects reliability, which affects cost + autonomy efficiency)

      // For now, iterate through registered models.
      // Better to explicitly order them.
      currentState = this.applyModel('regulatory', currentState, scenario.parameters, dt);
      currentState = this.applyModel('autonomy', currentState, scenario.parameters, dt);
      currentState = this.applyModel('reliability', currentState, scenario.parameters, dt);
      currentState = this.applyModel('cost', currentState, scenario.parameters, dt);

      // 4. Invariant Checks (simplified)
      this.checkInvariants(currentState, scenario.parameters);

      // 5. Commit State
      timeline.push(JSON.parse(JSON.stringify(currentState)));
    }

    return {
      scenarioId: scenario.id,
      timeline,
      aggregateMetrics: this.calculateAggregates(timeline),
      status: 'success'
    };
  }

  private applyModel(domain: string, state: SimulationState, params: ScenarioParameters, dt: number): SimulationState {
    const model = this.models.find(m => m.name === domain);
    if (model) {
      return model.apply(state, params, dt);
    }
    return state;
  }

  private calculateSteps(horizon: number, resolution: string): number {
    switch (resolution) {
      case 'yearly': return Math.ceil(horizon / 12);
      case 'quarterly': return Math.ceil(horizon / 3);
      case 'monthly': return horizon;
      default: return horizon;
    }
  }

  private getDt(resolution: string): number {
     switch (resolution) {
      case 'yearly': return 12;
      case 'quarterly': return 3;
      case 'monthly': return 1;
      default: return 1;
    }
  }

  private checkInvariants(state: SimulationState, params: ScenarioParameters) {
    // 1. Reliability SLA Floor
    if (state.reliabilityScore < 0.99) {
      state.violations.push({
        month: state.timeMonth,
        rule: 'SLA Floor',
        value: state.reliabilityScore,
        threshold: 0.99,
        message: 'Reliability dropped below 99%'
      });
    }

    // 2. Budget Cap (Example: Cost cannot exceed 10x initial per tenant * count)
    // A real budget model would be more complex (CAGR curves).
    // Here we just ensure cost doesn't explode irrationally > 200% growth per year normalized.
    // Let's implement a simpler "Budget Efficiency" invariant.
    // If CostPerTenant > 2x BaseCostPerTenant, flag it.
    const currentCostPerTenant = state.totalCost > 0 && state.tenantCount > 0
      ? (state.totalCost / state.tenantCount) // Note: totalCost in state is cumulative or period? In model it's cumulative.
      // Wait, CostModel implementation: `newState.totalCost = state.totalCost + periodCost;`
      // So state.totalCost is cumulative total spend since T0.
      // We need instantaneous cost rate to check "Budget Cap" for this period.
      // We can't easily get instantaneous cost from just `state` unless we track it separately or diff it.
      : 0;

    // Let's assume params has a 'maxCumulativeBudget' if defined
    if (params.maxCumulativeBudget && state.totalCost > params.maxCumulativeBudget) {
       state.violations.push({
        month: state.timeMonth,
        rule: 'Budget Cap',
        value: state.totalCost,
        threshold: params.maxCumulativeBudget,
        message: 'Cumulative budget exceeded'
      });
    }
  }

  private calculateAggregates(timeline: SimulationState[]) {
    const finalState = timeline[timeline.length - 1];
    const totalTCO = timeline.reduce((sum, state) => sum + state.totalCost, 0); // This treats totalCost as "cost per period" - need to clarify unit.
    // Assuming totalCost in state is "cumulative" or "rate".
    // Let's assume state.totalCost is accumulated cost so far for simplicity in the model.

    return {
      totalTCO: finalState.totalCost,
      avgReliability: timeline.reduce((sum, s) => sum + s.reliabilityScore, 0) / timeline.length,
      finalTenantCount: finalState.tenantCount,
      violationCount: finalState.violations.length
    };
  }
}
