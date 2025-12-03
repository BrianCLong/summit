import { CognitiveSignal, FeedbackAction, IntentResolution, TripletState } from '../types.js';

interface PolicyConfig {
  readonly driftThreshold: number;
  readonly resilienceFloor: number;
}

export class PolicyAgent {
  constructor(private readonly config: PolicyConfig) {}

  evaluate(state: TripletState): IntentResolution {
    const actions: FeedbackAction[] = [];
    if (state.driftScore > this.config.driftThreshold) {
      actions.push({
        target: 'digital',
        severity: 'critical',
        summary: 'Retrain simulators to reduce drift',
        controlVector: { driftScore: state.driftScore },
      });
    }

    if (state.resilienceScore < this.config.resilienceFloor) {
      actions.push({
        target: 'physical',
        severity: 'warn',
        summary: 'Increase redundancy and sampling rate',
        controlVector: { resilienceScore: state.resilienceScore },
      });
    }

    const cognitive: CognitiveSignal = {
      type: 'cognitive',
      agentId: 'policy-agent',
      timestamp: Date.now(),
      intent: 'stabilize',
      recommendations: actions.map((action) => action.summary),
      confidence: actions.length === 0 ? 0.5 : 0.9,
    };

    return {
      nextActions: actions,
      updatedResilience: Math.max(state.resilienceScore, this.config.resilienceFloor),
    };
  }
}
