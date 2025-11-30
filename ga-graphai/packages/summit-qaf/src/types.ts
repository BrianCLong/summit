import type { KeyObject } from 'crypto';

export type Certificate = {
  id: string;
  subject: string;
  issuer: string;
  issuedAt: string;
  expiresAt: string;
  publicKey: string;
  signature: string;
  metadata?: Record<string, string>;
};

export type IdentityMaterial = {
  certificate: Certificate;
  privateKey: string;
};

export type CertificateRecord = IdentityMaterial & {
  revocationReason?: string;
};

export type CertificateVerification = {
  valid: boolean;
  reasons: string[];
};

export type MtlsValidationResult = {
  clientValid: boolean;
  serverValid: boolean;
  allowed: boolean;
  reasons: string[];
};

export type AgentStatus = 'provisioned' | 'active' | 'suspended' | 'retired';

export type AgentBlueprint = {
  name: string;
  role: string;
  tenantId: string;
  region?: string;
  capabilities: string[];
  allowedActions: string[];
  minimumAssurance?: number;
  tags?: string[];
};

export type AgentActionInput = {
  name: string;
  resource?: string;
  durationMs?: number;
  contextSwitches?: number;
  defectsFound?: number;
};

export type AgentLifecycleEvent = {
  timestamp: string;
  status: AgentStatus;
  reason: string;
};

export type SecurityEvaluation = {
  allowed: boolean;
  reasons: string[];
  obligations: string[];
};

export type SecurityContext = {
  agent: AgentIdentity;
  action: AgentActionInput;
  mtls?: MtlsValidationResult;
};

export type SecurityControl = {
  name: string;
  evaluate: (context: SecurityContext) => SecurityEvaluation;
};

export type AgentIdentity = {
  id: string;
  role: string;
  tenantId: string;
  certificate: Certificate;
  assurance: number;
  allowedActions: string[];
};

export type ActionOutcome = {
  action: AgentActionInput;
  allowed: boolean;
  reasons: string[];
};

export type RoiRecord = {
  agentId: string;
  action: string;
  durationMs: number;
  contextSwitches: number;
  defectsFound: number;
  timestamp: string;
};

export type RoiSummary = {
  velocityGain: number;
  contextSwitchReduction: number;
  qualityDelta: number;
  actionsTracked: number;
};

export type ComplianceCheck = {
  name: string;
  passed: boolean;
  details: string;
  evidence: Record<string, unknown>;
};

export type ComplianceReport = {
  timestamp: string;
  checks: ComplianceCheck[];
};

export type FactorySnapshot = {
  agents: AgentIdentity[];
  mtls: MtlsValidationResult;
  securityControls: string[];
  roi: RoiSummary;
  revokedCertificates: number;
};

export type KeyPair = {
  publicKey: string;
  privateKey: string;
  keyObject: KeyObject;
};
