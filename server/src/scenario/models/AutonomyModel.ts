import { DomainModel, SimulationState, ScenarioParameters } from '../types.js';

export class AutonomyModel implements DomainModel {
  name = 'autonomy' as const;

  apply(state: SimulationState, params: ScenarioParameters, dt: number): SimulationState {
    const newState = { ...state };

    // Adoption S-Curve
    // If strict regulation, adoption is capped.
    let maxAdoption = 1.0;
    if (params.regulatoryStrictness === 'high') maxAdoption = 0.3;
    if (params.regulatoryStrictness === 'medium') maxAdoption = 0.7;

    if (params.autonomyLevel === 'tier1') {
        maxAdoption = 0.1; // Only basic scripts
    }

    // Logistic growth for adoption
    const growthRate = 0.20 * dt; // Adoption speed
    const current = state.autonomyAdoption;

    // dP/dt = rP(1 - P/K)
    const delta = growthRate * current * (1 - current / maxAdoption);

    newState.autonomyAdoption = Math.min(maxAdoption, current + delta);

    return newState;
  }
}
