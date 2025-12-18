import { ConsensusResult, FeedbackAction } from './types.js';

const severityWeight: Record<FeedbackAction['severity'], number> = {
  info: 0.05,
  warn: 0.15,
  critical: 0.3,
};

export class ActionConsensusEngine {
  constructor(private readonly recoveryRate = 0.05) {}

  merge(currentBudget: number, actions: FeedbackAction[]): ConsensusResult {
    const deduped = this.dedupe(actions);
    const admitted: FeedbackAction[] = [];
    let budget = currentBudget;

    deduped.forEach((action) => {
      const cost = severityWeight[action.severity] ?? 0.1;
      if (budget - cost >= 0) {
        budget = Number((budget - cost).toFixed(4));
        admitted.push(action);
      }
    });

    const recovered = Math.min(1.5, Number((budget + this.recoveryRate).toFixed(4)));

    return { actions: admitted, remainingBudget: recovered };
  }

  private dedupe(actions: FeedbackAction[]): FeedbackAction[] {
    const seen = new Set<string>();
    return actions.filter((action) => {
      const key = `${action.target}:${action.summary}:${action.severity}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
}
