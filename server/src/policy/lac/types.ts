export type PolicyOperation = 'query' | 'mutation' | 'subscription';

export interface LicensePolicy {
  id: string;
  description?: string;
  grants?: string[];
}

export interface WarrantPolicy {
  id: string;
  description?: string;
  scope?: string;
  expiresAt?: string;
}

export interface RetentionPolicy {
  defaultMaxDays: number;
  overrides?: Record<string, number>;
}

export interface JurisdictionPolicy {
  allowed: string[];
  blocked?: string[];
  overrides?: Record<string, {
    allowed?: string[];
    blocked?: string[];
  }>;
}

export interface RuleRetentionRequirement {
  maxDays?: number;
}

export interface RuleRequirements {
  licenses?: string[];
  warrants?: string[];
  jurisdictions?: string[];
  retention?: RuleRetentionRequirement;
}

export interface PolicyRule {
  id: string;
  operation: PolicyOperation;
  target: string;
  legalBasis: string;
  appealHint: string;
  requires: RuleRequirements;
  description?: string;
}

export interface PolicyMetadata {
  version?: string;
  issuedAt?: string;
  jurisdiction?: string;
}

export interface PolicySet {
  metadata?: PolicyMetadata;
  licenses: LicensePolicy[];
  warrants: WarrantPolicy[];
  retention: RetentionPolicy;
  jurisdiction: JurisdictionPolicy;
  rules: PolicyRule[];
}

export interface PolicyProgram {
  version: 1;
  compiledAt: string;
  sourceHash: string;
  policy: PolicyMetadata;
  licenses: LicensePolicy[];
  warrants: WarrantPolicy[];
  retention: RetentionPolicy;
  jurisdiction: JurisdictionPolicy;
  rules: PolicyRule[];
}

export interface DiffEntry {
  element: 'license' | 'warrant' | 'jurisdiction' | 'retention' | 'rule';
  change: string;
  impact: string;
  details?: string;
}

export interface SimulationContext {
  operationName: string;
  operationType: PolicyOperation;
  licenses: string[];
  warrants: string[];
  jurisdiction?: string;
  retentionDays?: number | null;
}

export interface SimulationResult {
  status: 'allow' | 'block';
  legalBasis?: string;
  ruleId?: string;
  reasons: string[];
  diff: DiffEntry[];
  appealHint?: string;
  annotations: Record<string, string>;
}
