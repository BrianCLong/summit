export interface Obligation {
  type: string;
  requirement?: string;
  target?: string;
  details?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface PreflightSubject {
  id: string;
  tenantId?: string;
  roles?: string[];
  entitlements?: string[];
  clearance?: string;
  attributes?: Record<string, unknown>;
}

export interface PreflightResource {
  id?: string;
  type?: string;
  tenantId?: string;
  classification?: string;
  residency?: string;
  tags?: string[];
  attributes?: Record<string, unknown>;
}

export interface PreflightContext {
  purpose?: string;
  requestHash?: string;
  correlationId?: string;
  ip?: string;
  userAgent?: string;
  currentAcr?: string;
  protectedActions?: string[];
  [key: string]: unknown;
}

export interface PreflightApprover {
  id: string;
  role?: string;
  approvedAt?: string;
}

export interface PreflightRequest {
  subject: PreflightSubject;
  action: string;
  resource?: PreflightResource;
  context?: PreflightContext;
  approvers?: PreflightApprover[];
}

export interface PolicyDecision {
  allow: boolean;
  reason: string;
  obligations: Obligation[];
  preflightId?: string;
  evaluatedAt?: string;
  expiresAt?: string;
  correlationId?: string;
  requestHash?: string;
}
