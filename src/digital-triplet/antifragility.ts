import { TripletState } from './types.js';

export class AntifragilityEngine {
  score(state: TripletState, volatilityScore: number, recoveryReadiness: number): number {
    const benefitFromStress = Math.max(0, volatilityScore - state.driftScore) * 0.05;
    const resilienceContribution = (state.resilienceScore + state.resilienceForecast) / 2;
    const recoveryContribution = recoveryReadiness * 0.4;
    const entropyPenalty = state.entropyScore * 0.1;
    const cohesionBoost = state.cohesionScore * 0.3;

    const raw =
      resilienceContribution +
      recoveryContribution +
      benefitFromStress +
      cohesionBoost -
      entropyPenalty +
      Math.min(0.2, state.intentBudget * 0.02);

    return Math.max(0, Math.min(2.5, Number(raw.toFixed(4))));
  }
}
