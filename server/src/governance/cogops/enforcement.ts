import { Action, Campaign } from '../../campaign/schema';
import { CogOpsPolicy } from './policy';

export interface EnforcementResult {
  allowed: boolean;
  violations: Array<{
    policyId: string;
    policyName: string;
    severity: string;
  }>;
}

export function enforce(action: Action, campaign: Campaign, policies: CogOpsPolicy[]): EnforcementResult {
  const violations = [];
  for (const policy of policies) {
    if (!policy.check(action, campaign)) {
      violations.push({
        policyId: policy.id,
        policyName: policy.name,
        severity: policy.severity
      });
    }
  }

  return {
    allowed: violations.length === 0,
    violations
  };
}
