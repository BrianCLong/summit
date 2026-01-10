export type SecOpsMode = 'read_advise' | 'recommend_plan' | 'act';

export interface PolicyDecisionInput {
  tenantId: string;
  actor: string;
  mode: SecOpsMode;
  action: string;
  scopes: string[];
  evidenceIds: string[];
  approvals?: string[];
  impact?: 'low' | 'medium' | 'high' | 'critical';
}

export interface PolicyDecision {
  decision: 'allow' | 'deny' | 'review';
  reason: string;
  obligations?: string[];
}

export const policyBundleMetadata = {
  version: '0.1.0',
  bundle: 'secops-autonomy',
  defaultMode: 'read_advise'
};

export const evaluatePolicy = (input: PolicyDecisionInput): PolicyDecision => {
  if (input.mode === 'act') {
    if (!input.approvals || input.approvals.length === 0) {
      return { decision: 'deny', reason: 'Act mode requires approval evidence' };
    }
    if (!input.scopes.includes('containment')) {
      return { decision: 'review', reason: 'Scope containment required before act' };
    }
  }

  if (input.impact === 'critical') {
    return { decision: 'review', reason: 'Critical impact actions require dual control' };
  }

  if (input.mode === 'recommend_plan' && input.evidenceIds.length === 0) {
    return { decision: 'review', reason: 'Recommendations require linked evidence' };
  }

  return { decision: 'allow', reason: 'Policy conditions satisfied' };
};
