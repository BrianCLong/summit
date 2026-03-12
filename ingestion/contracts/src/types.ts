export type DataClassification = 'public' | 'dp' | 'pii';

export interface ContractField {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'object' | 'array';
  nullable: boolean;
  unit?: string;
  description?: string;
  classification?: DataClassification;
  pii?: boolean;
  dp?: boolean;
}

export interface ContractLicense {
  name: string;
  url?: string;
  attributionRequired?: boolean;
  expiresAt?: string;
}

export interface ContractSpec {
  id: string;
  dataset: string;
  version: string;
  owner: string;
  fields: ContractField[];
  license: ContractLicense;
  termsHash: string;
  certified?: boolean;
  certifiedAt?: string;
  signature?: string;
  createdAt?: string;
  status?: 'draft' | 'certified' | 'revoked';
}

export interface ValidationFinding {
  field: string;
  issue: string;
  severity: 'info' | 'warning' | 'error';
}

export interface DriftDiffEntry {
  field: string;
  change: 'added' | 'removed' | 'changed';
  details: string;
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

export interface Scorecard {
  contractId: string;
  version: string;
  completeness: number;
  safety: number;
  governance: number;
  webhooksDelivered: number;
  findings: ValidationFinding[];
  conformanceScores?: number[];
  quarantinedEvents?: number;
}

export interface QuarantineRecord {
  contractId: string;
  version: string;
  reason: string;
  at: string;
  releasedAt?: string;
  resolutionNote?: string;
}

export interface CertificatePayload {
  contractId: string;
  dataset: string;
  version: string;
  issuedAt: string;
  expiresAt?: string;
  signedBy: string;
  signature: string;
}

export interface Certification {
  id: string;
  contractId: string;
  issuedAt: string;
  expiresAt?: string;
  signature: string;
}

export interface ScorecardBuildInput {
  contractId: string;
  version: string;
  conformanceScores: number[];
  quarantinedEvents: number;
}
