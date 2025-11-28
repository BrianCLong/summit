export type FieldPrimitive = 'string' | 'number' | 'boolean' | 'object' | 'array';

export interface ContractField {
  name: string;
  type: FieldPrimitive;
  nullable: boolean;
  unit: string;
  pii: boolean;
  dp: boolean;
}

export interface ContractSpec {
  id: string;
  version: string;
  license: string;
  fields: ContractField[];
  createdAt?: string;
  status?: 'draft' | 'certified' | 'quarantined' | 'deprecated';
}

export interface Certification {
  id: string;
  contractId: string;
  contractVersion: string;
  issuer: string;
  issuedAt: string;
  validUntil?: string;
  signature: string;
}

export interface CertificationResult {
  certificate: Certification;
  verified: boolean;
}

export interface ConformanceResult {
  conforms: boolean;
  missingFields: string[];
  nullabilityViolations: string[];
  typeViolations: string[];
  score: number;
  piiFlagsValid: boolean;
  dpFlagsValid: boolean;
}

export interface QuarantineRecord {
  id: string;
  contractId: string;
  observedAt: string;
  reason: string;
  payloadSample: Record<string, unknown>;
  resolvedAt?: string;
  resolutionNotes?: string;
}

export interface AuditEvent {
  id: string;
  actor: string;
  action: string;
  timestamp: string;
  details?: Record<string, unknown>;
}

export interface WebhookEndpoint {
  producerId: string;
  url: string;
  secret: string;
  enabled: boolean;
}

export interface Scorecard {
  contractId: string;
  version: string;
  totalChecks: number;
  passedChecks: number;
  quarantinedEvents: number;
  lastUpdated: string;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
}
