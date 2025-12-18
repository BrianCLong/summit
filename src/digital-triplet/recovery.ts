import { FeedbackAction, RecoveryPlan, TripletState } from './types.js';

interface RecoveryPlannerConfig {
  readonly healthFloor: number;
  readonly cohesionFloor: number;
  readonly entropyCeiling: number;
}

export class RecoveryPlanner {
  constructor(
    private readonly config: RecoveryPlannerConfig = {
      healthFloor: 0.45,
      cohesionFloor: 0.55,
      entropyCeiling: 1.1,
    },
  ) {}

  plan(
    state: TripletState,
    context: { cohesionScore: number; volatilityScore: number; entropyScore: number },
  ): RecoveryPlan {
    const actions: FeedbackAction[] = [];
    const stress =
      (1 - state.healthIndex) +
      Math.max(0, this.config.cohesionFloor - context.cohesionScore) +
      Math.max(0, context.entropyScore - this.config.entropyCeiling) +
      Math.max(0, context.volatilityScore - 0.8);

    if (state.healthIndex < this.config.healthFloor || context.cohesionScore < this.config.cohesionFloor) {
      actions.push({
        target: 'physical',
        severity: 'warn',
        summary: 'Activate graceful degradation and increase sampling',
        controlVector: { healthIndex: state.healthIndex, cohesion: context.cohesionScore },
      });
    }

    if (context.entropyScore > this.config.entropyCeiling) {
      actions.push({
        target: 'digital',
        severity: 'warn',
        summary: 'Rebalance simulator priors to dampen entropy spikes',
        controlVector: { entropyScore: context.entropyScore },
      });
    }

    if (context.volatilityScore > 1 || stress > 1.5) {
      actions.push({
        target: 'cognitive',
        severity: 'info',
        summary: 'Convene multi-agent review and freeze risky actuation',
        controlVector: { volatility: context.volatilityScore },
      });
    }

    const readiness = Number(Math.min(1.5, Math.max(0.1, 0.2 + stress * 0.35)).toFixed(4));
    const rationale = `health=${state.healthIndex.toFixed(3)} cohesion=${context.cohesionScore.toFixed(
      3,
    )} entropy=${context.entropyScore.toFixed(3)} volatility=${context.volatilityScore.toFixed(3)}`;

    return { actions, readiness, rationale };
  }
}
