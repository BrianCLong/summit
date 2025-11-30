export type DataClassification = 'public' | 'dp' | 'pii';

export interface ContractField {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'object' | 'array';
  nullable: boolean;
  unit?: string;
  description?: string;
  classification?: DataClassification;
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

export interface Scorecard {
  contractId: string;
  version: string;
  completeness: number;
  safety: number;
  governance: number;
  webhooksDelivered: number;
  findings: ValidationFinding[];
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
