import { DomainModel, SimulationState, ScenarioParameters } from '../types';

export class RegulatoryModel implements DomainModel {
  name = 'regulatory' as const;

  apply(state: SimulationState, params: ScenarioParameters, dt: number): SimulationState {
    const newState = { ...state };

    // Regulatory environment determines compliance score
    // If we are aggressive (Tier 3) but regulation is strict, compliance drops.

    let baseCompliance = 1.0;

    if (params.regulatoryStrictness === 'high') {
        newState.activeRegulation = ['EU AI Act', 'GDPR V2', 'Data Residency'];
        if (params.autonomyLevel === 'tier3') {
            baseCompliance -= 0.2; // Penalty for high autonomy in strict regime
        }
    } else if (params.regulatoryStrictness === 'medium') {
        newState.activeRegulation = ['GDPR'];
        if (params.autonomyLevel === 'tier3') {
            baseCompliance -= 0.05;
        }
    } else {
        newState.activeRegulation = [];
    }

    // Cost of compliance is handled in CostModel.
    // Here we track the "Compliance Score" risk.

    newState.complianceScore = baseCompliance;

    return newState;
  }
}
