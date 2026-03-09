import { TripletState } from './types.js';

export class StabilityAnalyzer {
  assess(
    state: TripletState,
    volatilityScore: number,
    actionCount: number,
    cohesionScore: number,
    entropyScore: number,
    recoveryReadiness: number,
  ): number {
    const normalizedResilience = Math.min(1, state.resilienceScore / 2);
    const normalizedForecast = Math.min(1, state.resilienceForecast / 2);
    const driftPenalty = Math.min(1, state.driftScore / 5);
    const anomalyPenalty = Math.min(1, state.anomalyCount / 5);
    const intentBoost = Math.min(1, state.intentBudget / 1.5);
    const actionPressure = Math.min(1, actionCount * 0.1);
    const volatilityPenalty = Math.min(1, volatilityScore / 2);
    const cohesionBoost = Math.min(1, cohesionScore);
    const entropyPenalty = Math.min(1, entropyScore / 2);
    const recoveryBoost = Math.min(1, recoveryReadiness / 1.5);

    const raw =
      normalizedResilience * 0.28 +
      normalizedForecast * 0.18 +
      intentBoost * 0.12 +
      cohesionBoost * 0.1 +
      recoveryBoost * 0.08 +
      (1 - driftPenalty) * 0.08 +
      (1 - volatilityPenalty) * 0.07 +
      (1 - anomalyPenalty) * 0.05 -
      actionPressure * 0.03 -
      entropyPenalty * 0.03;

    return Number(Math.max(0, Math.min(1, raw)).toFixed(4));
  }
}
