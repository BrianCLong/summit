import type { UncertaintyRecord, UncertaintyState } from './models.js';

export interface PolicyAction {
  action_type: string;
  target: string;
  parameters: Record<string, unknown>;
}

export interface PolicyRule {
  evaluate(context: Record<string, unknown>, records: UncertaintyRecord[]): PolicyAction | null;
}

export class HighRiskEpistemicDebateRule implements PolicyRule {
  evaluate(context: Record<string, unknown>, records: UncertaintyRecord[]): PolicyAction | null {
    const task_risk = (context.task_risk as string) || 'low';
    if (task_risk === 'high') {
      for (const record of records) {
        if (record.scores.epistemic_score > 0.7) {
          return {
            action_type: 'add_step',
            target: 'multi_agent_debate',
            parameters: {
              re_check: 'DiverseAgentEntropy',
              record_id: record.id,
            },
          };
        }
      }
    }
    return null;
  }
}

export class LowEvidenceReviewRule implements PolicyRule {
  evaluate(context: Record<string, unknown>, records: UncertaintyRecord[]): PolicyAction | null {
    for (const record of records) {
      if (record.scores.epistemic_score > 0.6 && record.scores.evidence_coverage < 0.3) {
        record.state = 'Escalated' as UncertaintyState;
        return {
          action_type: 'block_and_route',
          target: 'human_review_queue',
          parameters: {
            reason: 'Low evidence coverage with high epistemic uncertainty',
            record_id: record.id,
          },
        };
      }
    }
    return null;
  }
}

export class HighAleatoricLowEpistemicRule implements PolicyRule {
  evaluate(context: Record<string, unknown>, records: UncertaintyRecord[]): PolicyAction | null {
    for (const record of records) {
      if (record.scores.aleatoric_score > 0.8 && record.scores.epistemic_score < 0.4) {
        return {
          action_type: 'adjust_sampling',
          target: 'temperature',
          parameters: {
            value: 0.1,
            fallback: 'reuse_best_prior_trajectory',
            record_id: record.id,
          },
        };
      }
    }
    return null;
  }
}

export class UncertaintyPolicyEngine {
  private rules: PolicyRule[];

  constructor(rules?: PolicyRule[]) {
    this.rules = rules || [
      new HighRiskEpistemicDebateRule(),
      new LowEvidenceReviewRule(),
      new HighAleatoricLowEpistemicRule(),
    ];
  }

  evaluatePlan(taskMetadata: Record<string, unknown>, records: UncertaintyRecord[]): PolicyAction[] {
    const actions: PolicyAction[] = [];
    for (const rule of this.rules) {
      const action = rule.evaluate(taskMetadata, records);
      if (action) {
        actions.push(action);
      }
    }
    return actions;
  }
}

export const globalPolicyEngine = new UncertaintyPolicyEngine();
