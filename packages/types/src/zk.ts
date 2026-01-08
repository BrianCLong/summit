export type ZkRiskTier = "tier-1" | "tier-2" | "tier-3" | "tier-4";

export type ZkResponseStatus = "accepted" | "rejected" | "needs-review" | "blocked";

export interface ZkRequestEnvelope {
  requestId: string;
  tenantId: string;
  circuitId: string;
  statement: string;
  payloadFingerprint: string;
  evidenceBundleIds?: string[];
  requestedBy: string;
  requestedAt: string;
  schemaVersion: string;
  riskTier: ZkRiskTier;
  safeguardsRequested?: string[];
  tags?: string[];
}

export interface ZkResponseEnvelope {
  requestId: string;
  status: ZkResponseStatus;
  rationale?: string;
  safeguardsApplied?: string[];
  auditManifestId?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  schemaVersion: string;
  decisionCode?: string;
}

export type AuditEvidenceClassifier =
  | "request-metadata"
  | "witness-fingerprint"
  | "proof-metadata"
  | "review-log"
  | "policy-decision";

export type RedactionLevel = "none" | "partial" | "full";

export interface AuditEvidencePointer {
  id: string;
  uri: string;
  digestAlgorithm: string;
  digest: string;
  classifier: AuditEvidenceClassifier;
  redactionLevel?: RedactionLevel;
}

export interface RetentionPolicy {
  policyName: string;
  expiresAt?: string;
  legalHold?: boolean;
}

export type AuditManifestStatus = "draft" | "finalized" | "superseded";

export interface AuditManifest {
  manifestId: string;
  requestId: string;
  responseId?: string;
  tenantId: string;
  circuitId: string;
  schemaVersion: string;
  riskTier: ZkRiskTier;
  controlsApplied: string[];
  evidence: AuditEvidencePointer[];
  submittedAt: string;
  finalizedAt?: string;
  reviewer?: string;
  status: AuditManifestStatus;
  retentionPolicy: RetentionPolicy;
}
