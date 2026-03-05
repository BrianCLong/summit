import crypto from 'crypto';

interface GovernanceDecision {
  evidenceId: string;
  policyId: string;
  effect: 'allow' | 'deny' | 'require_approval';
  reason: string;
  timestampHash: string;
}

export class GovernanceEngine {
  private policies: any[];

  constructor(policies: any[]) {
    this.policies = policies;
  }

  evaluate(evidenceId: string, rewardScore: number, rubricCoverage: number): GovernanceDecision {
    for (const policy of this.policies) {
      if (policy.condition) {
        if (policy.condition.minRewardScore !== undefined && rewardScore < policy.condition.minRewardScore) {
          return this.createDecision(evidenceId, policy.id, policy.effect, `Reward score ${rewardScore} < ${policy.condition.minRewardScore}`);
        }
        if (policy.condition.minRubricCoverage !== undefined && rubricCoverage < policy.condition.minRubricCoverage) {
          return this.createDecision(evidenceId, policy.id, policy.effect, `Rubric coverage ${rubricCoverage} < ${policy.condition.minRubricCoverage}`);
        }
      }
    }
    return this.createDecision(evidenceId, 'default-allow', 'allow', 'All conditions met');
  }

  private createDecision(evidenceId: string, policyId: string, effect: 'allow' | 'deny' | 'require_approval', reason: string): GovernanceDecision {
    const data = JSON.stringify({ evidenceId, policyId, effect, reason });
    const timestampHash = crypto.createHash('sha256').update(data).digest('hex');
    return { evidenceId, policyId, effect, reason, timestampHash };
  }
}
