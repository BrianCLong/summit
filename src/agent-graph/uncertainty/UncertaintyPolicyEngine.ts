import { UncertaintyRecord } from './UncertaintyRecord';

export interface TaskContext {
  task_id: string;
  task_risk: 'low' | 'medium' | 'high';
}

export interface AdaptationAction {
  action: string;
  reason: string;
}

export class UncertaintyPolicyEngine {
  evaluate(record: UncertaintyRecord, context: TaskContext): AdaptationAction[] {
    const actions: AdaptationAction[] = [];
    const { quantitative } = record;

    if (quantitative.epistemic_score > 0.7 && context.task_risk === 'high') {
      actions.push({
        action: 'increase_debate_depth',
        reason: 'High epistemic uncertainty on a high-risk task requires more debate rounds and external verification.'
      });
    }

    if (quantitative.epistemic_score > 0.6 && quantitative.evidence_coverage_ratio < 0.3) {
      actions.push({
        action: 'escalate_to_human',
        reason: 'High epistemic uncertainty with low evidence coverage ratio blocks automation.'
      });
    }

    if (quantitative.aleatoric_score > 0.7 && quantitative.epistemic_score <= 0.4) {
      actions.push({
        action: 'enforce_deterministic_decoding',
        reason: 'High aleatoric but low epistemic uncertainty indicates the model knows the answer but decoding is unstable.'
      });
    }

    return actions;
  }
}
