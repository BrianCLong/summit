export interface PreflightSubject {
  id: string;
  roles?: string[];
  tenantId?: string;
}

export interface PreflightAction {
  name: string;
  scope?: string;
  attributes?: Record<string, unknown>;
}

export interface PreflightResource {
  id?: string;
  type?: string;
  classification?: string;
  ownerId?: string;
  tenantId?: string;
}

export interface PreflightContext {
  requestId?: string;
  ip?: string;
  userAgent?: string;
  correlationId?: string;
}

export interface PreflightRequestContract {
  subject: PreflightSubject;
  action: PreflightAction;
  resource?: PreflightResource;
  context?: PreflightContext;
}

export interface PreflightObligation {
  code: string;
  message?: string;
  targets?: string[];
}

export interface PreflightDecisionContract {
  decisionId: string;
  preflight_id: string;
  policy_id?: string;
  decision: "allow" | "deny";
  reason?: string;
  obligations: PreflightObligation[];
  redactions: string[];
}
