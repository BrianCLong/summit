export type RiskTier = 'low' | 'med' | 'high';

export type CompanyOSAction =
  | 'FLOW_RUN'
  | 'TOOL_INVOKE'
  | 'JOB_RUN'
  | 'REPO_USE';

export interface Org {
  orgId: string;
  name: string;
}

export interface PolicyRule {
  policyId: string;
  orgId: string;
  actions: CompanyOSAction[];
  actorIds?: string[];
  allowedTools?: string[];
  maxTokenEstimate?: number;
  requiredRiskTierAtMost?: RiskTier;
}

export interface PolicyContext {
  orgId: string;
  actorId: string;
  action: CompanyOSAction;
  flowId?: string;
  jobId?: string;
  toolName?: string;
  repo?: string;
  tokenEstimate?: number;
  riskTier?: RiskTier;
}

export interface Decision {
  decisionId: string;
  allowed: boolean;
  reasons: string[];
  policyIds: string[];
}
