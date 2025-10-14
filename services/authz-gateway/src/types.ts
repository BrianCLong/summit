export interface SubjectAttributes {
  id: string;
  tenantId: string;
  roles: string[];
  entitlements: string[];
  residency: string;
  clearance: string;
  loa: string;
  riskScore: number;
  groups: string[];
  metadata: Record<string, string>;
  lastSyncedAt?: string;
  lastReviewedAt?: string;
}

export interface ResourceAttributes {
  id: string;
  tenantId: string;
  residency: string;
  classification: string;
  tags: string[];
}

export interface DecisionContext {
  protectedActions: string[];
  requestTime: string;
  currentAcr: string;
}

export interface DecisionObligation {
  type: string;
  requirement?: string;
  target?: string;
  [key: string]: unknown;
}

export interface AuthorizationInput {
  subject: SubjectAttributes;
  resource: ResourceAttributes;
  action: string;
  context: DecisionContext;
}

export interface AuthorizationDecision {
  allowed: boolean;
  reason: string;
  obligations: DecisionObligation[];
}
