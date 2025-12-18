export type RiskCategory = 'defensive_security' | 'analytics' | 'foresight' | 'influence_operations' | 'authoritarian_surveillance';

export type PolicyResult = 'ALLOWED' | 'CONDITIONAL' | 'DENIED';

export interface GovernanceDecision {
  id: string;
  tenantId: string;
  taskId?: string;
  timestamp: Date;
  outcome: PolicyResult;
  reason: string;
  riskCategory: RiskCategory;
}

export interface ValuePrinciple {
  id: string;
  description: string;
  priority: number;
}
