export interface CompanyOSDecisionEvidence {
  evidenceId: string; // EVID:<tenantId>:<kind>:<stableHash>
  timestamp: string;
  tenantId: string;
  actorId: string;
  kind: 'FlowStart' | 'ToolInvoke' | 'JobStart';
  resource: string;
  decision: 'allow' | 'deny';
  reasons: string[];
  policyVersion: string;
  auditEventId: string;
}
