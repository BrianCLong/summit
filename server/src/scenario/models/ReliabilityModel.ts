import { DomainModel, SimulationState, ScenarioParameters } from '../types.js';

export class ReliabilityModel implements DomainModel {
  name = 'reliability' as const;

  apply(state: SimulationState, params: ScenarioParameters, dt: number): SimulationState {
    const newState = { ...state };

    // Baseline reliability
    let incidentProb = params.incidentBaseline;

    // Scale Penalty: More tenants = more complexity = slightly higher risk if not managed
    const scaleFactor = Math.log10(newState.tenantCount) / 2; // Arbitrary damping
    incidentProb = incidentProb * scaleFactor;

    // Autonomy Impact
    // Tier 2 might introduce new failure modes initially, then improve.
    // Tier 3 is high risk if not mature.
    // Let's model a simple "Autonomy Risk" curve.
    if (params.autonomyLevel === 'tier3') {
        // High risk initially
        incidentProb *= 1.5;
    } else if (params.autonomyLevel === 'tier2') {
        incidentProb *= 1.1;
    }

    // Reliability Score (inverse of incident probability, normalized)
    // Simple mock calculation
    newState.reliabilityScore = Math.max(0, Math.min(1, 1 - incidentProb));

    return newState;
  }
}
