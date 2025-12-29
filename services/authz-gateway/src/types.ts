export interface SubjectAttributes {
  id: string;
  tenantId: string;
  org?: string;
  role?: string;
  region?: string;
  auth_strength?: string;
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
  owner?: string;
  customer_id?: string;
  tags: string[];
}

export interface DecisionContext {
  protectedActions: string[];
  requestTime: string;
  currentAcr: string;
  breakGlass?: BreakGlassMetadata;
}

export interface ElevationContext {
  sessionId: string;
  requestedAction: string;
  resourceId?: string;
  tenantId?: string;
  classification?: string;
  currentAcr?: string;
}

export interface ElevationGrant extends ElevationContext {
  grantedAt: string;
  expiresAt: string;
  mechanism: string;
  challengeId: string;
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
  decisionId?: string;
  policyVersion?: string;
  inputsHash?: string;
}

export interface BreakGlassMetadata {
  requestId: string;
  ticketId: string;
  justification: string;
  issuedAt: string;
  expiresAt: string;
  approverId: string;
}
